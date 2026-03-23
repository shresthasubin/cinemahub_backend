import { Op } from "sequelize";
import { sequelize } from "../db/index.js";
import Booking from "../model/booking.model.js";
import BookingSeat from "../model/bookingSeat.model.js";
import { Notification } from "../model/notification.model.js";
import Seat from "../model/seat.model.js";
import Showtime from "../model/showtime.model.js";
import User from "../model/user.model.js";
import Payment from "../model/payment.model.js";
import Hallroom from "../model/hallroom.model.js";
import Hall from "../model/hall.model.js";

const parsePositiveInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const bookSeat = async (req, res) => {
  let transaction;
  try {
    const seatId = parsePositiveInt(req.body?.seatId);
    const showtimeId = parsePositiveInt(req.body?.showtimeId);
    const totalPrice = Number(req.body?.total_price || 0);
    const userId = req.user?.id;

    if (!seatId || !showtimeId) {
      return res.status(400).json({ success: false, message: "seatId and showtimeId are required" });
    }
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const [seat, showtime] = await Promise.all([
      Seat.findByPk(seatId, { attributes: ["id", "hallroom_id", "type"] }),
      Showtime.findByPk(showtimeId, { attributes: ["id", "hallroom_id"] }),
    ]);

    if (!seat || seat.type !== "seat") {
      return res.status(404).json({ success: false, message: "Seat not found" });
    }
    if (!showtime) {
      return res.status(404).json({ success: false, message: "Showtime not found" });
    }
    if (Number(seat.hallroom_id) !== Number(showtime.hallroom_id)) {
      return res.status(400).json({ success: false, message: "Seat does not belong to this showtime" });
    }

    const existingSeatLink = await BookingSeat.findOne({
      where: { seat_id: seatId },
      include: [
        {
          model: Booking,
          required: true,
          attributes: ["id", "showtime_id", "booking_status"],
          where: {
            showtime_id: showtimeId,
            booking_status: { [Op.ne]: "cancelled" },
          },
        },
      ],
    });

    if (existingSeatLink) {
      return res.status(409).json({ success: false, message: "Seat already booked" });
    }

    transaction = await sequelize.transaction();

    const booking = await Booking.create(
      {
        user_id: userId,
        showtime_id: showtimeId,
        total_price: totalPrice > 0 ? totalPrice : 300,
        booking_status: "pending",
      },
      { transaction },
    );

    await Notification.create(
      {
        userId,
        title: "Booking Created",
        message: `Your booking #${booking.id} has been created. Complete payment to confirm your seat.`,
        type: "booking",
        isRead: false,
      },
      { transaction }
    );

    await BookingSeat.create(
      {
        booking_id: booking.id,
        seat_id: seatId,
      },
      { transaction },
    );

    await transaction.commit();

    return res.status(201).json({ success: true, booking });
  } catch (err) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return res.status(500).json({ success: false, message: "Booking failed", error: err.message });
  }
};

export const getHallAdminBookings = async (req, res) => {
  try {
    if (!req.user?.license) {
      return res.status(403).json({
        success: false,
        message: "Hall admin does not have an assigned license",
      });
    }

    const bookings = await Booking.findAll({
      include: [
        {
          model: User,
          attributes: ["id", "fullname", "email"],
        },
        {
          model: Showtime,
          required: true,
          attributes: ["id", "show_date", "start_time", "end_time", "movie_id", "hallroom_id"],
          include: [
            {
              model: Hallroom,
              required: true,
              attributes: ["id", "roomName", "hall_id"],
              include: [
                {
                  model: Hall,
                  required: true,
                  attributes: ["id", "hall_name", "license"],
                  where: { license: req.user.license },
                },
              ],
            },
          ],
        },
        {
          model: BookingSeat,
          attributes: ["booking_id", "seat_id"],
          include: [
            {
              model: Seat,
              attributes: ["id", "seat_number", "row_label", "row", "column", "seatType", "type"],
            },
          ],
        },
        {
          model: Payment,
          attributes: ["id", "payment_method", "transaction_id", "payment_status", "createdAt"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Hall bookings fetched successfully",
      data: bookings,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed while fetching hall bookings",
      error: err.message,
    });
  }
};
