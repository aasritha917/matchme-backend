const jwt = require("jsonwebtoken")
const User = require("../models/User")

const auth = async (req, res, next) => {
  try {
    let token

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1]
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      })
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")

      // Get user from token
      const user = await User.findById(decoded.id)
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Token is valid but user no longer exists",
        })
      }

      // Add user to request
      req.userId = user._id
      req.user = user
      next()
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Token is not valid",
      })
    }
  } catch (error) {
    console.error("Auth middleware error:", error)
    res.status(500).json({
      success: false,
      message: "Server error in authentication",
    })
  }
}

module.exports = auth
