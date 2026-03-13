import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";
import User from "./user.model.js";
import Showtime from "./showtime.model.js";
import Seat from "./seat.model.js";

const Booking = sequelize.define(
  "Booking",
  {
    total_price: DataTypes.DECIMAL(8, 2),
    booking_status: {
      type: DataTypes.ENUM("pending", "confirmed", "cancelled"),
      defaultValue: "pending",
    }
  },
  {
    timestamps: true,
  }
);

User.hasMany(Booking, { foreignKey: "user_id" });
Booking.belongsTo(User, { foreignKey: "user_id" });

Showtime.hasMany(Booking, { foreignKey: "showtime_id" });
Booking.belongsTo(Showtime, { foreignKey: "showtime_id" });

Seat.hasMany(Booking, { foreignKey: "seat_id" });
Booking.belongsTo(Seat, { foreignKey: "seat_id" });

export default Booking;
