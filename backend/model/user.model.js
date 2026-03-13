import { sequelize } from "../db/index.js";
import { DataTypes } from "sequelize";

const User = sequelize.define(
  "User",
  {
    fullname: {
      type: DataTypes.STRING(50),
      allowNull: false,
      set(value) {
        this.setDataValue("fullname", value.trim());
      },
    },
    email: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        is: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      set(value) {
        this.setDataValue("email", value.trim());
      },
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: false,
      set(value) {
        this.setDataValue("password", value.trim());
      },
    },
    agreeTerm: {
      type: DataTypes.BOOLEAN,
    },
    role: {
      type: DataTypes.ENUM("user", "hall-admin", "admin"),
      defaultValue: "user",
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    license: {
      type: DataTypes.STRING(12),
      defaultValue: "",
    },
  },
  {
    timestamps: true,
  },
);

export default User;
