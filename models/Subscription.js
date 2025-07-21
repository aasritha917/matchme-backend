const mongoose = require("mongoose")

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    planType: {
      type: String,
      enum: ["1-month", "3-months", "6-months"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "expired"],
      default: "active",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    paymentIntentId: {
      type: String,
      required: true,
    },
    cancelledAt: Date,
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Subscription", subscriptionSchema)
