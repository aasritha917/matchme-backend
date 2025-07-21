const express = require("express")
const matchController = require("../controllers/matchController")
const auth = require("../middleware/auth")

const router = express.Router()

// All routes require authentication
router.use(auth)

router.get("/potential", matchController.getPotentialMatches)
router.post("/like/:targetUserId", matchController.likeUser)
router.post("/pass/:targetUserId", matchController.passUser)
router.get("/", matchController.getMatches)
router.delete("/:matchId", matchController.unmatchUser)

module.exports = router
