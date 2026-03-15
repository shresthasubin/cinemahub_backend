import express from 'express'
import { getAllNotification, markAsRead } from '../controllers/notification.controller.js'

const notifyRouter = express.Router()

notifyRouter.get('/get-notification/:userId', getAllNotification)
notifyRouter.put('/get-notification/:notifyId/read', markAsRead)

export default notifyRouter