import Hall from "../model/hall.model.js";
import Hallroom from "../model/hallroom.model.js";
import Seat from "../model/seat.model.js";

const createRoom = async (req, res) => {
    try {
        let { hallId } = req.params
        hallId = parseInt(hallId)
        const hall = await Hall.findByPk(hallId)

        if (!hall) {
            return res.status(404).json({
                success: false,
                message: "No hall exist"
            })
        }

        if (req.user?.role === "hall-admin") {
            if (!req.user.license) {
                return res.status(403).json({
                    success: false,
                    message: "Hall admin does not have an assigned license",
                })
            }

            if (hall.license !== req.user.license) {
                return res.status(403).json({
                    success: false,
                    message: "Not authorized to create rooms for this hall",
                })
            }
        }

        const { roomName, rows, columns } = req.body

        if (!roomName || !rows || !columns) {
            return res.status(400).json({
                success: false,
                message: "All the details must be filled"
            })
        }

        
        const rowsInt = parseInt(rows)
        const columnsInt = parseInt(columns)
        
        if (!Number.isInteger(rowsInt) || !Number.isInteger(columnsInt)) {
            return res.status(400).json({
                success: false,
                message: "Rows and columns should be integer only"
            })
        }

        if (rowsInt <= 0 || columnsInt <= 0) {
            return res.status(400).json({
                success: false,
                message: "Rows and columns must be greater than 0"
            })
        }

        const existingRoom = await Hallroom.findOne({ where: { roomName, hall_id: hallId } });

        if (existingRoom) {
            return res.status(400).json({
                success: false,
                message: "Room already exist"
            })
        }

        const room = await Hallroom.create({
            roomName,
            totalRows: rowsInt,
            totalColumns: columnsInt,
            capacity: rowsInt * columnsInt,
            hall_id: hallId
        })

        res.status(201).json({
            success: true,
            message: "Hall room has been created successfully",
            data: room
        })

        
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server Error: Cannot create hall room",
            error: err.message
        })
    }
}

const deleteRoom = async (req, res) => {
    try {
        const { roomId } = req.params
        const room = await Hallroom.findByPk(roomId, {
            include: [{
                model: Hall,
                attributes: ["id", "license"],
            }],
        })
    
        if (!room) {
            return res.status(404).json({
                success: false,
                message: "No Rows Found"
            })
        }

        if (req.user?.role === "hall-admin") {
            if (!req.user.license) {
                return res.status(403).json({
                    success: false,
                    message: "Hall admin does not have an assigned license",
                })
            }

            if (room.Hall?.license !== req.user.license) {
                return res.status(403).json({
                    success: false,
                    message: "Not authorized to delete this room",
                })
            }
        }
    
        await Seat.destroy({ where: { hallroom_id: roomId } })
        await room.destroy()
    
        return res.status(200).json({
            success: true,
            message: "Room has been deleted"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error: Room cannot be deleted"
        })
    }
}

const getRooms = async (req, res) => {
    try {
        const hallId = req.query.hallId ? Number(req.query.hallId) : null;
        const where = {};
        const hallWhere = {};

        if (hallId) {
            if (!Number.isInteger(hallId) || hallId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid hallId"
                });
            }
            where.hall_id = hallId;
        }

        if (req.user?.role === "hall-admin") {
            if (!req.user.license) {
                return res.status(403).json({
                    success: false,
                    message: "Hall admin does not have an assigned license",
                });
            }
            hallWhere.license = req.user.license;
        }

        const rooms = await Hallroom.findAll({
            where,
            include: [{
                model: Hall,
                attributes: ["id", "hall_name", "hall_location", "license"],
                ...(Object.keys(hallWhere).length ? { where: hallWhere } : {}),
            }],
            order: [["createdAt", "DESC"]]
        });

        return res.status(200).json({
            success: true,
            message: "Hall rooms fetched successfully",
            data: rooms
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server Error: Cannot fetch hall rooms",
            error: err.message
        });
    }
}

export { createRoom, deleteRoom, getRooms }
