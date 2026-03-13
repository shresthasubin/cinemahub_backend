import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";
import User from "./user.model.js";
import Hall from "./hall.model.js";
import Message from "./message.model.js"; 

const Conversation = sequelize.define(
    "Conversation",
    {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        hall_admin_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        hall_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        lastMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        lastMessageAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        indexes: [
            {
                unique: true,
                fields: ["user_id", "hall_admin_id", "hall_id"],
            },
            {
                fields: ["lastMessageAt"],
            },
        ],
    }
);

Conversation.belongsTo(User, { foreignKey: "user_id", as: "user" });
Conversation.belongsTo(User, { foreignKey: "hall_admin_id", as: "hallAdmin" });
Conversation.belongsTo(Hall, { foreignKey: "hall_id" });
Conversation.hasMany(Message, { foreignKey: "conversation_id" });

export default Conversation;