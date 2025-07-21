const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const User = require("../models/User")
const Subscription = require("../models/Subscription")
const logger = require("../utils/logger")

// Create payment intent
exports.createPaymentIntent = async (req, res) => {
  try {
    const userId = req.user.id
    const { planType, amount } = req.body

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: "usd",
      metadata: {
        userId,
        planType,
      },
    })

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    logger.error("Create payment intent error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create payment intent",
    })
  }
}

// Handle successful payment
exports.handlePaymentSuccess = async (req, res) => {
  try {
    const { paymentIntentId } = req.body

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status === "succeeded") {
      const { userId, planType } = paymentIntent.metadata

      // Update user subscription
      await User.findByIdAndUpdate(userId, {
        subscription: "premium",
      })

      // Create subscription record
      const expiryDate = new Date()
      if (planType === "1-month") {
        expiryDate.setMonth(expiryDate.getMonth() + 1)
      } else if (planType === "3-months") {
        expiryDate.setMonth(expiryDate.getMonth() + 3)
      } else if (planType === "6-months") {
        expiryDate.setMonth(expiryDate.getMonth() + 6)
      }

      await Subscription.create({
        userId,
        planType,
        status: "active",
        startDate: new Date(),
        endDate: expiryDate,
        paymentIntentId,
      })

      res.json({
        success: true,
        message: "Payment successful, subscription activated",
      })
    } else {
      res.status(400).json({
        success: false,
        message: "Payment not completed",
      })
    }
  } catch (error) {
    logger.error("Handle payment success error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to process payment",
    })
  }
}

// Get subscription status
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.id

    const subscription = await Subscription.findOne({
      userId,
      status: "active",
      endDate: { $gt: new Date() },
    })

    res.json({
      success: true,
      subscription: subscription || null,
      isPremium: !!subscription,
    })
  } catch (error) {
    logger.error("Get subscription status error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get subscription status",
    })
  }
}

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id

    await Subscription.findOneAndUpdate({ userId, status: "active" }, { status: "cancelled", cancelledAt: new Date() })

    res.json({
      success: true,
      message: "Subscription cancelled successfully",
    })
  } catch (error) {
    logger.error("Cancel subscription error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to cancel subscription",
    })
  }
}
