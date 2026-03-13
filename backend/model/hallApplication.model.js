import { sequelize } from "../db/index.js";
import { DataTypes } from "sequelize";

const HallApplication = sequelize.define(
  "HallApplication",
  {
    applicant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    hall_name: {
      type: DataTypes.STRING(20),
      allowNull: false,
      set(value) {
        this.setDataValue("hall_name", value.trim());
      },
    },
    hall_location: {
      type: DataTypes.STRING(250),
      allowNull: false,
      set(value) {
        this.setDataValue("hall_location", value.trim());
      },
    },
    hall_contact: {
      type: DataTypes.STRING(10),
      allowNull: false,
      set(value) {
        this.setDataValue("hall_contact", value.trim());
      },
    },
    license: {
      type: DataTypes.STRING(12),
      allowNull: false,
      validate: {
        is: {
          args: /^091-\d{8}$/,
          msg: "License must be in 091-XXXXXXXX format",
        },
      },
      set(value) {
        this.setDataValue("license", value.trim());
      },
    },
    hallPoster: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    hallrooms: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    totalCapacity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
    },
    review_note: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
    reviewed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  },
);

export default HallApplication;
