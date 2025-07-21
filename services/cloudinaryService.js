const cloudinary = require("cloudinary").v2
const streamifier = require("streamifier")

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

class CloudinaryService {
  uploadImage(buffer, options = {}) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          ...options,
        },
        (error, result) => {
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        },
      )

      streamifier.createReadStream(buffer).pipe(uploadStream)
    })
  }

  deleteImage(publicId) {
    return cloudinary.uploader.destroy(publicId)
  }

  generateSignedUrl(publicId, options = {}) {
    return cloudinary.url(publicId, {
      sign_url: true,
      ...options,
    })
  }
}

module.exports = new CloudinaryService()
