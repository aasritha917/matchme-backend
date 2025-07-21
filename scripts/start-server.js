const path = require("path")

console.log("🚀 Starting MatchMe Backend Server...")
console.log("📁 Working directory:", process.cwd())
console.log("🔧 Node version:", process.version)
console.log("📦 Environment:", process.env.NODE_ENV || "development")

// Check if required files exist
const fs = require("fs")
const requiredFiles = ["server.js", "src/routes/auth.js", ".env"]

console.log("\n📋 Checking required files...")
requiredFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} - Found`)
  } else {
    console.log(`⚠️  ${file} - Missing`)
  }
})

console.log("\n🔌 Starting server...\n")

// Start the actual server
require("../server.js")
