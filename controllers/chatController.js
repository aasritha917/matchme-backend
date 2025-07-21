const Chat = require("../models/Chat")
const Message = require("../models/Message")
const Match = require("../models/Match")
const sentimentService = require("../services/sentimentService")
const logger = require("../utils/logger")

// Get user's chats
exports.getChats = async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 20 } = req.query

    const chats = await Chat.find({
      participants: userId,
      isActive: true,
    })
      .populate({
        path: "participants",
        select: "email subscription",
        populate: {
          path: "userId",
          model: "Profile",
          select: "name photos",
        },
      })
      .sort({ lastMessageTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    // Format chats to show other participant info
    const formattedChats = chats.map((chat) => {
      const otherParticipant = chat.participants.find((p) => p._id.toString() !== userId)
      return {
        chatId: chat._id,
        participant: otherParticipant,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        unreadCount: chat.unreadCount.get(userId) || 0,
        isActive: chat.isActive,
      }
    })

    res.json({
      success: true,
      chats: formattedChats,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: formattedChats.length,
      },
    })
  } catch (error) {
    logger.error("Get chats error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while fetching chats",
    })
  }
}

// Get chat messages
exports.getChatMessages = async (req, res) => {
  try {
    const userId = req.user.id
    const { chatId } = req.params
    const { page = 1, limit = 50 } = req.query

    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId,
    })

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      })
    }

    const messages = await Message.find({
      chatId,
      isDeleted: false,
    })
      .populate("senderId", "email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    // Mark messages as read
    await Message.updateMany(
      {
        chatId,
        senderId: { $ne: userId },
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    )

    // Reset unread count for this user
    chat.unreadCount.set(userId, 0)
    await chat.save()

    res.json({
      success: true,
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: messages.length,
      },
    })
  } catch (error) {
    logger.error("Get chat messages error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while fetching messages",
    })
  }
}

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.id
    const { chatId } = req.params
    const { content, messageType = "text" } = req.body

    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId,
    })

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      })
    }

    // Analyze message sentiment
    const sentimentScore = await sentimentService.analyzeSentiment(content)

    // Create message
    const message = await Message.create({
      chatId,
      senderId: userId,
      content,
      messageType,
      sentimentScore,
    })

    // Update chat with last message info
    const otherParticipantId = chat.participants.find((p) => p.toString() !== userId)

    chat.lastMessage = {
      content,
      senderId: userId,
      timestamp: new Date(),
    }
    chat.lastMessageTime = new Date()

    // Increment unread count for other participant
    const currentUnread = chat.unreadCount.get(otherParticipantId.toString()) || 0
    chat.unreadCount.set(otherParticipantId.toString(), currentUnread + 1)

    await chat.save()

    // Populate sender info
    await message.populate("senderId", "email")

    res.json({
      success: true,
      message,
    })
  } catch (error) {
    logger.error("Send message error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while sending message",
    })
  }
}

// Create or get chat
exports.createChat = async (req, res) => {
  try {
    const userId = req.user.id
    const { participantId } = req.body

    // Verify users are matched
    const match = await Match.findOne({
      $or: [
        { user1Id: userId, user2Id: participantId },
        { user1Id: participantId, user2Id: userId },
      ],
      status: "matched",
    })

    if (!match) {
      return res.status(403).json({
        success: false,
        message: "Can only chat with matched users",
      })
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [userId, participantId] },
    })

    if (!chat) {
      // Create new chat
      chat = await Chat.create({
        participants: [userId, participantId],
        unreadCount: new Map([
          [userId, 0],
          [participantId, 0],
        ]),
      })
    }

    await chat.populate({
      path: "participants",
      select: "email subscription",
      populate: {
        path: "userId",
        model: "Profile",
        select: "name photos",
      },
    })

    res.json({
      success: true,
      chat,
    })
  } catch (error) {
    logger.error("Create chat error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while creating chat",
    })
  }
}

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id
    const { messageId } = req.params

    const message = await Message.findOne({
      _id: messageId,
      senderId: userId,
    })

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      })
    }

    message.isDeleted = true
    await message.save()

    res.json({
      success: true,
      message: "Message deleted successfully",
    })
  } catch (error) {
    logger.error("Delete message error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while deleting message",
    })
  }
}
