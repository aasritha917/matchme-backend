const Match = require("../models/Match")
const Profile = require("../models/Profile")
const User = require("../models/User")
const matchingService = require("../services/matchingService")
const logger = require("../utils/logger")

// Get potential matches
exports.getPotentialMatches = async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 10 } = req.query

    const userProfile = await Profile.findOne({ userId })

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      })
    }

    // Get users already matched or rejected
    const existingMatches = await Match.find({
      $or: [{ user1Id: userId }, { user2Id: userId }],
    }).select("user1Id user2Id")

    const excludeUserIds = existingMatches
      .flatMap((match) => [match.user1Id.toString(), match.user2Id.toString()])
      .filter((id) => id !== userId)

    // Add current user to exclude list
    excludeUserIds.push(userId)

    // Build match criteria based on preferences
    const matchCriteria = {
      userId: { $nin: excludeUserIds },
      isActive: true,
      age: {
        $gte: userProfile.preferences.ageRange.min,
        $lte: userProfile.preferences.ageRange.max,
      },
    }

    // Add gender preference
    if (userProfile.preferences.gender && userProfile.preferences.gender !== "any") {
      matchCriteria.gender = userProfile.preferences.gender
    }

    // Add education preference
    if (userProfile.preferences.education && userProfile.preferences.education !== "any") {
      matchCriteria.education = userProfile.preferences.education
    }

    // Add religion preference
    if (userProfile.preferences.religion && userProfile.preferences.religion !== "any") {
      matchCriteria.religion = userProfile.preferences.religion
    }

    // Location-based matching if coordinates available
    if (userProfile.location?.coordinates) {
      matchCriteria["location.coordinates"] = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: userProfile.location.coordinates,
          },
          $maxDistance: userProfile.preferences.maxDistance * 1609.34, // Convert miles to meters
        },
      }
    }

    const potentialMatches = await Profile.find(matchCriteria)
      .populate("userId", "email subscription")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ lastActive: -1 })

    // Calculate match percentages
    const matchesWithScores = await Promise.all(
      potentialMatches.map(async (match) => {
        const matchPercentage = await matchingService.calculateCompatibility(userProfile, match)
        return {
          ...match.toObject(),
          matchPercentage,
        }
      }),
    )

    // Sort by match percentage
    matchesWithScores.sort((a, b) => b.matchPercentage - a.matchPercentage)

    res.json({
      success: true,
      matches: matchesWithScores,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: matchesWithScores.length,
      },
    })
  } catch (error) {
    logger.error("Get potential matches error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while fetching matches",
    })
  }
}

// Like a user
exports.likeUser = async (req, res) => {
  try {
    const userId = req.user.id
    const { targetUserId } = req.params

    if (userId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot like yourself",
      })
    }

    // Check if match already exists
    let match = await Match.findOne({
      $or: [
        { user1Id: userId, user2Id: targetUserId },
        { user1Id: targetUserId, user2Id: userId },
      ],
    })

    if (match) {
      // Check if current user already liked
      const alreadyLiked = match.likedBy.some((like) => like.userId.toString() === userId)

      if (alreadyLiked) {
        return res.status(400).json({
          success: false,
          message: "Already liked this user",
        })
      }

      // Add like
      match.likedBy.push({ userId })

      // Check if it's a mutual like
      const mutualLike = match.likedBy.length === 2
      if (mutualLike) {
        match.status = "matched"
        match.matchedAt = new Date()
      }

      await match.save()
    } else {
      // Create new match
      const userProfile = await Profile.findOne({ userId })
      const targetProfile = await Profile.findOne({ userId: targetUserId })

      const matchPercentage = await matchingService.calculateCompatibility(userProfile, targetProfile)

      match = await Match.create({
        user1Id: userId,
        user2Id: targetUserId,
        matchPercentage,
        likedBy: [{ userId }],
      })
    }

    res.json({
      success: true,
      message: match.status === "matched" ? "It's a match!" : "Like sent successfully",
      match: {
        id: match._id,
        status: match.status,
        isMatch: match.status === "matched",
      },
    })
  } catch (error) {
    logger.error("Like user error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while liking user",
    })
  }
}

// Pass on a user
exports.passUser = async (req, res) => {
  try {
    const userId = req.user.id
    const { targetUserId } = req.params

    // Check if match already exists
    let match = await Match.findOne({
      $or: [
        { user1Id: userId, user2Id: targetUserId },
        { user1Id: targetUserId, user2Id: userId },
      ],
    })

    if (match) {
      match.status = "rejected"
    } else {
      // Create new match with rejected status
      match = await Match.create({
        user1Id: userId,
        user2Id: targetUserId,
        status: "rejected",
      })
    }

    await match.save()

    res.json({
      success: true,
      message: "User passed successfully",
    })
  } catch (error) {
    logger.error("Pass user error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while passing user",
    })
  }
}

// Get user's matches
exports.getMatches = async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 20 } = req.query

    const matches = await Match.find({
      $or: [{ user1Id: userId }, { user2Id: userId }],
      status: "matched",
    })
      .populate({
        path: "user1Id user2Id",
        select: "email subscription",
        populate: {
          path: "userId",
          model: "Profile",
          select: "name age photos location profession",
        },
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ matchedAt: -1 })

    // Format matches to show the other user's info
    const formattedMatches = matches.map((match) => {
      const otherUser = match.user1Id._id.toString() === userId ? match.user2Id : match.user1Id
      return {
        matchId: match._id,
        user: otherUser,
        matchPercentage: match.matchPercentage,
        matchedAt: match.matchedAt,
      }
    })

    res.json({
      success: true,
      matches: formattedMatches,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: formattedMatches.length,
      },
    })
  } catch (error) {
    logger.error("Get matches error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while fetching matches",
    })
  }
}

// Unmatch a user
exports.unmatchUser = async (req, res) => {
  try {
    const userId = req.user.id
    const { matchId } = req.params

    const match = await Match.findOne({
      _id: matchId,
      $or: [{ user1Id: userId }, { user2Id: userId }],
      status: "matched",
    })

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      })
    }

    match.status = "rejected"
    match.isActive = false
    await match.save()

    res.json({
      success: true,
      message: "Successfully unmatched",
    })
  } catch (error) {
    logger.error("Unmatch user error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while unmatching",
    })
  }
}
