import cloudinary from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const removeLocalFile = (localFilePath) => {
  if (!localFilePath || !fs.existsSync(localFilePath)) return;
  fs.unlinkSync(localFilePath);
};

const uploadOnCloudinary = async (localFilePath, options = {}) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.v2.uploader.upload(localFilePath, {
      resource_type: "auto",
      ...options,
    });

    removeLocalFile(localFilePath);
    return response;
  } catch (err) {
    console.log("cloudinary error:", err);
    removeLocalFile(localFilePath);
    return null;
  }
};

const uploadFileToCloudinary = async (file, options = {}) => {
  if (!file?.path) return null;
  return uploadOnCloudinary(file.path, options);
};

const uploadFilesToCloudinary = async (files = [], options = {}) => {
  if (!Array.isArray(files) || files.length === 0) return [];

  const uploads = await Promise.all(
    files.map((file) => uploadFileToCloudinary(file, options)),
  );

  return uploads.filter(Boolean);
};

export { uploadOnCloudinary, uploadFileToCloudinary, uploadFilesToCloudinary };
