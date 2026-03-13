import Conversation from "../model/conversation.model.js";
import Message from "../model/message.model.js";
import Hall from "../model/hall.model.js";
import User from "../model/user.model.js";
import { getReceiverSocketId } from "../sockets/chat.socket.js";


export const startConversation = async (req, res) => {
  try {
    const { hall_id } = req.body;
    const userId = req.user.id;

    const hall = await Hall.findByPk(hall_id);
    if (!hall) {
      return res.status(404).json({ message: "Hall not found" });
    }

    const hallAdmin = await User.findOne({
      where: { license: hall.license, role: "hall-admin" },
    });

    if (!hallAdmin) {
      return res.status(404).json({ message: "Hall admin not found" });
    }

    let conversation = await Conversation.findOne({
      where: {
        user_id: userId,
        hall_admin_id: hallAdmin.id,
        hall_id,
      },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        user_id: userId,
        hall_admin_id: hallAdmin.id,
        hall_id,
      });
    }

    return res.json(conversation);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    const senderId = req.user.id;

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (
      senderId !== conversation.user_id &&
      senderId !== conversation.hall_admin_id
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 1️⃣ Save message in DB
    const newMessage = await Message.create({
      conversation_id: conversationId,
      sender_id: senderId,
      message,
    });

    // 2️⃣ Update last message info in conversation
    await conversation.update({
      lastMessage: message,
      lastMessageAt: new Date(),
    });

    // 3️⃣ ⚡ Real-time emit
    const receiverId =
      senderId === conversation.user_id
        ? conversation.hall_admin_id
        : conversation.user_id;

    const receiverSocketId = getReceiverSocketId(receiverId);

    if (receiverSocketId) {
      req.app.get("io").to(receiverSocketId).emit("newMessage", newMessage);
    }

    // 4️⃣ Return response
    return res.json(newMessage);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const messages = await Message.findAll({
      where: { conversation_id: conversationId },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.json(messages);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getConversations = async (req, res) => {
  try {
    const where =
      req.user.role === "hall-admin"
        ? { hall_admin_id: req.user.id }
        : { user_id: req.user.id };

    const conversations = await Conversation.findAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fullname", "email"],
        },
        {
          model: User,
          as: "hallAdmin",
          attributes: ["id", "fullname", "email"],
        },
        {
          model: Hall,
          attributes: ["id", "hall_name", "hall_location"],
        },
      ],
      order: [
        ["lastMessageAt", "DESC"],
        ["updatedAt", "DESC"],
      ],
    });

    return res.json(conversations);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
