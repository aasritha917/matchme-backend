const express = require("express")
const { body } = require("express-validator")
const auth = require("../middleware/auth")
const { upload } = require("../config/cloudinary")
const {
  getProfile,
  updateProfile,
  uploadPhoto,
  deletePhoto,
  setPrimaryPhoto,
  getAllUsers,
} = require("../controllers/profileController")

const router = express.Router()

// Get current user profile
router.get("/me", auth, getProfile)

// Update profile
router.put(
  "/me",
  auth,
  [
    body("name").optional().trim().isLength({ min: 1, max: 50 }).withMessage("Name must be 1-50 characters"),
    body("bio").optional().trim().isLength({ max: 500 }).withMessage("Bio cannot exceed 500 characters"),
    body("profession").optional().trim().isLength({ max: 100 }).withMessage("Profession cannot exceed 100 characters"),
    body("education").optional().isIn(["high-school", "bachelors", "masters", "phd", "other"]),
    body("religion").optional().isIn(["christian", "muslim", "hindu", "buddhist", "jewish", "other", "none"]),
    body("interests").optional().isArray().withMessage("Interests must be an array"),
  ],
  updateProfile,
)

// Upload photo
router.post("/upload-photo", auth, upload.single("photo"), uploadPhoto)

// Delete photo
router.delete("/photos/:photoId", auth, deletePhoto)

// Set primary photo
router.put("/photos/:photoId/primary", auth, setPrimaryPhoto)

// Get all users for matching
router.get("/users", auth, getAllUsers)

// Get specific user profile
router.get("/:userId", auth, async (req, res) => {
  try {
    const User = require("../models/User")
    const user = await User.findById(req.params.userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const userData = user.getSafeData()

    res.json({
      success: true,
      data: {
        user: userData,
      },
    })
  } catch (error) {
    console.error("Get user profile error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
})

module.exports = router
