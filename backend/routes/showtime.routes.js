import express from "express";
import { verifyJWT, roleCheck } from "../middlewares/auth.middleware.js";
import {
  createShowtime,
  deleteShowtime,
  getShowtimeById,
  getShowtimes,
  getShowtimesByHallroom,
  getShowtimesByMovie,
  updateShowTime,
} from "../controllers/showtime.controller.js";

const showtimeRoute = express.Router();

showtimeRoute.post("/create-showtime/:movieId/:hallroomId", verifyJWT, roleCheck(["admin", "hall-admin"]), createShowtime);

showtimeRoute.put("/update-showtime/:showtimeId", verifyJWT, roleCheck(["admin", "hall-admin"]), updateShowTime);

showtimeRoute.get("/get", verifyJWT, roleCheck(["admin", "hall-admin"]), getShowtimes);
showtimeRoute.get("/get/:showtimeId", verifyJWT, roleCheck(["admin", "hall-admin"]), getShowtimeById);

showtimeRoute.get("/movie/:movieId", getShowtimesByMovie);

showtimeRoute.get("/hallroom/:hallroomId", verifyJWT, roleCheck(["admin", "hall-admin"]), getShowtimesByHallroom);

showtimeRoute.delete("/delete/:showtimeId", verifyJWT, roleCheck(["admin", "hall-admin"]), deleteShowtime);

export default showtimeRoute;
