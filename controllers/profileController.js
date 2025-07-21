const User = require("../models/User")
const { deleteImage } = require("../config/cloudinary")
const { validationResult } = require("express-validator")

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
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
    console.error("Get profile error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const { name, bio, profession, education, religion, interests, preferences } = req.body

    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Update fields
    if (name) user.name = name.trim()
    if (bio !== undefined) user.bio = bio.trim()
    if (profession !== undefined) user.profession = profession.trim()
    if (education) user.education = education
    if (religion) user.religion = religion
    if (interests) user.interests = Array.isArray(interests) ? interests : JSON.parse(interests)
    if (preferences) user.preferences = { ...user.preferences, ...preferences }

    await user.save()

    const userData = user.getSafeData()

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: userData,
      },
    })
  } catch (error) {
    console.error("Update profile error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

// Upload profile photo
const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      })
    }

    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Check if user already has maximum photos (6)
    if (user.photos.length >= 6) {
      return res.status(400).json({
        success: false,
        message: "Maximum 6 photos allowed",
      })
    }

    // Add new photo
    const newPhoto = {
      url: req.file.path,
      publicId: req.file.filename,
      isPrimary: user.photos.length === 0, // First photo is primary
    }

    user.photos.push(newPhoto)
    await user.save()

    res.json({
      success: true,
      message: "Photo uploaded successfully",
      data: {
        photo: newPhoto,
        photos: user.photos,
      },
    })
  } catch (error) {
    console.error("Upload photo error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

// Delete profile photo
const deletePhoto = async (req, res) => {
  try {
    const { photoId } = req.params

    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const photoIndex = user.photos.findIndex((photo) => photo._id.toString() === photoId)
    if (photoIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Photo not found",
      })
    }

    const photo = user.photos[photoIndex]

    try {
      // Delete from Cloudinary
      await deleteImage(photo.publicId)
    } catch (cloudinaryError) {
      console.error("Error deleting from Cloudinary:", cloudinaryError)
      // Continue with database deletion even if Cloudinary deletion fails
    }

    // Remove from user's photos array
    user.photos.splice(photoIndex, 1)

    // If deleted photo was primary and there are other photos, make the first one primary
    if (photo.isPrimary && user.photos.length > 0) {
      user.photos[0].isPrimary = true
    }

    await user.save()

    res.json({
      success: true,
      message: "Photo deleted successfully",
      data: {
        photos: user.photos,
      },
    })
  } catch (error) {
    console.error("Delete photo error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

// Set primary photo
const setPrimaryPhoto = async (req, res) => {
  try {
    const { photoId } = req.params

    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const photo = user.photos.find((photo) => photo._id.toString() === photoId)
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: "Photo not found",
      })
    }

    // Remove primary status from all photos
    user.photos.forEach((photo) => {
      photo.isPrimary = false
    })

    // Set new primary photo
    photo.isPrimary = true

    await user.save()

    res.json({
      success: true,
      message: "Primary photo updated successfully",
      data: {
        photos: user.photos,
      },
    })
  } catch (error) {
    console.error("Set primary photo error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

// Get all users (for matching)
const getAllUsers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId)
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const { page = 1, limit = 10 } = req.query

    // Build filter based on user preferences
    const filter = {
      _id: { $ne: req.userId }, // Exclude current user
      isActive: true,
      gender:
        currentUser.preferences.interestedIn === "both"
          ? { $in: ["male", "female"] }
          : currentUser.preferences.interestedIn,
      age: {
        $gte: currentUser.preferences.ageRange.min,
        $lte: currentUser.preferences.ageRange.max,
      },
    }

    const users = await User.find(filter)
      .select("-password -passwordResetToken -passwordResetExpires")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ lastActive: -1 })

    const total = await User.countDocuments(filter)

    res.json({
      success: true,
      data: {
        users: users.map((user) => user.getSafeData()),
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      },
    })
  } catch (error) {
    console.error("Get all users error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

module.exports = {
  getProfile,
  updateProfile,
  uploadPhoto,
  deletePhoto,
  setPrimaryPhoto,
  getAllUsers,
}
