// routes/booking.routes.js
import express from "express";
import { bookSeat, getHallAdminBookings } from "../controllers/booking.controller.js";
import { roleCheck, verifyJWT } from "../middlewares/auth.middleware.js";

const bookingRouter = express.Router();

bookingRouter.post("/book", verifyJWT, roleCheck(["user"]), bookSeat);
bookingRouter.get("/hall-admin", verifyJWT, roleCheck(["hall-admin", "admin"]), getHallAdminBookings);

export default bookingRouter;
