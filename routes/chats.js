const express = require("express")
const chatController = require("../controllers/chatController")
const auth = require("../middleware/auth")

const router = express.Router()

// All routes require authentication
router.use(auth)

router.get("/", chatController.getChats)
router.post("/", chatController.createChat)
router.get("/:chatId/messages", chatController.getChatMessages)
router.post("/:chatId/messages", chatController.sendMessage)
router.delete("/messages/:messageId", chatController.deleteMessage)

module.exports = router
