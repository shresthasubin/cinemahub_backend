import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";

const Message = sequelize.define(
  "Message",
  {
    conversation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    indexes: [
      { fields: ["conversation_id"] },
      { fields: ["createdAt"] },
    ],
  }
);

export default Message;