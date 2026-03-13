import { Op } from "sequelize";
import { sequelize } from "../db/index.js";
import Booking from "../model/booking.model.js";
import BookingSeat from "../model/bookingSeat.model.js";
import Hall from "../model/hall.model.js";
import Hallclass from "../model/hallclass.model.js";
import Hallroom from "../model/hallroom.model.js";
import Movie from "../model/movie.model.js";
import Seat from "../model/seat.model.js";
import Showtime from "../model/showtime.model.js";
import Ticket from "../model/ticket.model.js";

const DEFAULT_SEAT_PRICES = {
  regular: 300,
  premium: 500,
};

const buildTicketCode = (showtimeId, seatId) => {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TKT-${showtimeId}-${seatId}-${stamp}-${random}`;
};

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getSeatPriceMap = async () => {
  const rows = await Hallclass.findAll({ attributes: ["seatType", "price"] });
  if (!rows.length) return DEFAULT_SEAT_PRICES;

  return rows.reduce(
    (acc, row) => ({ ...acc, [row.seatType]: Number(row.price) || DEFAULT_SEAT_PRICES[row.seatType] || 300 }),
    { ...DEFAULT_SEAT_PRICES },
  );
};

const getSeatAvailabilityForShowtime = async (req, res) => {
  try {
    const showtimeId = parsePositiveInt(req.params.showtimeId);
    if (!showtimeId) {
      return res.status(400).json({ success: false, message: "Invalid showtimeId" });
    }

    const showtime = await Showtime.findByPk(showtimeId, {
      include: [{ model: Hallroom, attributes: ["id", "roomName", "hall_id"] }],
    });

    if (!showtime) {
      return res.status(404).json({ success: false, message: "Showtime not found" });
    }

    const seats = await Seat.findAll({
      where: { hallroom_id: showtime.hallroom_id },
      attributes: ["id", "seat_number", "row", "column", "type", "seatType"],
      order: [["row", "ASC"], ["column", "ASC"]],
    });

    const seatIds = seats.filter((seat) => seat.type === "seat").map((seat) => seat.id);

    const bookedRows = seatIds.length
      ? await BookingSeat.findAll({
          where: { seat_id: { [Op.in]: seatIds } },
          include: [
            {
              model: Booking,
              required: true,
              attributes: ["id", "showtime_id", "booking_status"],
              where: {
                showtime_id: showtimeId,
                booking_status: "confirmed",
              },
            },
          ],
        })
      : [];

    const bookedSeatIdSet = new Set(bookedRows.map((row) => row.seat_id));

    return res.status(200).json({
      success: true,
      data: {
        showtimeId,
        hallroomId: showtime.hallroom_id,
        seats: seats.map((seat) => ({
          id: seat.id,
          seat_number: seat.seat_number,
          row: seat.row,
          column: seat.column,
          type: seat.type,
          seatType: seat.seatType,
          isBooked: seat.type === "seat" ? bookedSeatIdSet.has(seat.id) : false,
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch seat availability", error: err.message });
  }
};

const createTicketBooking = async (req, res) => {
  let transaction;
  try {
    const showtimeId = parsePositiveInt(req.params.showtimeId);
    if (!showtimeId) {
      return res.status(400).json({ success: false, message: "Invalid showtimeId" });
    }

    const seatIds = Array.isArray(req.body?.seatIds)
      ? req.body.seatIds.map((id) => parsePositiveInt(id)).filter(Boolean)
      : [];

    if (!seatIds.length) {
      return res.status(400).json({ success: false, message: "seatIds is required" });
    }

    const uniqueSeatIds = [...new Set(seatIds)];

    const showtime = await Showtime.findByPk(showtimeId, {
      include: [
        { model: Movie, attributes: ["id", "movie_title"] },
        {
          model: Hallroom,
          attributes: ["id", "roomName", "hall_id"],
          include: [{ model: Hall, attributes: ["id", "hall_name", "hall_location"] }],
        },
      ],
    });

    if (!showtime) {
      return res.status(404).json({ success: false, message: "Showtime not found" });
    }

    transaction = await sequelize.transaction();

    const seats = await Seat.findAll({
      where: {
        id: { [Op.in]: uniqueSeatIds },
        hallroom_id: showtime.hallroom_id,
        type: "seat",
      },
      attributes: ["id", "seat_number", "seatType"],
      order: [["row", "ASC"], ["column", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (seats.length !== uniqueSeatIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more seats are invalid for this showtime",
      });
    }

    const existingSeatLinks = await BookingSeat.findAll({
      where: { seat_id: { [Op.in]: uniqueSeatIds } },
      include: [
        {
          model: Booking,
          required: true,
          attributes: ["id", "showtime_id", "booking_status"],
          where: {
            showtime_id: showtimeId,
            booking_status: "confirmed",
          },
        },
      ],
      transaction,
    });

    if (existingSeatLinks.length) {
      return res.status(409).json({
        success: false,
        message: "Some selected seats are already booked",
        data: { bookedSeatIds: existingSeatLinks.map((row) => row.seat_id) },
      });
    }

    const seatPriceMap = await getSeatPriceMap();
    const seatPriceRows = seats.map((seat) => ({
      seat,
      price: seatPriceMap[seat.seatType] ?? DEFAULT_SEAT_PRICES.regular,
    }));

    const totalPrice = seatPriceRows.reduce((sum, item) => sum + Number(item.price || 0), 0);

    const booking = await Booking.create(
      {
        user_id: req.user.id,
        showtime_id: showtimeId,
        total_price: totalPrice,
        booking_status: "pending",
      },
      { transaction },
    );

    await BookingSeat.bulkCreate(
      seats.map((seat) => ({ booking_id: booking.id, seat_id: seat.id })),
      { transaction },
    );

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Booking created successfully. Complete payment to generate tickets.",
      data: {
        booking,
        showtime,
        tickets: [],
      },
    });
  } catch (err) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return res.status(500).json({ success: false, message: "Failed to book tickets", error: err.message });
  }
};

const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: Seat, attributes: ["id", "seat_number", "seatType"] },
        {
          model: Showtime,
          attributes: ["id", "show_date", "start_time", "end_time"],
          include: [
            { model: Movie, attributes: ["id", "movie_title", "moviePoster"] },
            {
              model: Hallroom,
              attributes: ["id", "roomName"],
              include: [{ model: Hall, attributes: ["id", "hall_name", "hall_location"] }],
            },
          ],
        },
        { model: Booking, attributes: ["id", "booking_status", "createdAt"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({ success: true, data: tickets });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch tickets", error: err.message });
  }
};

const getMyBookingTickets = async (req, res) => {
  try {
    const bookingId = parsePositiveInt(req.params.bookingId);
    if (!bookingId) {
      return res.status(400).json({ success: false, message: "Invalid bookingId" });
    }

    const booking = await Booking.findOne({
      where: { id: bookingId, user_id: req.user.id },
      include: [
        {
          model: Showtime,
          attributes: ["id", "show_date", "start_time", "end_time"],
          include: [
            { model: Movie, attributes: ["id", "movie_title", "moviePoster"] },
            {
              model: Hallroom,
              attributes: ["id", "roomName"],
              include: [{ model: Hall, attributes: ["id", "hall_name", "hall_location"] }],
            },
          ],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const tickets = await Ticket.findAll({
      where: { booking_id: booking.id, user_id: req.user.id },
      include: [{ model: Seat, attributes: ["id", "seat_number", "seatType"] }],
      order: [["id", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      data: {
        booking,
        tickets,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch booking tickets", error: err.message });
  }
};

const cancelMyBooking = async (req, res) => {
  let transaction;
  try {
    const bookingId = parsePositiveInt(req.params.bookingId);
    if (!bookingId) {
      return res.status(400).json({ success: false, message: "Invalid bookingId" });
    }

    const booking = await Booking.findOne({
      where: { id: bookingId, user_id: req.user.id },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.booking_status === "cancelled") {
      return res.status(400).json({ success: false, message: "Booking is already cancelled" });
    }

    const bookingSeatRows = await BookingSeat.findAll({
      where: { booking_id: booking.id },
      attributes: ["seat_id"],
    });

    transaction = await sequelize.transaction();

    await booking.update({ booking_status: "cancelled" }, { transaction });
    await Ticket.update(
      { ticket_status: "cancelled" },
      { where: { booking_id: booking.id, user_id: req.user.id }, transaction },
    );

    await transaction.commit();

    const io = req.app.get("io");
    emitShowtimeSeatUpdate(io, {
      showtimeId: booking.showtime_id,
      action: "released",
      seatIds: bookingSeatRows.map((row) => row.seat_id),
      bookingId: booking.id,
      userId: req.user.id,
    });

    return res.status(200).json({ success: true, message: "Booking cancelled successfully" });
  } catch (err) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return res.status(500).json({ success: false, message: "Failed to cancel booking", error: err.message });
  }
};

export { cancelMyBooking, createTicketBooking, getMyBookingTickets, getMyTickets, getSeatAvailabilityForShowtime };
