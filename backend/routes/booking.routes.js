// routes/booking.routes.js
import express from "express";
import { bookSeat } from "../controllers/booking.controller.js";
import { roleCheck, verifyJWT } from "../middlewares/auth.middleware.js";

const bookingRouter = express.Router();

bookingRouter.post("/book", verifyJWT, roleCheck(["user"]), bookSeat);

export default bookingRouter;