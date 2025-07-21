const User = require("../models/User")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const { validationResult } = require("express-validator")

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  })
}

// Register user
const register = async (req, res) => {
  try {
    console.log("Registration request received:", req.body)

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const { name, email, password, phone, age, gender, profession, education, religion, location } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      })
    }

    // Create new user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone,
      age: Number.parseInt(age),
      gender,
      profession: profession?.trim() || "",
      education: education || "",
      religion: religion || "",
      location: location?.trim() || "",
    })

    await user.save()
    console.log("User created successfully:", user.email)

    // Generate token
    const token = generateToken(user._id)

    // Get safe user data
    const userData = user.getSafeData()

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: userData,
        token,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

// Login user
const login = async (req, res) => {
  try {
    console.log("Login request received:", { email: req.body.email })

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const { email, password } = req.body

    // Find user by email and include password
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password")
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      })
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      })
    }

    // Update last active and online status
    user.isOnline = true
    user.lastActive = new Date()
    await user.save()

    console.log("User logged in successfully:", user.email)

    // Generate token
    const token = generateToken(user._id)

    // Get safe user data
    const userData = user.getSafeData()

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: userData,
        token,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Update last active
    user.lastActive = new Date()
    await user.save()

    const userData = user.getSafeData()

    res.json({
      success: true,
      data: {
        user: userData,
      },
    })
  } catch (error) {
    console.error("Get current user error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

// Logout user
const logout = async (req, res) => {
  try {
    // Update user online status
    await User.findByIdAndUpdate(req.userId, {
      isOnline: false,
      lastActive: new Date(),
    })

    res.json({
      success: true,
      message: "Logout successful",
    })
  } catch (error) {
    console.error("Logout error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const { email } = req.body

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with this email address",
      })
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken()
    await user.save({ validateBeforeSave: false })

    console.log("Password reset token generated for:", user.email)

    // For development, return the token
    res.json({
      success: true,
      message: "Password reset instructions sent to your email",
      resetToken: process.env.NODE_ENV === "development" ? resetToken : undefined,
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

// Reset password
const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const { token, password } = req.body

    // Hash the token and find user
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token is invalid or has expired",
      })
    }

    // Set new password
    user.password = password
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()

    console.log("Password reset successful for:", user.email)

    // Generate new token
    const jwtToken = generateToken(user._id)

    res.json({
      success: true,
      message: "Password reset successful",
      data: {
        token: jwtToken,
      },
    })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
  forgotPassword,
  resetPassword,
}
