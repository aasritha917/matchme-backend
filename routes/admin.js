const express = require("express")
const adminController = require("../controllers/adminController")
const auth = require("../middleware/auth")
const adminAuth = require("../middleware/adminAuth")

const router = express.Router()

// All routes require authentication and admin role
router.use(auth)
router.use(adminAuth)

router.get("/stats", adminController.getDashboardStats)
router.get("/users", adminController.getUsers)
router.get("/reports", adminController.getReports)
router.post("/reports/:reportId/action", adminController.handleReportAction)
router.post("/users/:userId/ban", adminController.banUser)
router.post("/users/:userId/unban", adminController.unbanUser)
router.get("/analytics", adminController.getAnalytics)

module.exports = router
