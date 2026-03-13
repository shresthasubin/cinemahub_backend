import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";
import Booking from "./booking.model.js";
import User from "./user.model.js";
import Showtime from "./showtime.model.js";
import Seat from "./seat.model.js";

const Ticket = sequelize.define(
  "Ticket",
  {
    ticket_code: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
    },
    price: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0,
    },
    ticket_status: {
      type: DataTypes.ENUM("booked", "cancelled", "used"),
      allowNull: false,
      defaultValue: "booked",
    },
  },
  {
    timestamps: true,
  },
);

Booking.hasMany(Ticket, { foreignKey: "booking_id" });
Ticket.belongsTo(Booking, { foreignKey: "booking_id" });

User.hasMany(Ticket, { foreignKey: "user_id" });
Ticket.belongsTo(User, { foreignKey: "user_id" });

Showtime.hasMany(Ticket, { foreignKey: "showtime_id" });
Ticket.belongsTo(Showtime, { foreignKey: "showtime_id" });

Seat.hasMany(Ticket, { foreignKey: "seat_id" });
Ticket.belongsTo(Seat, { foreignKey: "seat_id" });

export default Ticket;
