import Hall from "../model/hall.model.js";
import Hallroom from "../model/hallroom.model.js";
import Seat from "../model/seat.model.js";
import Hallclass from "../model/hallclass.model.js";
import { sequelize } from "../db/index.js";
import { Op } from "sequelize";
import { uploadFileToCloudinary } from "../utils/cloudinary.js";

const rowToLabel = (rowNumber) => {
  let result = "";
  let n = rowNumber;
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
};

const parseHallroomsPayload = (hallroomsRaw) => {
  if (!hallroomsRaw) return [];
  if (Array.isArray(hallroomsRaw)) return hallroomsRaw;

  try {
    const parsed = JSON.parse(hallroomsRaw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const ensureHallClasses = async (transaction) => {
  const defaults = [
    { seatType: "regular", price: 300 },
    { seatType: "premium", price: 500 },
  ];

  for (const item of defaults) {
    const existing = await Hallclass.findByPk(item.seatType, { transaction });
    if (!existing) {
      await Hallclass.create(item, { transaction });
    }
  }
};

let seatColumnsEnsured = false;
const ensureSeatColumns = async () => {
  if (seatColumnsEnsured) return;

  const [rows] = await sequelize.query("SHOW COLUMNS FROM Seats");
  const colSet = new Set(rows.map((r) => r.Field));
  const queries = [];

  if (!colSet.has("row")) {
    queries.push("ALTER TABLE Seats ADD COLUMN `row` INT NOT NULL DEFAULT 1");
  }
  if (!colSet.has("column")) {
    queries.push("ALTER TABLE Seats ADD COLUMN `column` INT NOT NULL DEFAULT 1");
  }
  if (!colSet.has("hallroom_id")) {
    queries.push("ALTER TABLE Seats ADD COLUMN `hallroom_id` INT NULL");
  }
  if (!colSet.has("isSelected")) {
    queries.push("ALTER TABLE Seats ADD COLUMN `isSelected` TINYINT(1) NOT NULL DEFAULT 0");
  }
  if (!colSet.has("status")) {
    queries.push(
      "ALTER TABLE Seats ADD COLUMN `status` ENUM('sold','pending','available') NOT NULL DEFAULT 'available'",
    );
  }
  if (!colSet.has("type")) {
    queries.push("ALTER TABLE Seats ADD COLUMN `type` ENUM('seat','gap') NOT NULL DEFAULT 'seat'");
  }
  if (!colSet.has("seatType")) {
    queries.push("ALTER TABLE Seats ADD COLUMN `seatType` ENUM('regular','premium') NULL");
  }
  if (!colSet.has("createdAt")) {
    queries.push(
      "ALTER TABLE Seats ADD COLUMN `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
    );
  }
  if (!colSet.has("updatedAt")) {
    queries.push(
      "ALTER TABLE Seats ADD COLUMN `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    );
  }

  for (const sql of queries) {
    await sequelize.query(sql);
  }

  seatColumnsEnsured = true;
};

const hallRegister = async (req, res) => {
  let tx;
  try {
    const { hall_name, hall_location, hall_contact, license } =
      req.body;
    const registeredDate = new Date();
    const hallrooms = parseHallroomsPayload(req.body.hallrooms);

    const hallPosterUpload = req.file
      ? await uploadFileToCloudinary(req.file, { folder: "cinemahub/halls" })
      : null;
    const hallPoster = hallPosterUpload?.secure_url ?? null;

    if (
      !hall_name ||
      !hall_location ||
      !hall_contact ||
      !license
    ) {
      return res.status(400).json({
        success: false,
        message: "Mandatory to fill all the required hall details",
      });
    }

    if (req.user?.role === "hall-admin") {
      return res.status(403).json({
        success: false,
        message: "Hall admins cannot register new halls",
      });
    }

    const existingHall = await Hall.findOne({
      where: {
        [Op.or]: [{ hall_name }, { hall_contact }, { license }],
      },
    });

    if (existingHall) {
      let duplicateField = "hall";
      if (existingHall.hall_name === hall_name) duplicateField = "hall_name";
      else if (existingHall.hall_contact === hall_contact) duplicateField = "hall_contact";
      else if (existingHall.license === license) duplicateField = "license";

      return res.status(400).json({
        success: false,
        message: `Duplicate value for ${duplicateField}`,
      });
    }

    await ensureSeatColumns();

    tx = await sequelize.transaction();
    await ensureHallClasses(tx);

    const hall = await Hall.create(
      {
        hall_name,
        hall_location,
        hall_contact,
        license,
        registeredDate: registeredDate,
        hallPoster: hallPoster,
      },
      { transaction: tx },
    );

    for (const room of hallrooms) {
      const totalRows = Number(room.rows ?? room.totalRows);
      const totalColumns = Number(room.seatsPerRow ?? room.totalColumns);
      const roomName = (room.roomName || "").trim();
      const seatTypesMap =
        room && typeof room.seatTypes === "object" && room.seatTypes !== null
          ? room.seatTypes
          : {};

      if (!roomName || totalRows <= 0 || totalColumns <= 0) {
        await tx.rollback();
        return res.status(400).json({
          success: false,
          message: "Invalid room configuration in hallrooms payload",
        });
      }

      const emptySeats = Array.isArray(room.emptySeats) ? room.emptySeats : [];
      const emptySet = new Set(emptySeats);
      const availableSeats = totalRows * totalColumns - emptySet.size;

      const createdRoom = await Hallroom.create(
        {
          roomName,
          totalRows,
          totalColumns,
          capacity: availableSeats,
          hall_id: hall.id,
        },
        { transaction: tx },
      );

      for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
        let seatCountInRow = 0;
        for (let colIndex = 0; colIndex < totalColumns; colIndex++) {
          const key = `${rowIndex}-${colIndex}`;
          const isGap = emptySet.has(key);
          const selectedSeatType = seatTypesMap[key] === "premium" ? "premium" : "regular";
          const rowNumber = rowIndex + 1;
          const colNumber = colIndex + 1;
          const rowLabel = rowToLabel(rowNumber);

          if (!isGap) seatCountInRow++;
          const seatNumber = isGap ? `G${rowNumber}-${colNumber}` : `${rowLabel}${seatCountInRow}`;

          await Seat.create(
            {
              hall_id: hall.id,
              seat_number: seatNumber,
              row_label: rowLabel,
              row: rowNumber,
              column: colNumber,
              hallroom_id: createdRoom.id,
              seatType: isGap ? null : selectedSeatType,
              type: isGap ? "gap" : "seat",
            },
            { transaction: tx },
          );
        }
      }
    }

    await tx.commit();

    return res.status(201).json({
      success: true,
      message: "Hall and room layout registered successfully",
      data: hall,
    });
  } catch (err) {
    if (tx && !tx.finished) {
      await tx.rollback();
    }
    console.error("hallRegister error:", err);
    const validationDetails = Array.isArray(err?.errors)
      ? err.errors.map((e) => ({
        field: e.path,
        message: e.message,
        value: e.value,
      }))
      : null;

    return res.status(500).json({
      success: false,
      message: "Server failed while registering hall",
      error: err.message,
      details: validationDetails,
    });
  }
};

const hallUpdate = async (req, res) => {
  try {
    const { id } = req.params;

    const hall = await Hall.findByPk(id);

    if (!hall) {
      return res.status(404).json({
        success: false,
        message: "Hall with ID doesn't exist",
      });
    }

    if (req.user?.role === "hall-admin") {
      if (!req.user.license) {
        return res.status(403).json({
          success: false,
          message: "Hall admin does not have an assigned license",
        });
      }

      if (hall.license !== req.user.license) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this hall",
        });
      }
    }

    const {
      hall_name,
      hall_location,
      hall_contact,
      isActive,
      license,
      registeredDate,
    } = req.body;

    const hallPosterUpload = req.file
      ? await uploadFileToCloudinary(req.file, { folder: "cinemahub/halls" })
      : null;
    const hallPoster = hallPosterUpload?.secure_url ?? null;
    const updatePayload = {
      hall_name: hall_name ?? hall.hall_name,
      hall_location: hall_location ?? hall.hall_location,
      hall_contact: hall_contact ?? hall.hall_contact,
      license: license ?? hall.license,
      registeredDate: registeredDate ?? hall.registeredDate,
      hallPoster: hallPoster ?? hall.hallPoster,
    };

    if (isActive !== undefined) {
      updatePayload.isActive = isActive === "true" || isActive === true;
    }

    const updateHall = await hall.update(updatePayload);

    return res.status(201).json({
      success: true,
      message: "Hall has been updated successfully",
      data: updateHall,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed while updating hall",
      error: err.message,
    });
  }
};

const hallGet = async (req, res) => {
  try {
    const where = {};

    if (req.user?.role === "hall-admin") {
      if (!req.user.license) {
        return res.status(403).json({
          success: false,
          message: "Hall admin does not have an assigned license",
        });
      }
      where.license = req.user.license;
    }

    const halls = await Hall.findAll({ where });

    res.status(200).json({
      success: true,
      message: "Hall fetched successfully",
      data: halls,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed while fetching data",
      error: err.message,
    });
  }
};

const hallGetActive = async (req, res) => {
  try {
    const halls = await Hall.findAll({
      where: {
        isActive: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Hall fetched successfully",
      data: halls,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed while fetching data",
      error: err.message,
    });
  }
};

const hallDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const hall = await Hall.findByPk(id);

    if (!hall) {
      return res.status(404).json({
        success: false,
        message: "Hall with id doesn't found",
      });
    }

    hall.isActive = false;
    await hall.save();

    return res.status(200).json({
      success: true,
      message: "Hall has been deactivated",
      data: hall,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed while deleting",
      error: err.message,
    });
  }
};

const hallActivate = async (req, res) => {
  try {
    const { id } = req.params;
    const hall = await Hall.findByPk(id);

    if (!hall) {
      return res.status(404).json({
        success: false,
        message: "Hall with id doesn't found",
      });
    }

    if (req.user?.role === "hall-admin") {
      if (!req.user.license) {
        return res.status(403).json({
          success: false,
          message: "Hall admin does not have an assigned license",
        });
      }

      if (hall.license !== req.user.license) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to activate this hall",
        });
      }
    }

    hall.isActive = true;
    await hall.save();

    return res.status(200).json({
      success: true,
      message: "Hall has been activated",
      data: hall,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed while activating hall",
      error: err.message,
    });
  }
};

export { hallRegister, hallUpdate, hallGet, hallDelete, hallGetActive, hallActivate };
