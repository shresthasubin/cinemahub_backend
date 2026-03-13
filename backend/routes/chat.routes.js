import express from "express";
import {
    startConversation,
    sendMessage,
    getMessages,
    getConversations,
} from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/start", verifyJWT, startConversation);
router.get("/conversations", verifyJWT, getConversations);
router.post("/:conversationId/message", verifyJWT, sendMessage);
router.get("/:conversationId/messages", verifyJWT, getMessages);

export default router;
