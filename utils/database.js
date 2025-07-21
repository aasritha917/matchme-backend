const mongoose = require("mongoose")

const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...")
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/MatchMe"
    console.log("MongoDB URI:", MONGODB_URI)

    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error("MongoDB connection error:", error)
    process.exit(1)
  }
}

module.exports = connectDB
