const User = require("../models/User")
const Profile = require("../models/Profile")
const Report = require("../models/Report")
const logger = require("../utils/logger")

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password")
    const profile = await Profile.findOne({ userId: req.user.id })

    res.json({
      success: true,
      user,
      profile,
    })
  } catch (error) {
    logger.error("Get me error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}

// Update user
exports.updateMe = async (req, res) => {
  try {
    const { email, phone } = req.body

    const user = await User.findByIdAndUpdate(req.user.id, { email, phone }, { new: true, runValidators: true }).select(
      "-password",
    )

    res.json({
      success: true,
      user,
    })
  } catch (error) {
    logger.error("Update user error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while updating user",
    })
  }
}

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    const user = await User.findById(req.user.id).select("+password")

    const isCurrentPasswordValid = await user.comparePassword(currentPassword)
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      })
    }

    user.password = newPassword
    await user.save()

    res.json({
      success: true,
      message: "Password changed successfully",
    })
  } catch (error) {
    logger.error("Change password error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while changing password",
    })
  }
}

// Report user
exports.reportUser = async (req, res) => {
  try {
    const { reportedUserId, reason, description } = req.body

    const report = await Report.create({
      reporterId: req.user.id,
      reportedUserId,
      reason,
      description,
    })

    res.json({
      success: true,
      message: "Report submitted successfully",
      report,
    })
  } catch (error) {
    logger.error("Report user error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while submitting report",
    })
  }
}

// Delete account
exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isActive: false })
    await Profile.findOneAndUpdate({ userId: req.user.id }, { isActive: false })

    res.json({
      success: true,
      message: "Account deactivated successfully",
    })
  } catch (error) {
    logger.error("Delete account error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while deleting account",
    })
  }
}
