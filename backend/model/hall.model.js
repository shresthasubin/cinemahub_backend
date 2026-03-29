import { sequelize } from "../db/index.js";
import { DataTypes } from "sequelize";

const Hall = sequelize.define(
  "Hall",
  {
    hall_name: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
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
      unique: true,
      set(value) {
        this.setDataValue("hall_contact", value.trim());
      },
    },
    license: {
      type: DataTypes.STRING(12),
      allowNull: false,
      unique: true,
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
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    registeredDate: {
      type: DataTypes.DATEONLY,
    },
    isApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    hallPoster: {
      type: DataTypes.TEXT,
    },
  },
  {
    timestamps: true,
  },
);

export default Hall;
