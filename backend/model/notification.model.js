import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";

export const Notification = sequelize.define(
  "Notification",
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    referenceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    referenceType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    timestamps: true,
  },
);

let notificationColumnsEnsured = false;

export const ensureNotificationColumns = async () => {
  if (notificationColumnsEnsured) return;

  const [rows] = await sequelize.query("SHOW COLUMNS FROM Notifications");
  const colSet = new Set(rows.map((row) => row.Field));
  const queries = [];

  if (!colSet.has("userId")) {
    queries.push("ALTER TABLE Notifications ADD COLUMN `userId` INT NULL");
  }
  if (!colSet.has("title")) {
    queries.push("ALTER TABLE Notifications ADD COLUMN `title` VARCHAR(255) NOT NULL DEFAULT 'Notification'");
  }
  if (!colSet.has("message")) {
    queries.push("ALTER TABLE Notifications ADD COLUMN `message` VARCHAR(255) NOT NULL DEFAULT ''");
  }
  if (!colSet.has("type")) {
    queries.push("ALTER TABLE Notifications ADD COLUMN `type` VARCHAR(255) NOT NULL DEFAULT 'general'");
  }
  if (!colSet.has("isRead")) {
    queries.push("ALTER TABLE Notifications ADD COLUMN `isRead` TINYINT(1) NOT NULL DEFAULT 0");
  }
  if (!colSet.has("referenceId")) {
    queries.push("ALTER TABLE Notifications ADD COLUMN `referenceId` INT NULL");
  }
  if (!colSet.has("referenceType")) {
    queries.push("ALTER TABLE Notifications ADD COLUMN `referenceType` VARCHAR(255) NULL");
  }
  if (!colSet.has("createdAt")) {
    queries.push("ALTER TABLE Notifications ADD COLUMN `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
  }
  if (!colSet.has("updatedAt")) {
    queries.push("ALTER TABLE Notifications ADD COLUMN `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
  }

  for (const sql of queries) {
    await sequelize.query(sql);
  }

  notificationColumnsEnsured = true;
};
