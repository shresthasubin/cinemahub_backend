import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";
import Booking from "./booking.model.js";
import Seat from "./seat.model.js";

const BookingSeat = sequelize.define(
    "BookingSeat",
    {},
    {
        timestamps: false,
    }
);

Booking.belongsToMany(Seat, {
    through: BookingSeat,
    foreignKey: "booking_id",
});
Seat.belongsToMany(Booking, {
    through: BookingSeat,
    foreignKey: "seat_id",
});
Booking.hasMany(BookingSeat, { foreignKey: "booking_id" });
BookingSeat.belongsTo(Booking, { foreignKey: "booking_id" });
Seat.hasMany(BookingSeat, { foreignKey: "seat_id" });
BookingSeat.belongsTo(Seat, { foreignKey: "seat_id" });

export default BookingSeat;
