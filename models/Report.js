const mongoose = require("mongoose")

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      enum: ["inappropriate-behavior", "fake-profile", "spam", "harassment", "other"],
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
    },
    adminAction: {
      actionType: {
        type: String,
        enum: ["warning", "temporary-ban", "permanent-ban", "profile-removal", "no-action"],
      },
      actionDate: Date,
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      notes: String,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Report", reportSchema)
