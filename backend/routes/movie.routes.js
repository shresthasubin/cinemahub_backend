import {
    movieDelete,
    movieGet,
    movieGetById,
    movieRegister,
    movieUpdate
} from "../controllers/movie.controller.js";
import { verifyJWT, roleCheck } from "../middlewares/auth.middleware.js";
import express from 'express';
import { upload } from "../utils/multer.js";

const movieRouter = express.Router()

movieRouter.post('/register', 
    [verifyJWT, roleCheck(['hall-admin','admin'])], 
    upload.fields([
        { name: "moviePoster", maxCount: 1 },
        { name: "movieTrailer", maxCount: 1 },
        { name: "castImages", maxCount: 20 }
    ]), 
    movieRegister
)

movieRouter.delete('/delete/:id', 
    [verifyJWT, roleCheck(['hall-admin','admin'])], 
    movieDelete
)

movieRouter.get('/get', movieGet)
movieRouter.get('/get/:id', movieGetById)

movieRouter.put('/update/:id', 
    [verifyJWT, roleCheck(['hall-admin','admin'])], 
    upload.fields([
        { name: "moviePoster", maxCount: 1 },
        { name: "movieTrailer", maxCount: 1 },
        { name: "castImages", maxCount: 20 }
    ]), 
    movieUpdate
)

export default movieRouter
