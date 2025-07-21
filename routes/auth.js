const express = require("express")
const { body } = require("express-validator")
const auth = require("../middleware/auth")
const {
  register,
  login,
  getCurrentUser,
  logout,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController")

const router = express.Router()

// Validation rules
const registerValidation = [
  body("name").trim().isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  body("phone")
    .trim()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage("Please provide a valid phone number"),
  body("age").isInt({ min: 18, max: 100 }).withMessage("Age must be between 18 and 100"),
  body("gender").isIn(["male", "female", "other"]).withMessage("Please select a valid gender"),
  body("location").trim().isLength({ min: 2 }).withMessage("Location must be at least 2 characters"),
]

const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
]

const forgotPasswordValidation = [body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email")]

const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
]

// Test route
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth routes are working!",
    timestamp: new Date().toISOString(),
  })
})

// Auth routes
router.post("/register", registerValidation, register)
router.post("/login", loginValidation, login)
router.get("/me", auth, getCurrentUser)
router.post("/logout", auth, logout)
router.post("/forgot-password", forgotPasswordValidation, forgotPassword)
router.post("/reset-password", resetPasswordValidation, resetPassword)

console.log("Auth routes module loaded successfully")

module.exports = router
