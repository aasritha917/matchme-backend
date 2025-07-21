const { spawn } = require("child_process")
const path = require("path")

console.log("🚀 Starting MatchMe Backend Development Server...\n")

// Start the server with nodemon for auto-restart
const server = spawn("node", ["server.js"], {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "development",
  },
})

server.on("close", (code) => {
  console.log(`\n❌ Server process exited with code ${code}`)
})

server.on("error", (err) => {
  console.error("❌ Failed to start server:", err)
})

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server...")
  server.kill("SIGINT")
  process.exit(0)
})
