import { sequelize } from "../db/index.js";
import { DataTypes } from "sequelize";
import Hall from "./hall.model.js";

const Hallroom = sequelize.define(
    "Hallroom",
    {
        roomName: {
            type: DataTypes.STRING
        },
        totalRows: {
            type: DataTypes.INTEGER
        },
        totalColumns: {
            type: DataTypes.INTEGER
        },
        capacity: {
            type: DataTypes.INTEGER
        }
    },
    {
        timestamps: true
    }
)

Hall.hasMany(Hallroom, { foreignKey: "hall_id" })
Hallroom.belongsTo(Hall, { foreignKey: "hall_id" })

export default Hallroom;