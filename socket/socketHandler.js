const jwt = require("jsonwebtoken")
const User = require("../models/User")
const chatHandler = require("./chatHandler")

const connectedUsers = new Map()

const socketHandler = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error("No token provided"))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
      const user = await User.findById(decoded.id)

      if (!user) {
        return next(new Error("User not found"))
      }

      socket.userId = user._id.toString()
      socket.user = user
      next()
    } catch (err) {
      console.error("Socket authentication error:", err)
      next(new Error("Authentication error"))
    }
  })

  io.on("connection", async (socket) => {
    console.log(`👤 User ${socket.user.name} connected (${socket.id})`)

    // Set user online in database
    await User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      lastActive: new Date(),
    })

    // Add user to connected users
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      user: {
        id: socket.user._id,
        name: socket.user.name,
        avatar: socket.user.avatar,
      },
      lastSeen: new Date(),
    })

    // Broadcast online users to all clients
    const onlineUsers = Array.from(connectedUsers.values()).map((u) => u.user)
    io.emit("onlineUsers", onlineUsers)

    // Join user to their personal room
    socket.join(`user_${socket.userId}`)

    // Handle chat events
    chatHandler(socket, io, connectedUsers)

    // Handle profile updates
    socket.on("profileUpdated", async (data) => {
      try {
        // Broadcast profile update to all connected clients
        socket.broadcast.emit("userProfileUpdated", {
          userId: socket.userId,
          updates: data,
        })
      } catch (error) {
        console.error("Profile update broadcast error:", error)
      }
    })

    // Handle typing in profile/bio
    socket.on("typing", (data) => {
      socket.broadcast.emit("userTyping", {
        userId: socket.userId,
        isTyping: data.isTyping,
        location: data.location, // e.g., 'bio', 'chat', etc.
      })
    })

    // Handle user activity updates
    socket.on("userActivity", async (activity) => {
      try {
        await User.findByIdAndUpdate(socket.userId, {
          lastActive: new Date(),
        })

        // Broadcast activity to relevant users
        socket.broadcast.emit("userActivityUpdate", {
          userId: socket.userId,
          activity: activity,
          timestamp: new Date(),
        })
      } catch (error) {
        console.error("User activity update error:", error)
      }
    })

    // Handle disconnection
    socket.on("disconnect", async () => {
      console.log(`👤 User ${socket.user.name} disconnected`)

      try {
        // Set user offline in database
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastActive: new Date(),
        })

        // Remove from connected users
        connectedUsers.delete(socket.userId)

        // Broadcast updated online users
        const onlineUsers = Array.from(connectedUsers.values()).map((u) => u.user)
        io.emit("onlineUsers", onlineUsers)
      } catch (error) {
        console.error("Disconnect cleanup error:", error)
      }
    })

    // Handle errors
    socket.on("error", (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error)
    })
  })

  // Handle server errors
  io.on("error", (error) => {
    console.error("Socket.IO server error:", error)
  })
}

module.exports = socketHandler
