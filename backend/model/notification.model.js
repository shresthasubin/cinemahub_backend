import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";

export const Notification = sequelize.define(
    'Notification',
    {
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        message: {
            type: DataTypes.STRING,
            allowNull: false
        },

        type: {
            type: DataTypes.STRING,
            allowNull: false
        },

        isRead: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    },
    {
        timestamps: true
    }
)
