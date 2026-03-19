import express from 'express'
import userRouter from './user.routes.js'
import movieRouter from './movie.routes.js'
import hallRouter from './hall.routes.js'
import hallRoomRoute from './hallroom.routes.js'
import seatRoute from './seat.routes.js'
import showtimeRoute from './showtime.routes.js'
import chatRoutes from './chat.routes.js'
import ticketRoute from './ticket.route.js'
import bookingRouter from './booking.routes.js'
import paymentRouter from './payment.routes.js'
import notifyRouter from './notification.routes.js'

const router = express.Router()

router.use('/user', userRouter)
router.use('/movie', movieRouter)
router.use('/hall', hallRouter)
router.use('/hall-room', hallRoomRoute)
router.use('/seat', seatRoute)
router.use('/showtime', showtimeRoute)
router.use('/chat', chatRoutes)
router.use('/ticket', ticketRoute)
router.use('/bookings', bookingRouter)
router.use('/payment', paymentRouter)
router.use('/notification', notifyRouter)


export default router
