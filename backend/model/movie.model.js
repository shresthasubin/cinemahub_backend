import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";

const Movie = sequelize.define(
  "Movie",
  {
    movie_title: {
      type: DataTypes.STRING(30),
      allowNull: false,
      set(value) {
        if (typeof value === "string") {
          this.setDataValue("movie_title", value.trim());
        }
      },
    },
    description: {
      type: DataTypes.TEXT,
      set(value) {
        if (typeof value === "string") {
          this.setDataValue("description", value.trim());
        }
      },
    },
    director: {
      type: DataTypes.STRING(120),
      set(value) {
        if (typeof value === "string") {
          this.setDataValue("director", value.trim());
        }
      },
    },
    writer: {
      type: DataTypes.STRING(160),
      set(value) {
        if (typeof value === "string") {
          this.setDataValue("writer", value.trim());
        }
      },
    },
    casts: {
      type: DataTypes.JSON,
      defaultValue: [],
      set(value) {
        if (Array.isArray(value)) {
          this.setDataValue("casts", value);
          return;
        }
        if (typeof value === "string") {
          const normalized = value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          this.setDataValue("casts", normalized);
        }
      },
    },
    castImages: {
      type: DataTypes.JSON,
      defaultValue: [],
      set(value) {
        if (Array.isArray(value)) {
          this.setDataValue("castImages", value);
          return;
        }
        if (typeof value === "string") {
          const normalized = value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          this.setDataValue("castImages", normalized);
        }
      },
    },
    genre: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    releaseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    isPlaying: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    playEndDate: {
      type: DataTypes.DATEONLY,
    },
    moviePoster: {
      type: DataTypes.TEXT,
    },
    movieTrailer: {
      type: DataTypes.TEXT,
    },
  },
  {
    timestamps: true,
  },
);

export default Movie;
