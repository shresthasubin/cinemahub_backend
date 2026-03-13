import Hallroom from "../model/hallroom.model.js";
import Seat from "../model/seat.model.js";
import Hallclass from "../model/hallclass.model.js";

const numberToAlphabet = (n) => {
  let result = "";
  let num = n;
  while (num > 0) {
    num--;
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
};

const ensureHallClasses = async () => {
  const defaults = [
    { seatType: "regular", price: 300 },
    { seatType: "premium", price: 500 },
  ];

  for (const item of defaults) {
    const existing = await Hallclass.findByPk(item.seatType);
    if (!existing) {
      await Hallclass.create(item);
    }
  }
};

const createSeat = async (req, res) => {
  try {
    await ensureHallClasses();

    const { hallRoomId } = req.params
    const intRoomId = parseInt(hallRoomId)
    const hallRoom = await Hallroom.findByPk(intRoomId)
    
    if (!hallRoom) {
      return res.status(404).json({
        success: false,
        message: "Hall room does not exist"
      })
    }

    const { row, column, seatType, type } = req.body
    if (!row || !column || !type) {
      return res.status(400).json({
        success: false,
        message: "row, column, and Type are required"
      });
    }

    const rowInt = parseInt(row)
    const columnInt = parseInt(column)

    if (!Number.isInteger(rowInt) || !Number.isInteger(columnInt) || rowInt <= 0 || columnInt <= 0) {
      return res.status(400).json({
        success: false,
        message: "row and column must be positive integers"
      });
    }

    const existingSeat = await Seat.findOne({
      where: {
        row: rowInt,
        column: columnInt,
        hallroom_id: intRoomId
      }
    })

    if (existingSeat) {
      return res.status(400).json({
        success: false,
        message: "Seat had already exist"
      })
    }

    if (type === "seat") {
      if (!seatType) {
        return res.status(400).json({
          success: false,
          message: "Seat type must be defined for seat"
        })
      }
    }

    const seatNum = await Seat.count({
      where: {
        row: rowInt,
        hallroom_id: intRoomId,
        type: "seat"
      }
    });

    const rowLabel = numberToAlphabet(rowInt);
    const seatNumber = type === "gap" ? `G${rowInt}-${columnInt}` : `${rowLabel}${seatNum + 1}`;

    const seat = await Seat.create({
        hall_id: hallRoom.hall_id,
        seat_number: seatNumber,
        row_label: rowLabel,
        row: rowInt,
        column: columnInt,
        hallroom_id: hallRoomId,
        seatType: type === "gap"? null: seatType,
        type
      })
    

    return res.status(201).json({
      success: true,
      message: "Seat created successfully",
      data: seat
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error: Failed to create seat",
      error: err.message
    });
  }
};

const getSeatsByHall = async (req, res) => {
  try {
    const { hallRoomId } = req.params
    const intRoomId = parseInt(hallRoomId)
    const seats = await Seat.findAll({
      where: { hallroom_id: intRoomId },
    });

    if (!seats || seats.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No seats available"
      })
    }

    return res.status(200).json({
      success: true,
      data: seats
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

export { createSeat, getSeatsByHall };
