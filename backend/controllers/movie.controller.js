import { Notification } from "../model/notification.model.js";
import Movie from "../model/movie.model.js";

const parseListField = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseCastProfilesField = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const resolveCastPayload = ({ body, files, fallbackCasts = [], fallbackCastImages = [] }) => {
  const castProfiles = parseCastProfilesField(body?.castProfiles);
  const uploadedCastImages = files?.castImages ?? [];

  if (castProfiles.length > 0) {
    const casts = [];
    const castImages = [];

    for (const profile of castProfiles) {
      const castName =
        typeof profile?.name === "string" ? profile.name.trim() : "";
      if (!castName) continue;

      let castImage = null;
      const fileIndex = Number(profile?.imageFileIndex);
      if (
        Number.isInteger(fileIndex) &&
        fileIndex >= 0 &&
        fileIndex < uploadedCastImages.length
      ) {
        castImage = uploadedCastImages[fileIndex]?.filename ?? null;
      } else if (typeof profile?.image === "string" && profile.image.trim()) {
        castImage = profile.image.trim();
      }

      casts.push(castName);
      castImages.push(castImage);
    }

    return { casts, castImages };
  }

  const casts = body?.casts === undefined ? fallbackCasts : parseListField(body.casts);
  const castImagesFromBody = body?.castImages === undefined ? fallbackCastImages : parseListField(body.castImages);
  const castImagesFromFiles =
    uploadedCastImages.map((file) => file.filename).filter(Boolean) ?? [];
  const castImages = castImagesFromFiles.length > 0 ? castImagesFromFiles : castImagesFromBody;

  return { casts, castImages };
};

const movieRegister = async (req, res) => {
  try {
    const {
      movie_title,
      description,
      genre,
      duration,
      director,
      writer,
    } = req.body;
    if (!movie_title || !description || !genre || !duration) {
      return res.status(400).json({
        success: false,
        message: "Movie details must be filled to register",
      });
    }

    const genreArr = parseListField(genre);
    const { casts: castsArr, castImages: castImagesArr } = resolveCastPayload({
      body: req.body,
      files: req.files,
    });

    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: "Unauthorized: No user found",
      });
    }

    if (req.user.role !== "hall-admin" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Sorry, you are not authorized to register movie",
      });
    }

    const moviePoster = req.files?.moviePoster?.[0];
    const movieTrailer = req.files?.movieTrailer?.[0];

    if (!moviePoster || !movieTrailer) {
      return res.status(400).json({
        success: false,
        message: "Trailer and Poster are required",
      });
    }

    const date = new Date();
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 7);

    const movie = await Movie.create({
      movie_title,
      description,
      genre: genreArr,
      duration,
      director: typeof director === "string" ? director.trim() : null,
      writer: typeof writer === "string" ? writer.trim() : null,
      casts: castsArr,
      castImages: castImagesArr,
      releaseDate: date.toISOString().split("T")[0],
      isPlaying: true,
      playEndDate: endDate.toISOString().split("T")[0],
      moviePoster: moviePoster.filename,
      movieTrailer: movieTrailer.filename,
    });

    await Notification.create({
      userId: null,
      title: "Movie Added in Collection",
      message: `A new movie "${movie.movie_title}" has been added!`,
      type: "movie",
      isRead: false,
      referenceId: movie.id,
      referenceType: "Movie",
    });

    return res.status(201).json({
      success: true,
      message: "Movie has been registered successfully",
      data: movie,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed while creating movies",
      error: err.message,
    });
  }
};

const movieDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await Movie.findByPk(id);

    if (!movie) {
      return res.status(400).json({
        success: false,
        message: "Delete: Movie not found",
      });
    }

    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: "Unauthorized: No user found",
      });
    }

    if (req.user?.role !== "hall-admin" && req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Movie cannot be deleted: Unauthorized",
      });
    }

    await movie.destroy();

    await Notification.create({
      userId: null,
      title: "Movie Removal",
      message: `Movie "${movie.movie_title}" has been removed from the listings.`,
      type: "movie",
      isRead: false,
      referenceId: movie.id,
      referenceType: "Movie",
    });

    return res.status(200).json({
      success: true,
      message: "Movie deleted successfully",
      data: movie,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed while deleting movie",
      error: err.message,
    });
  }
};

const movieGet = async (req, res) => {
  try {
    const movies = await Movie.findAll();

    return res.status(200).json({
      success: true,
      message: "Movies fetched successfully",
      data: movies,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed while fetching user",
      error: err.message,
    });
  }
};

const movieGetById = async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await Movie.findByPk(id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Movie fetched successfully",
      data: movie,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed while fetching movie",
      error: err.message,
    });
  }
};

const movieUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await Movie.findByPk(id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie cannot find",
      });
    }

    const {
      movie_title,
      description,
      genre,
      duration,
      director,
      writer,
      releaseDate,
      isPlaying,
    } = req.body;
    const moviePoster = req.files?.moviePoster?.[0]?.filename;
    const movieTrailer = req.files?.movieTrailer?.[0]?.filename;
    let newEndDate = movie.playEndDate;

    if (releaseDate) {
      newEndDate = new Date(releaseDate);
      newEndDate.setDate(newEndDate.getDate() + 7);
    }

    const parsedGenre = genre === undefined ? movie.genre : parseListField(genre);
    const { casts: parsedCasts, castImages: parsedCastImages } = resolveCastPayload({
      body: req.body,
      files: req.files,
      fallbackCasts: movie.casts,
      fallbackCastImages: movie.castImages,
    });

    const updatedMovie = await movie.update({
      movie_title: movie_title ?? movie.movie_title,
      description: description ?? movie.description,
      genre: parsedGenre,
      duration: duration ?? movie.duration,
      director:
        director === undefined ? movie.director : typeof director === "string" ? director.trim() : movie.director,
      writer:
        writer === undefined ? movie.writer : typeof writer === "string" ? writer.trim() : movie.writer,
      casts: parsedCasts,
      castImages: parsedCastImages,
      moviePoster: moviePoster ?? movie.moviePoster,
      movieTrailer: movieTrailer ?? movie.movieTrailer,
      releaseDate: releaseDate ?? movie.releaseDate,
      isPlaying: isPlaying ?? movie.isPlaying,
      playEndDate: newEndDate,
    });

    await Notification.create({
      userId: null,
      title: "Movie Updated",
      message: `Movie "${updatedMovie.movie_title}" has been updated. Check the new details!`,
      type: "movie",
      isRead: false,
      referenceId: updatedMovie.id,
      referenceType: "Movie",
    });

    return res.status(200).json({
      success: true,
      message: "Movie has been updated successfully",
      data: updatedMovie,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Server failed while updating movie",
      error: err.message,
    });
  }
};

export { movieRegister, movieDelete, movieGet, movieGetById, movieUpdate };
