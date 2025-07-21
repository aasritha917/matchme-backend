const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "emoji"],
      default: "text",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Index for efficient chat queries
messageSchema.index({ chatId: 1, createdAt: -1 })

module.exports = mongoose.model("Message", messageSchema)
