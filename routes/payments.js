const express = require("express")
const paymentController = require("../controllers/paymentController")
const auth = require("../middleware/auth")

const router = express.Router()

// All routes require authentication
router.use(auth)

router.post("/create-payment-intent", paymentController.createPaymentIntent)
router.post("/payment-success", paymentController.handlePaymentSuccess)
router.get("/subscription-status", paymentController.getSubscriptionStatus)
router.post("/cancel-subscription", paymentController.cancelSubscription)

module.exports = router
