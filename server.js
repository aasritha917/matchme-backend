const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")
const http = require("http")
const socketIo = require("socket.io")
const connectDB = require("./utils/database")

// Load environment variables first
dotenv.config()

console.log(
  "[dotenv@17.2.0] injecting env (13) from .env (tip: ⚙️  load multiple .env files with { path: ['.env.local', '.env'] })",
)

// Connect to MongoDB
connectDB()

const app = express()
const server = http.createServer(app)

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  })
})

// Import and use routes
try {
  const authRoutes = require("./routes/auth")
  app.use("/api/auth", authRoutes)
  console.log("✅ Auth routes loaded")
} catch (error) {
  console.error("⚠️  Auth routes not available:", error.message)
}

try {
  const userRoutes = require("./routes/users")
  app.use("/api/users", userRoutes)
  console.log("✅ User routes loaded")
} catch (error) {
  console.error("⚠️  User routes not available:", error.message)
}

try {
  const profileRoutes = require("./routes/profiles")
  app.use("/api/profiles", profileRoutes)
  console.log("✅ Profile routes loaded")
} catch (error) {
  console.error("⚠️  Profile routes not available:", error.message)
}

try {
  const matchRoutes = require("./routes/matches")
  app.use("/api/matches", matchRoutes)
  console.log("✅ Match routes loaded")
} catch (error) {
  console.error("⚠️  Match routes not available:", error.message)
}

try {
  const chatRoutes = require("./routes/chats")
  app.use("/api/chat", chatRoutes)
  console.log("✅ Chat routes loaded")
} catch (error) {
  console.error("⚠️  Chat routes not available:", error.message)
}

// Socket.IO handlers
try {
  const socketHandler = require("./socket/socketHandler")
  const chatHandler = require("./socket/chatHandler")

  io.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.id}`)

    // Initialize handlers
    socketHandler(io, socket)
    chatHandler(io, socket)

    socket.on("disconnect", () => {
      console.log(`🔌 User disconnected: ${socket.id}`)
    })
  })

  console.log("✅ Socket.IO handlers loaded")
} catch (error) {
  console.error("⚠️  Socket.IO handlers not available:", error.message)
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack)
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  })
})

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`🌐 Health check: http://localhost:${PORT}/health`)
  console.log(`🔌 Socket.IO ready for connections`)
  console.log(`📡 API base URL: http://localhost:${PORT}/api`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`)
})

module.exports = { app, server, io }
