import express from "express";
import { createSeat, getSeatsByHall } from "../controllers/seat.controller.js";

const seatRoute = express.Router();

seatRoute.post("/create-seat/:hallRoomId", createSeat);
seatRoute.get("/get-seat/:hallRoomId", getSeatsByHall);

export default seatRoute;
