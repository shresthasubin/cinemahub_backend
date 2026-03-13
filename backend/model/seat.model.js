import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";
import Hallroom from "./hallroom.model.js";

const Seat = sequelize.define(
  "Seat",
  {
    hall_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    seat_number: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    row_label: {
      type: DataTypes.STRING(5),
      allowNull: false,
    },
    row: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    column: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    isSelected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM("sold", "pending", "available"),
      allowNull: false,
      defaultValue: "available",
    },
    type: {
      type: DataTypes.ENUM("seat", "gap"),
      allowNull: false,
    },
    seatType: {
      type: DataTypes.ENUM("regular", "premium"),
      allowNull: true,
    },
  },
  {
    timestamps: true,
  },
);

Hallroom.hasMany(Seat, { foreignKey: "hallroom_id" });
Seat.belongsTo(Hallroom, { foreignKey: "hallroom_id" });

export default Seat;
