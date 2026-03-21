import { ensureNotificationColumns, Notification } from "../model/notification.model.js";
import { Op } from "sequelize";

export const getAllNotification = async (req, res) => {
  try {
    await ensureNotificationColumns();

    const intUserId = Number.parseInt(req.params.userId, 10);
    if (!Number.isInteger(intUserId) || intUserId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    const notifications = await Notification.findAll({
      where: {
        [Op.or]: [{ userId: intUserId }, { userId: null }],
      },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error: Failed to fetch Notification",
      error: err.message,
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    await ensureNotificationColumns();

    const notificationId = Number.parseInt(req.params.notifyId, 10);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification id",
      });
    }

    await Notification.update(
      {
        isRead: true,
      },
      {
        where: {
          id: notificationId,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error: cannot read message",
      error: err.message,
    });
  }
};
