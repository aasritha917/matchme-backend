const express = require("express")
const multer = require("multer")
const cloudinaryService = require("../services/cloudinaryService")
const auth = require("../middleware/auth")

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})

router.use(auth)

router.post("/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      })
    }

    const result = await cloudinaryService.uploadImage(req.file.buffer, {
      folder: `matchme/temp/${req.user.id}`,
      transformation: [{ width: 800, height: 800, crop: "fill" }, { quality: "auto" }],
    })

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Upload failed",
    })
  }
})

module.exports = router
