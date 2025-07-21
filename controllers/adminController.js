const User = require("../models/User")
const Profile = require("../models/Profile")
const Match = require("../models/Match")
const Report = require("../models/Report")
const Message = require("../models/Message")
const logger = require("../utils/logger")

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const stats = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastLogin: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ subscription: "premium" }),
      Message.countDocuments(),
      Report.countDocuments({ createdAt: { $gte: today } }),
      Profile.countDocuments({ isActive: false }),
    ])

    res.json({
      success: true,
      stats: {
        totalUsers: stats[0],
        activeUsers: stats[1],
        newRegistrations: stats[2],
        premiumUsers: stats[3],
        totalMessages: stats[4],
        reportsToday: stats[5],
        verificationsPending: stats[6],
      },
    })
  } catch (error) {
    logger.error("Get dashboard stats error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
    })
  }
}

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query

    const query = {}

    if (status && status !== "all") {
      if (status === "active") {
        query.isActive = true
      } else if (status === "banned") {
        query.isActive = false
      }
    }

    if (search) {
      query.$or = [{ email: { $regex: search, $options: "i" } }]
    }

    const users = await User.find(query)
      .populate("userId", "name photos")
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await User.countDocuments(query)

    res.json({
      success: true,
      users,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error("Get users error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    })
  }
}

// Get all reports
exports.getReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query

    const query = {}
    if (status && status !== "all") {
      query.status = status
    }

    const reports = await Report.find(query)
      .populate("reporterId", "email")
      .populate("reportedUserId", "email")
      .populate({
        path: "reportedUserId",
        populate: {
          path: "userId",
          model: "Profile",
          select: "name photos",
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Report.countDocuments(query)

    res.json({
      success: true,
      reports,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error("Get reports error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
    })
  }
}

// Handle report action
exports.handleReportAction = async (req, res) => {
  try {
    const { reportId } = req.params
    const { action, notes } = req.body
    const adminId = req.user.id

    const report = await Report.findById(reportId)
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      })
    }

    // Update report
    report.status = "resolved"
    report.adminAction = {
      actionType: action,
      actionDate: new Date(),
      adminId,
      notes,
    }
    await report.save()

    // Take action on reported user if necessary
    if (action === "temporary-ban") {
      await User.findByIdAndUpdate(report.reportedUserId, {
        isActive: false,
        lockUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
    } else if (action === "permanent-ban") {
      await User.findByIdAndUpdate(report.reportedUserId, {
        isActive: false,
      })
    }

    res.json({
      success: true,
      message: "Report action completed successfully",
    })
  } catch (error) {
    logger.error("Handle report action error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to handle report action",
    })
  }
}

// Ban user
exports.banUser = async (req, res) => {
  try {
    const { userId } = req.params
    const { reason, duration } = req.body

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    user.isActive = false
    if (duration && duration !== "permanent") {
      const days = Number.parseInt(duration)
      user.lockUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    }
    await user.save()

    res.json({
      success: true,
      message: "User banned successfully",
    })
  } catch (error) {
    logger.error("Ban user error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to ban user",
    })
  }
}

// Unban user
exports.unbanUser = async (req, res) => {
  try {
    const { userId } = req.params

    await User.findByIdAndUpdate(userId, {
      isActive: true,
      lockUntil: undefined,
    })

    res.json({
      success: true,
      message: "User unbanned successfully",
    })
  } catch (error) {
    logger.error("Unban user error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to unban user",
    })
  }
}

// Get analytics data
exports.getAnalytics = async (req, res) => {
  try {
    const { period = "30" } = req.query
    const days = Number.parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // User growth
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // Match success rate
    const totalMatches = await Match.countDocuments()
    const successfulMatches = await Match.countDocuments({ status: "matched" })
    const matchSuccessRate = totalMatches > 0 ? (successfulMatches / totalMatches) * 100 : 0

    // Premium conversion rate
    const totalUsers = await User.countDocuments()
    const premiumUsers = await User.countDocuments({ subscription: "premium" })
    const conversionRate = totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0

    res.json({
      success: true,
      analytics: {
        userGrowth,
        matchSuccessRate: Math.round(matchSuccessRate),
        conversionRate: Math.round(conversionRate),
        totalUsers,
        premiumUsers,
      },
    })
  } catch (error) {
    logger.error("Get analytics error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
    })
  }
}
