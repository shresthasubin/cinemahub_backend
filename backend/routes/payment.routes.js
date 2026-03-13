import express from "express";
import {
  checkEsewaPaymentStatus,
  createPayment,
  getMyPayments,
  getPaymentByBooking,
  initiateEsewaPayment,
  verifyPayment,
} from "../controllers/payment.controller.js";
import { verifyJWT, roleCheck } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/create",
  [verifyJWT, roleCheck(["user", "admin", "hall-admin"])],
  createPayment,
);
router.post(
  "/verify",
  [verifyJWT, roleCheck(["user", "admin", "hall-admin"])],
  verifyPayment,
);
router.get(
  "/my",
  [verifyJWT, roleCheck(["user", "admin", "hall-admin"])],
  getMyPayments,
);
router.get(
  "/booking/:bookingId",
  [verifyJWT, roleCheck(["user", "admin", "hall-admin"])],
  getPaymentByBooking,
);
router.post(
  "/esewa/initiate",
  [verifyJWT, roleCheck(["user", "admin", "hall-admin"])],
  initiateEsewaPayment,
);
router.post(
  "/esewa/status",
  [verifyJWT, roleCheck(["user", "admin", "hall-admin"])],
  checkEsewaPaymentStatus,
);

export default router;
