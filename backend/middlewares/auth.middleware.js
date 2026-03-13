import User from "../model/user.model.js";
import jwt from 'jsonwebtoken'

const verifyJWT = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication token not found'
            })
        }

        const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET)
        const user = await User.findByPk(decodedToken.id, {
            attributes: {exclude: ['password']}
        })

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid token'
            })
        }

        req.user = user
        next()
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: 'Token expired or invalid'
        })
    }
}

const roleCheck = (roles) => {
    return (req, res, next) => {
        if (roles.includes(req.user.role)) {
            next()
        } else {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            })
        }
    }
}

export {verifyJWT,roleCheck}
