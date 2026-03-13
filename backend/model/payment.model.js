import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";
import Booking from "./booking.model.js";

const Payment = sequelize.define(
  "Payment",
  {
    payment_method: DataTypes.ENUM("esewa", "khalti"),
    transaction_id: DataTypes.STRING,
    payment_status: {
      type: DataTypes.ENUM("pending", "success", "failed"),
      defaultValue: "pending",
    },
  },
  {
    timestamps: true,
  }
);

Booking.hasOne(Payment, { foreignKey: "booking_id" });
Payment.belongsTo(Booking, { foreignKey: "booking_id" });

export default Payment;
