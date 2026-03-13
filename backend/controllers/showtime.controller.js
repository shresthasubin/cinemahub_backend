import Hall from "../model/hall.model.js";
import Hallroom from "../model/hallroom.model.js";
import Movie from "../model/movie.model.js";
import Showtime from "../model/showtime.model.js";

const logShowtimeError = (scope, req, err) => {
  console.error(`[showtime:${scope}]`, {
    message: err?.message,
    stack: err?.stack,
    params: req?.params,
    query: req?.query,
    body: req?.body,
    user: req?.user
      ? { id: req.user.id, role: req.user.role, license: req.user.license }
      : null,
  });
};

const timeToMinute = (timeString) => {
  if (!timeString || typeof timeString !== "string") return null;
  const [hourStr, minuteStr] = timeString.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (
    Number.isInteger(hour) && Number.isInteger(minute) &&
    hour >= 0 && hour <= 23 &&
    minute >= 0 && minute <= 59
  ) {
    return hour * 60 + minute;
  } else {
    throw new Error(`Invalid time string: ${timeString}`);
  }
};

const minuteToTime = (minutes) => {
  minutes %= 24 * 60;
  const hour = Math.floor(minutes / 60);
  const remainingMinute = minutes % 60;

  const paddedHour = String(hour).padStart(2, "0");
  const paddedMinute = String(remainingMinute).padStart(2, "0");

  return `${paddedHour}:${paddedMinute}:00`;
};

const overlaps = (startA, endA, startB, endB) => startA < endB && startB < endA;

const isValidDateOnly = (value) => {
  if (!value || typeof value !== "string") return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(value);
};

const getShowtimeIncludes = () => ([
  { model: Movie, attributes: ["id", "movie_title", "duration", "genre"] },
  {
    model: Hallroom,
    attributes: ["id", "roomName", "hall_id", "capacity"],
    include: [{ model: Hall, attributes: ["id", "hall_name", "hall_location"] }],
  },
]);

const getRoleBasedHallroomFilter = (req) => {
  if (req.user?.role === "hall-admin") {
    return req.user.license ? { license: req.user.license } : { id: -1 };
  }
  return null;
};

const createShowtime = async (req, res) => {
  try {
    const { movieId, hallroomId } = req.params
    
    if (!movieId || !hallroomId) {
      return res.status(400).json({
        success: false,
        message: "Valid movieId and hallroomId are required",
      });
    }

    const movie = await Movie.findOne({ where: { id: parseInt(movieId) } })
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }
    const hallroom = await Hallroom.findOne({ where: { id: parseInt(hallroomId) } })
    if (!hallroom) {
      return res.status(404).json({
        success: false,
        message: "Hallroom not found",
      });
    }

    const hall = await Hall.findByPk(hallroom.hall_id);
    if (!hall) {
      return res.status(404).json({
        success: false,
        message: "Hall not found for this hallroom",
      });
    }
    if (req.user?.role === "hall-admin" && hall.license !== req.user.license) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create showtime for this hallroom",
      });
    }

    const { show_date, start_time } = req.body;

    if (!show_date || !start_time) {
      return res.status(400).json({
        success: false,
        message: "Show date and start time must be defined"
      })
    }

    if (!isValidDateOnly(show_date)) {
      return res.status(400).json({
        success: false,
        message: "show_date must be in YYYY-MM-DD format",
      });
    }

    const startMinute = timeToMinute(start_time);
    const duration = Number(movie.duration);
    const endMinute = startMinute + duration;

    if (endMinute > 24 * 60) {
      return res.status(400).json({
        success: false,
        message: "Showtime cannot cross to next day",
      });
    }

    const existingShowtimes = await Showtime.findAll({
      where: { hallroom_id: hallroomId, show_date },
    });

    const conflict = existingShowtimes.find((s) => {
      const sStart = timeToMinute(String(s.start_time));
      const sEnd = timeToMinute(String(s.end_time));
      return overlaps(startMinute, endMinute, sStart, sEnd);
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: "Showtime overlaps with another showtime in this hallroom",
      });
    }
      
    const showtime = await Showtime.create({
      show_date,
      start_time: minuteToTime(startMinute),
      end_time: minuteToTime(endMinute),
      movie_id: movieId,
      hallroom_id: hallroomId,
    });

    const populated = await Showtime.findByPk(showtime.id, {
      include: getShowtimeIncludes(),
    });

    return res.status(201).json({
      success: true,
      message: "Showtime created successfully",
      data: populated,
    });
  } catch (err) {
    logShowtimeError("create", req, err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

const updateShowTime = async (req, res) => {
  try {
    const showtimeId = Number(req.params.showtimeId);
    if (!Number.isInteger(showtimeId) || showtimeId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid showtimeId",
      });
    }

    const showtime = await Showtime.findByPk(showtimeId, {
      include: [{ model: Hallroom, attributes: ["id", "hall_id"] }],
    });

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: "Showtime not found",
      });
    }

    if (req.user?.role === "hall-admin") {
      const hall = await Hall.findByPk(showtime.Hallroom?.hall_id);
      if (!hall || hall.license !== req.user.license) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this showtime",
        });
      }
    }

    const movie = await Movie.findByPk(showtime.movie_id);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found for this showtime",
      });
    }

    const show_date = req.body.show_date || showtime.show_date;
    const start_time = req.body.start_time || String(showtime.start_time);

    if (!show_date || !start_time) {
      return res.status(400).json({
        success: false,
        message: "show_date and start_time are required",
      });
    }

    if (!isValidDateOnly(show_date)) {
      return res.status(400).json({
        success: false,
        message: "show_date must be in YYYY-MM-DD format",
      });
    }

    const startMinute = timeToMinute(start_time);
    const duration = Number(movie.duration);
    const endMinute = startMinute + duration;
    if (endMinute > 24 * 60) {
      return res.status(400).json({
        success: false,
        message: "Showtime cannot cross to next day",
      });
    }

    const existingShowtimes = await Showtime.findAll({
      where: { hallroom_id: showtime.hallroom_id, show_date },
    });

    const conflict = existingShowtimes.find((s) => {
      if (s.id === showtime.id) return false;
      const sStart = timeToMinute(String(s.start_time));
      const sEnd = timeToMinute(String(s.end_time));
      return overlaps(startMinute, endMinute, sStart, sEnd);
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: "Updated time overlaps with another showtime in this hallroom",
      });
    }

    await showtime.update({
      show_date,
      start_time: minuteToTime(startMinute),
      end_time: minuteToTime(endMinute),
    });

    const updated = await Showtime.findByPk(showtime.id, {
      include: getShowtimeIncludes(),
    });

    return res.status(200).json({
      success: true,
      message: "Showtime updated successfully",
      data: updated,
    });
  } catch (err) {
    logShowtimeError("update", req, err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

const getShowtimes = async (req, res) => {
  try {
    const { movieId, hallroomId, showDate } = req.query;
    const where = {};
    if (movieId) where.movie_id = movieId;
    if (hallroomId) where.hallroom_id = hallroomId;
    if (showDate) where.show_date = showDate;

    const hallFilter = getRoleBasedHallroomFilter(req);
    const include = getShowtimeIncludes();
    if (hallFilter) {
      include[1].include[0].where = hallFilter;
    }

    const showtimes = await Showtime.findAll({
      where,
      include,
      order: [["show_date", "ASC"], ["start_time", "ASC"]],
    });

    return res.status(200).json({ success: true, data: showtimes });
  } catch (err) {
    logShowtimeError("getAll", req, err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getShowtimesByMovie = async (req, res) => {
  try {
    const movieId = Number(req.params.movieId);
    const movie = await Movie.findByPk(movieId);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    const include = getShowtimeIncludes();
    const hallFilter = getRoleBasedHallroomFilter(req);
    if (hallFilter) {
      include[1].include[0].where = hallFilter;
    }

    const showtime = await Showtime.findAll({
      where: { movie_id: movieId },
      include,
      order: [["show_date", "ASC"], ["start_time", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      data: showtime,
    });
  } catch (err) {
    logShowtimeError("getByMovie", req, err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

const getShowtimesByHallroom = async (req, res) => {
  try {
    const hallroomId = Number(req.params.hallroomId);
    const hallroom = await Hallroom.findByPk(hallroomId, {
      include: [{ model: Hall, attributes: ["id", "license"] }],
    });

    if (!hallroom) {
      return res.status(404).json({
        success: false,
        message: "Hallroom not found",
      });
    }

    if (req.user?.role === "hall-admin" && hallroom.Hall?.license !== req.user.license) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this hallroom showtimes",
      });
    }

    const showtime = await Showtime.findAll({
      where: { hallroom_id: hallroomId },
      include: getShowtimeIncludes(),
      order: [["show_date", "ASC"], ["start_time", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      data: showtime,
    });
  } catch (err) {
    logShowtimeError("getByHallroom", req, err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

const getShowtimeById = async (req, res) => {
  try {
    const showtimeId = Number(req.params.showtimeId);
    if (!Number.isInteger(showtimeId) || showtimeId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid showtimeId",
      });
    }

    const include = getShowtimeIncludes();
    const hallFilter = getRoleBasedHallroomFilter(req);
    if (hallFilter) {
      include[1].include[0].where = hallFilter;
    }

    const showtime = await Showtime.findByPk(showtimeId, { include });

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: "Showtime not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: showtime,
    });
  } catch (err) {
    logShowtimeError("getById", req, err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

const deleteShowtime = async (req, res) => {
  try {
    const showtimeId = Number(req.params.showtimeId);
    if (!Number.isInteger(showtimeId) || showtimeId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid showtimeId",
      });
    }

    const showtime = await Showtime.findByPk(showtimeId, {
      include: [{ model: Hallroom, attributes: ["id", "hall_id"] }],
    });

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: "Showtime does not exist",
      });
    }

    if (req.user?.role === "hall-admin") {
      const hall = await Hall.findByPk(showtime.Hallroom?.hall_id);
      if (!hall || hall.license !== req.user.license) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete this showtime",
        });
      }
    }

    await showtime.destroy();
    return res.status(200).json({
      success: true,
      message: "Showtime has been deleted",
      data: { id: showtimeId },
    });
  } catch (err) {
    logShowtimeError("delete", req, err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export {
  createShowtime,
  updateShowTime,
  getShowtimes,
  getShowtimesByMovie,
  getShowtimesByHallroom,
  getShowtimeById,
  deleteShowtime,
};
