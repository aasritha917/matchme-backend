const Message = require("../models/Message")
const Chat = require("../models/Chat")

const chatHandler = (socket, io, connectedUsers) => {
  // Join a chat room
  socket.on("joinChat", async (chatId) => {
    socket.join(chatId)
    console.log(`User ${socket.user.name} joined chat ${chatId}`)
  })

  // Handle sending messages
  socket.on("sendMessage", async (data) => {
    try {
      const { chatId, content } = data

      // Create new message
      const message = new Message({
        chatId,
        senderId: socket.userId,
        content,
        timestamp: new Date(),
      })

      await message.save()

      // Populate sender info
      await message.populate("senderId", "name avatar")

      // Update chat's last message
      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: content,
        lastMessageTime: new Date(),
        $addToSet: { participants: socket.userId },
      })

      // Emit message to all users in the chat room
      io.to(chatId).emit("newMessage", {
        id: message._id,
        chatId: message.chatId,
        senderId: message.senderId._id,
        senderName: message.senderId.name,
        senderAvatar: message.senderId.avatar,
        content: message.content,
        timestamp: message.timestamp,
        isOwn: false, // Will be determined on client side
      })
    } catch (error) {
      console.error("Error sending message:", error)
      socket.emit("messageError", { error: "Failed to send message" })
    }
  })

  // Handle typing indicators
  socket.on("typing", (data) => {
    const { chatId, isTyping } = data
    socket.to(chatId).emit("userTyping", {
      userId: socket.userId,
      userName: socket.user.name,
      isTyping,
    })
  })

  // Handle message read receipts
  socket.on("markAsRead", async (data) => {
    try {
      const { chatId, messageId } = data

      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { readBy: socket.userId },
      })

      socket.to(chatId).emit("messageRead", {
        messageId,
        readBy: socket.userId,
      })
    } catch (error) {
      console.error("Error marking message as read:", error)
    }
  })

  // Handle getting chat history
  socket.on("getChatHistory", async (data) => {
    try {
      const { chatId, page = 1, limit = 50 } = data

      const messages = await Message.find({ chatId })
        .populate("senderId", "name avatar")
        .sort({ timestamp: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)

      socket.emit("chatHistory", {
        chatId,
        messages: messages.reverse().map((msg) => ({
          id: msg._id,
          chatId: msg.chatId,
          senderId: msg.senderId._id,
          senderName: msg.senderId.name,
          senderAvatar: msg.senderId.avatar,
          content: msg.content,
          timestamp: msg.timestamp,
          readBy: msg.readBy,
        })),
      })
    } catch (error) {
      console.error("Error getting chat history:", error)
      socket.emit("chatHistoryError", { error: "Failed to load chat history" })
    }
  })
}

module.exports = chatHandler
