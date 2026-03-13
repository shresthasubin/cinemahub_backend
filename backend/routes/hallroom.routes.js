import express from 'express'
import { createRoom, deleteRoom, getRooms } from '../controllers/hallroom.controller.js'
import { verifyJWT, roleCheck } from "../middlewares/auth.middleware.js";

const hallRoomRoute = express.Router()

hallRoomRoute.post("/create-room/:hallId", [verifyJWT, roleCheck(["admin", "hall-admin"])], createRoom)
hallRoomRoute.get("/get", [verifyJWT, roleCheck(["admin", "hall-admin"])], getRooms)
hallRoomRoute.delete("/delete-room/:roomId", [verifyJWT, roleCheck(["admin", "hall-admin"])], deleteRoom)

export default hallRoomRoute
