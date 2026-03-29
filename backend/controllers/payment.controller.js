import Payment from "../model/payment.model.js";
import Booking from "../model/booking.model.js";
import Showtime from "../model/showtime.model.js";
import Movie from "../model/movie.model.js";
import Ticket from "../model/ticket.model.js";
import BookingSeat from "../model/bookingSeat.model.js";
import Seat from "../model/seat.model.js";
import Hallclass from "../model/hallclass.model.js";
import { Notification } from "../model/notification.model.js";
import { sequelize } from "../db/index.js";
import axios from "axios";
import crypto from "crypto";
import { Op } from "sequelize";
import { emitShowtimeSeatUpdate } from "../sockets/chat.socket.js";

const VALID_METHODS = new Set(["esewa", "khalti"]);
const VALID_STATUSES = new Set(["pending", "success", "failed"]);
const ESEWA_STATUS_MAP = {
  COMPLETE: "success",
  PENDING: "pending",
  FAILED: "failed",
  REFUNDED: "failed",
};

const DEFAULT_SEAT_PRICES = {
  regular: 300,
  premium: 500,
};

const buildTicketCode = (showtimeId, seatId) => {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TKT-${showtimeId}-${seatId}-${stamp}-${random}`;
};

const getSeatPriceMap = async () => {
  const rows = await Hallclass.findAll({ attributes: ["seatType", "price"] });
  if (!rows.length) return DEFAULT_SEAT_PRICES;

  return rows.reduce(
    (acc, row) => ({
      ...acc,
      [row.seatType]: Number(row.price) || DEFAULT_SEAT_PRICES[row.seatType] || 300,
    }),
    { ...DEFAULT_SEAT_PRICES },
  );
};

const generateTicketsForBooking = async ({ bookingId, userId, transaction }) => {
  const booking = await Booking.findOne({
    where: { id: bookingId, user_id: userId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!booking) {
    const err = new Error("Booking not found for this user");
    err.statusCode = 404;
    throw err;
  }

  const existingTickets = await Ticket.count({
    where: { booking_id: booking.id, user_id: userId },
    transaction,
  });

  if (existingTickets > 0) {
    if (booking.booking_status !== "confirmed") {
      await booking.update({ booking_status: "confirmed" }, { transaction });
      await Notification.create({
        userId,
        title: "Booking Confirmed",
        message: `Your booking #${booking.id} has been confirmed. Enjoy your movie!`,
        type: "booking",
        isRead: false,
      }, { transaction });
    }
    return { booking, created: false };
  }

  const bookingSeatRows = await BookingSeat.findAll({
    where: { booking_id: booking.id },
    attributes: ["seat_id"],
    transaction,
  });

  const seatIds = bookingSeatRows.map((row) => row.seat_id).filter(Boolean);
  if (!seatIds.length) {
    const err = new Error("No seats found for this booking");
    err.statusCode = 400;
    throw err;
  }

  const conflictingSeatLinks = await BookingSeat.findAll({
    where: { seat_id: { [Op.in]: seatIds } },
    include: [
      {
        model: Booking,
        required: true,
        attributes: ["id", "showtime_id", "booking_status"],
        where: {
          showtime_id: booking.showtime_id,
          booking_status: "confirmed",
          id: { [Op.ne]: booking.id },
        },
      },
    ],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (conflictingSeatLinks.length) {
    await booking.update({ booking_status: "cancelled" }, { transaction });
    const err = new Error("One or more selected seats are already confirmed");
    err.statusCode = 409;
    throw err;
  }

  const seats = await Seat.findAll({
    where: { id: seatIds },
    attributes: ["id", "seatType"],
    transaction,
  });

  const seatTypeById = new Map(seats.map((seat) => [seat.id, seat.seatType]));
  const seatPriceMap = await getSeatPriceMap();

  const ticketsPayload = seatIds.map((seatId) => {
    const seatType = seatTypeById.get(seatId) || "regular";
    const price = seatPriceMap[seatType] ?? DEFAULT_SEAT_PRICES.regular;
    return {
      ticket_code: buildTicketCode(booking.showtime_id, seatId),
      booking_id: booking.id,
      user_id: userId,
      showtime_id: booking.showtime_id,
      seat_id: seatId,
      price,
      ticket_status: "booked",
    };
  });

  await Ticket.bulkCreate(ticketsPayload, { transaction });
  await booking.update({ booking_status: "confirmed" }, { transaction });

  await Notification.create(
    {
      userId,
      title: "Tickets Generated",
      message: `Your tickets for booking #${booking.id} are confirmed.`,
      type: "ticket",
      isRead: false,
    },
    { transaction }
  );

  return { booking, created: true };
};

const generateHmacSha256Base64 = (payload, secret) => {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64");
};

const toGatewayAmount = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
};

const requireEsewaConfig = () => {
  const config = {
    merchantId: String(process.env.ESEWA_MERCHANT_ID || "").trim(),
    secret: String(process.env.ESEWA_SECRET || "").trim(),
    paymentUrl: String(process.env.ESEWA_PAYMENT_URL || "").trim(),
    statusCheckUrl: String(process.env.ESEWA_PAYMENT_STATUS_CHECK_URL || "").trim(),
    successUrl: String(process.env.ESEWA_SUCCESS_URL || "").trim(),
    failureUrl: String(process.env.ESEWA_FAILURE_URL || "").trim(),
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    const err = new Error(`Missing eSewa config: ${missing.join(", ")}`);
    err.statusCode = 500;
    throw err;
  }

  return config;
};

const emitConfirmedSeatUpdateForBooking = async (req, booking) => {
  if (!booking?.id || !booking?.showtime_id) return;
  const rows = await BookingSeat.findAll({
    where: { booking_id: booking.id },
    attributes: ["seat_id"],
  });
  const seatIds = rows
    .map((row) => Number(row.seat_id))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!seatIds.length) return;

  emitShowtimeSeatUpdate(req.app.get("io"), {
    showtimeId: booking.showtime_id,
    action: "booked",
    seatIds,
    bookingId: booking.id,
    userId: req.user.id,
  });
};

const createPayment = async (req, res) => {
  try {
    const bookingId = Number(req.body?.booking_id);
    const paymentMethod = String(req.body?.payment_method || "").toLowerCase();
    const transactionId = req.body?.transaction_id ? String(req.body.transaction_id) : null;

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({
        success: false,
        message: "booking_id is required",
      });
    }

    if (!VALID_METHODS.has(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "payment_method must be either 'esewa' or 'khalti'",
      });
    }

    const booking = await Booking.findOne({
      where: { id: bookingId, user_id: req.user.id },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found for this user",
      });
    }

    const existing = await Payment.findOne({ where: { booking_id: bookingId } });
    if (existing && existing.payment_status === "success") {
      return res.status(409).json({
        success: false,
        message: "Payment is already completed for this booking",
      });
    }

    let payment;
    if (existing) {
      payment = await existing.update({
        payment_method: paymentMethod,
        transaction_id: transactionId ?? existing.transaction_id,
        payment_status: "pending",
      });
    } else {
      payment = await Payment.create({
        booking_id: bookingId,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        payment_status: "pending",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Payment initiated",
      data: {
        payment,
        gateway: {
          provider: paymentMethod,
          amount: Number(booking.total_price || 0),
          booking_id: bookingId,
        },
      },
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const bookingId = Number(req.body?.booking_id);
    const transactionId = String(req.body?.transaction_id || "").trim();
    const paymentStatus = String(req.body?.payment_status || "").toLowerCase();

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({
        success: false,
        message: "booking_id is required",
      });
    }

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "transaction_id is required",
      });
    }

    if (!VALID_STATUSES.has(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "payment_status must be pending, success, or failed",
      });
    }

    const booking = await Booking.findOne({
      where: { id: bookingId, user_id: req.user.id },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found for this user",
      });
    }

    const payment = await Payment.findOne({ where: { booking_id: bookingId } });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found for this booking",
      });
    }

    await payment.update({
      transaction_id: transactionId,
      payment_status: paymentStatus,
    });

    if (paymentStatus === "success") {
      await sequelize.transaction(async (transaction) => {
        await generateTicketsForBooking({ bookingId, userId: req.user.id, transaction });
      });
      await emitConfirmedSeatUpdateForBooking(req, booking);
    }

    if (paymentStatus === "failed" && booking.booking_status !== "cancelled") {
      await booking.update({ booking_status: "pending" });
      await Notification.create({
        userId: req.user.id,
        title: "Payment Failed",
        message: `Your payment for booking #${booking.id} has failed. Please try again.`,
        type: "payment",
        isRead: false,
      });
    }

    if (paymentStatus === "success") {
      await Notification.create({
        userId: req.user.id,
        title: "Payment Successful",
        message: `Your payment for booking #${booking.id} has been confirmed. Tickets have been generated.`,
        type: "payment",
        isRead: false,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment status updated",
      data: payment,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      include: [
        {
          model: Booking,
          where: { user_id: req.user.id },
          include: [
            {
              model: Showtime,
              include: [Movie],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json({ success: true, data: payments });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getPaymentByBooking = async (req, res) => {
  try {
    const bookingId = Number(req.params?.bookingId);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    const payment = await Payment.findOne({
      where: { booking_id: bookingId },
      include: [
        {
          model: Booking,
          where: { user_id: req.user.id },
          include: [{ model: Showtime, include: [Movie] }],
        },
      ],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.status(200).json({ success: true, data: payment });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const initiateEsewaPayment = async (req, res) => {
  try {
    const bookingId = Number(req.body?.booking_id);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({
        success: false,
        message: "booking_id is required",
      });
    }

    const booking = await Booking.findOne({
      where: { id: bookingId, user_id: req.user.id },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found for this user",
      });
    }

    const config = requireEsewaConfig();
    const amount = toGatewayAmount(booking.total_price);
    const transactionUuid = req.body?.product_id
      ? String(req.body.product_id)
      : `BOOKING-${bookingId}-${Date.now()}`;

    const signedData = `total_amount=${amount},transaction_uuid=${transactionUuid},product_code=${config.merchantId}`;
    const signature = generateHmacSha256Base64(signedData, config.secret);

    const gatewayPayload = {
      amount,
      failure_url: config.failureUrl,
      product_delivery_charge: "0",
      product_service_charge: "0",
      product_code: config.merchantId,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      success_url: config.successUrl,
      tax_amount: "0",
      total_amount: amount,
      transaction_uuid: transactionUuid,
      signature,
    };

    const existing = await Payment.findOne({ where: { booking_id: bookingId } });
    let payment;

    if (existing) {
      payment = await existing.update({
        payment_method: "esewa",
        transaction_id: transactionUuid,
        payment_status: "pending",
      });
    } else {
      payment = await Payment.create({
        booking_id: bookingId,
        payment_method: "esewa",
        transaction_id: transactionUuid,
        payment_status: "pending",
      });
    }

    return res.status(200).json({
      success: true,
      message: "eSewa payment initiated",
      data: {
        payment,
        paymentUrl: config.paymentUrl,
        method: "POST",
        submissionMode: "form_post",
        payload: gatewayPayload,
      },
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: "Failed to initiate eSewa payment",
      error: err.message,
    });
  }
};

const checkEsewaPaymentStatus = async (req, res) => {
  try {
    const transactionUuid = String(
      req.body?.transaction_uuid || req.body?.product_id || "",
    ).trim();
    const transactionCode = String(req.body?.transaction_code || "").trim();

    if (!transactionUuid) {
      return res.status(400).json({
        success: false,
        message: "transaction_uuid (or product_id) is required",
      });
    }

    const payment = await Payment.findOne({
      where: { transaction_id: transactionUuid, payment_method: "esewa" },
      include: [
        {
          model: Booking,
          required: true,
          where: { user_id: req.user.id },
        },
      ],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const config = requireEsewaConfig();
    const amount = toGatewayAmount(payment.Booking?.total_price);

    const response = await axios.get(config.statusCheckUrl, {
      params: {
        product_code: config.merchantId,
        total_amount: amount,
        transaction_uuid: transactionUuid,
        ...(transactionCode ? { transaction_code: transactionCode } : {}),
      },
    });

    const rawStatus = String(response?.data?.status || "PENDING").toUpperCase();
    const mappedStatus = ESEWA_STATUS_MAP[rawStatus] || "pending";

    await payment.update({
      payment_status: mappedStatus,
    });

    if (mappedStatus === "success") {
      await sequelize.transaction(async (transaction) => {
        await generateTicketsForBooking({
          bookingId: payment.booking_id,
          userId: req.user.id,
          transaction,
        });
      });
      await emitConfirmedSeatUpdateForBooking(req, payment.Booking);
    }

    return res.status(200).json({
      success: true,
      message: "Transaction status updated successfully",
      data: {
        transaction_uuid: transactionUuid,
        transaction_code: transactionCode || null,
        gateway_status: rawStatus,
        payment_status: mappedStatus,
      },
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: "Server error while checking eSewa payment status",
      error: err.message,
    });
  }
};

export {
  createPayment,
  verifyPayment,
  getMyPayments,
  getPaymentByBooking,
  initiateEsewaPayment,
  checkEsewaPaymentStatus,
};
