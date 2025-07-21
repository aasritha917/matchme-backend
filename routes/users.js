const express = require("express")
const userController = require("../controllers/userController")
const auth = require("../middleware/auth")

const router = express.Router()

// All routes require authentication
router.use(auth)

router.get("/me", userController.getMe)
router.put("/me", userController.updateMe)
router.delete("/me", userController.deleteAccount)
router.post("/change-password", userController.changePassword)
router.post("/report", userController.reportUser)

module.exports = router
