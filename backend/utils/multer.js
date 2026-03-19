import multer from "multer";
import fs from "fs";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    fs.mkdirSync("uploads", { recursive: true });
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || `.${file.mimetype.split("/")[1]}`;
    const baseName = path
      .basename(file.originalname, ext)
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "");

    cb(null, `${baseName || file.fieldname}-${Date.now()}${ext}`);
  },
});

export const upload = multer({
  storage,
});
