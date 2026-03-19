import { sequelize } from "../db/index.js";
import HallApplication from "../model/hallApplication.model.js";
import Hall from "../model/hall.model.js";
import User from "../model/user.model.js";
import Hallroom from "../model/hallroom.model.js";
import Seat from "../model/seat.model.js";
import Hallclass from "../model/hallclass.model.js";
import { Notification } from "../model/notification.model.js";
import { Op } from "sequelize";

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

let hallApplicationColumnsEnsured = false;
const ensureHallApplicationColumns = async () => {
  if (hallApplicationColumnsEnsured) return;

  const [rows] = await sequelize.query("SHOW COLUMNS FROM HallApplications");
  const colSet = new Set(rows.map((r) => r.Field));
  const queries = [];

  if (!colSet.has("hallrooms")) {
    queries.push("ALTER TABLE HallApplications ADD COLUMN `hallrooms` JSON NULL");
  }
  if (!colSet.has("totalCapacity")) {
    queries.push("ALTER TABLE HallApplications ADD COLUMN `totalCapacity` INT NOT NULL DEFAULT 0");
  }

  for (const sql of queries) {
    await sequelize.query(sql);
  }

  hallApplicationColumnsEnsured = true;
};

let seatColumnsEnsured = false;
const ensureSeatColumns = async () => {
  if (seatColumnsEnsured) return;

  const [rows] = await sequelize.query("SHOW COLUMNS FROM Seats");
  const colSet = new Set(rows.map((r) => r.Field));
  const queries = [];

  if (!colSet.has("row")) queries.push("ALTER TABLE Seats ADD COLUMN `row` INT NOT NULL DEFAULT 1");
  if (!colSet.has("column")) queries.push("ALTER TABLE Seats ADD COLUMN `column` INT NOT NULL DEFAULT 1");
  if (!colSet.has("hallroom_id")) queries.push("ALTER TABLE Seats ADD COLUMN `hallroom_id` INT NULL");
  if (!colSet.has("isSelected")) queries.push("ALTER TABLE Seats ADD COLUMN `isSelected` TINYINT(1) NOT NULL DEFAULT 0");
  if (!colSet.has("status"))
    queries.push("ALTER TABLE Seats ADD COLUMN `status` ENUM('sold','pending','available') NOT NULL DEFAULT 'available'");
  if (!colSet.has("type")) queries.push("ALTER TABLE Seats ADD COLUMN `type` ENUM('seat','gap') NOT NULL DEFAULT 'seat'");
  if (!colSet.has("seatType")) queries.push("ALTER TABLE Seats ADD COLUMN `seatType` ENUM('regular','premium') NULL");
  if (!colSet.has("createdAt"))
    queries.push("ALTER TABLE Seats ADD COLUMN `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
  if (!colSet.has("updatedAt"))
    queries.push("ALTER TABLE Seats ADD COLUMN `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

  for (const sql of queries) {
    await sequelize.query(sql);
  }

  const [seatIndexes] = await sequelize.query("SHOW INDEX FROM Seats");
  const invalidUniqueSeatIndexes = [
    ...new Set(
      seatIndexes
        .filter(
          (idx) =>
            Number(idx.Non_unique) === 0 &&
            idx.Key_name !== "PRIMARY" &&
            (idx.Column_name === "hall_id" || idx.Column_name === "seat_number"),
        )
        .map((idx) => idx.Key_name),
    ),
  ];

  for (const keyName of invalidUniqueSeatIndexes) {
    await sequelize.query(`ALTER TABLE Seats DROP INDEX \`${keyName}\``);
  }

  seatColumnsEnsured = true;
};

let hallroomIndexesEnsured = false;
const ensureHallroomIndexes = async () => {
  if (hallroomIndexesEnsured) return;

  const [indexes] = await sequelize.query("SHOW INDEX FROM Hallrooms");
  const uniqueHallIdIndexes = indexes.filter(
    (idx) =>
      idx.Column_name === "hall_id" &&
      Number(idx.Non_unique) === 0 &&
      idx.Key_name !== "PRIMARY",
  );

  for (const idx of uniqueHallIdIndexes) {
    await sequelize.query(`ALTER TABLE Hallrooms DROP INDEX \`${idx.Key_name}\``);
  }

  hallroomIndexesEnsured = true;
};

const createHallApplication = async (req, res) => {
  try {
    await ensureHallApplicationColumns();
    const applicantId = req.user.id;
    const { hall_name, hall_location, hall_contact, license, totalCapacity } =
      req.body;
    const hallPoster = req.file?.filename || null;
    const hallrooms = parseHallroomsPayload(req.body.hallrooms);

    if (!hall_name || !hall_location || !hall_contact || !license) {
      return res.status(400).json({
        success: false,
        message: "All required hall fields must be provided",
      });
    }

    const user = await User.findByPk(applicantId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "user") {
      return res.status(400).json({
        success: false,
        message: "Only normal users can submit hall staff applications",
      });
    }

    const existingPending = await HallApplication.findOne({
      where: { applicant_id: applicantId, status: "pending" },
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending application",
      });
    }

    const application = await HallApplication.create({
      applicant_id: applicantId,
      hall_name,
      hall_location,
      hall_contact,
      license,
      hallPoster,
      hallrooms,
      totalCapacity: Number(totalCapacity) || 0,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted and waiting for admin verification",
      data: application,
    });
  } catch (err) {
    if (err?.name === "SequelizeValidationError" || err?.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid application data",
        error: err.message,
        details: Array.isArray(err.errors)
          ? err.errors.map((e) => ({
            field: e.path,
            message: e.message,
            value: e.value,
          }))
          : [],
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server failed while submitting application",
      error: err.message,
    });
  }
};

const getMyHallApplication = async (req, res) => {
  try {
    const latestApplication = await HallApplication.findOne({
      where: { applicant_id: req.user.id },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: latestApplication,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed while fetching your application",
      error: err.message,
    });
  }
};

const getPendingHallApplications = async (req, res) => {
  try {
    const applications = await HallApplication.findAll({
      where: { status: "pending" },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed while fetching applications",
      error: err.message,
    });
  }
};

const approveHallApplication = async (req, res) => {
  const tx = await sequelize.transaction();

  try {
    await ensureSeatColumns();
    await ensureHallroomIndexes();
    await ensureHallClasses(tx);
    const { id } = req.params;
    const application = await HallApplication.findByPk(id, { transaction: tx });

    if (!application) {
      await tx.rollback();
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.status !== "pending") {
      await tx.rollback();
      return res.status(400).json({
        success: false,
        message: "Only pending applications can be approved",
      });
    }

    const applicant = await User.findByPk(application.applicant_id, {
      transaction: tx,
    });

    if (!applicant) {
      await tx.rollback();
      return res.status(404).json({
        success: false,
        message: "Applicant user not found",
      });
    }

    const duplicateHall = await Hall.findOne({
      where: {
        [Op.or]: [
          { hall_name: application.hall_name },
          { hall_contact: application.hall_contact },
          { license: application.license },
        ],
      },
      transaction: tx,
    });

    if (duplicateHall) {
      await tx.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Cannot approve: hall name, contact, or license already exists in registered halls",
      });
    }

    const newHall = await Hall.create(
      {
        hall_name: application.hall_name,
        hall_location: application.hall_location,
        hall_contact: application.hall_contact,
        license: application.license,
        registeredDate: new Date(),
        isApproved: true,
        hallPoster: application.hallPoster,
      },
      { transaction: tx },
    );

    const applicationRooms = Array.isArray(application.hallrooms)
      ? application.hallrooms
      : [];

    for (const room of applicationRooms) {
      const totalRows = Number(room.rows ?? room.totalRows);
      const totalColumns = Number(room.seatsPerRow ?? room.totalColumns);
      const roomName = (room.roomName || "").trim();
      const seatTypesMap =
        room && typeof room.seatTypes === "object" && room.seatTypes !== null
          ? room.seatTypes
          : {};

      if (!roomName || totalRows <= 0 || totalColumns <= 0) continue;

      const emptySeats = Array.isArray(room.emptySeats) ? room.emptySeats : [];
      const emptySet = new Set(emptySeats);
      const availableSeats = totalRows * totalColumns - emptySet.size;

      const createdRoom = await Hallroom.create(
        {
          roomName,
          totalRows,
          totalColumns,
          capacity: availableSeats,
          hall_id: newHall.id,
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
              hall_id: newHall.id,
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

    await applicant.update(
      {
        role: "hall-admin",
        license: application.license,
      },
      { transaction: tx },
    );

    await application.update(
      {
        status: "approved",
        reviewed_by: req.user.id,
        reviewed_at: new Date(),
        review_note: "Approved by admin",
      },
      { transaction: tx },
    );

    await tx.commit();

    await Notification.create({
      userId: applicant.id,
      title: "Hall Application Approved",
      message: `Your hall application for ${application.hall_name} has been approved.`,
      type: "hall-application",
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      message: "Application approved and user promoted to hall-admin",
      data: { application, hall: newHall },
    });


  } catch (err) {
    await tx.rollback();
    console.error("approveHallApplication error:", err);
    const details = Array.isArray(err?.errors)
      ? err.errors.map((e) => ({
        field: e.path,
        message: e.message,
        value: e.value,
      }))
      : null;

    return res.status(500).json({
      success: false,
      message: "Server failed while approving application",
      error: err.message,
      details,
    });
  }
};

const rejectHallApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;
    const application = await HallApplication.findByPk(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending applications can be rejected",
      });
    }

    await application.update({
      status: "rejected",
      reviewed_by: req.user.id,
      reviewed_at: new Date(),
      review_note: typeof reviewNote === "string" ? reviewNote.trim() : "",
    });

    await Notification.create({
      userId: application.applicant_id,
      title: "Hall Application Rejected",
      message: `Your hall application for ${application.hall_name} has been rejected.`,
      type: "hall-application",
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      message: "Application rejected",
      data: application,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed while rejecting application",
      error: err.message,
    });
  }
};

export {
  createHallApplication,
  getMyHallApplication,
  getPendingHallApplications,
  approveHallApplication,
  rejectHallApplication,
};
