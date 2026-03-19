import cloudinary from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv'

dotenv.config()

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})



const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.v2.uploader.upload(localFilePath, { resource_type: "auto" })

        fs.unlinkSync(localFilePath)
        return response
    } catch (err) {
        console.log('cloudinary error: ', err)
        fs.unlinkSync(localFilePath)
        return null
    }
}

export { uploadOnCloudinary }