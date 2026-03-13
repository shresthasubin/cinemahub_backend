import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";
import Movie from "./movie.model.js";
import Hallroom from "./hallroom.model.js";

const Showtime = sequelize.define(
  "Showtime",
  {
    show_date: DataTypes.DATEONLY,
    start_time: DataTypes.TIME,
    end_time: DataTypes.TIME,
    movie_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    hallroom_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: false,
  },
);

Movie.hasMany(Showtime, { foreignKey: "movie_id" });
Showtime.belongsTo(Movie, { foreignKey: "movie_id" });

Hallroom.hasMany(Showtime, { foreignKey: "hallroom_id" });
Showtime.belongsTo(Hallroom, { foreignKey: "hallroom_id" });

export default Showtime;
