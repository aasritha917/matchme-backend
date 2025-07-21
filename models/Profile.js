const express = require("express")
const { body } = require("express-validator")
const {
  getProfile,
  updateProfile,
  uploadPhoto,
  deletePhoto,
  setPrimaryPhoto,
  getAllUsers,
} = require("../controllers/profileController")
const auth = require("../middleware/auth")
const { upload } = require("../config/cloudinary")

const router = express.Router()

// Validation rules
const updateProfileValidation = [
  body("name").optional().trim().isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
  body("bio").optional().isLength({ max: 500 }).withMessage("Bio cannot exceed 500 characters"),
  body("profession").optional().trim().isLength({ max: 100 }).withMessage("Profession cannot exceed 100 characters"),
  body("education")
    .optional()
    .isIn(["high-school", "bachelors", "masters", "phd", "other", ""])
    .withMessage("Invalid education level"),
  body("religion")
    .optional()
    .isIn(["christian", "muslim", "hindu", "buddhist", "jewish", "other", "none", ""])
    .withMessage("Invalid religion"),
]

// Routes
router.get("/me", auth, getProfile)
router.put("/me", auth, updateProfileValidation, updateProfile)
router.post("/upload-photo", auth, upload.single("photo"), uploadPhoto)
router.delete("/photos/:photoId", auth, deletePhoto)
router.put("/photos/:photoId/primary", auth, setPrimaryPhoto)
router.get("/users", auth, getAllUsers)

module.exports = router
