import multer from "multer";
import fs from 'fs';

const storage = multer.diskStorage({
    destination: (req,res,cb) => {
        fs.mkdirSync('uploads', {recursive: true})
        cb(null, 'uploads/')
    },
    filename: (req, file, cb) => {
        cb(null, file.filename + '-' + Date.now() + '.' + file.mimetype.split('/')[1])
    }
})

export const upload = multer({
    storage: storage,
})