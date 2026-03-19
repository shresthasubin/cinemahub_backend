import { Notification } from "../model/notification.model.js";
import { Op } from "sequelize";

export const getAllNotification = async (req, res) => {
    try {
        const { userId } = req.params
        const intUserId = parseInt(userId)

        const notifications = await Notification.findAll({
            where: {
                [Op.or]: [
                    { userId: intUserId },
                    { userId: null },
                ],
            }
        })

        return res.status(200).json({
            success: true,
            data: notifications
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error: Failed to fetch Notification"
        })
    }
}

export const markAsRead = async (req, res) => {
    try {
        const notificationId = parseInt(req.params.notifyId)

        await Notification.update(
            {
                isRead: true
            },
            {
                where: {
                    id: notificationId
                }
            })
        
        return res.status(200).json({
            success: true,
            message: "Notification marked as read"
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error: cannot read message"
        })
    }
}