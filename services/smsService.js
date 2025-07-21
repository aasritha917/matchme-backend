const twilio = require("twilio")
const logger = require("../utils/logger")

class SMSService {
  constructor() {
    this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  }

  async sendOTP(phone, otp) {
    try {
      await this.client.messages.create({
        body: `Your MatchMe verification code is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      })

      logger.info(`OTP sent to ${phone}`)
    } catch (error) {
      logger.error("Send OTP error:", error)
      throw error
    }
  }

  async sendMatchNotification(phone, matchName) {
    try {
      await this.client.messages.create({
        body: `🎉 It's a match! You and ${matchName} liked each other on MatchMe!`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      })

      logger.info(`Match notification sent to ${phone}`)
    } catch (error) {
      logger.error("Send match notification error:", error)
    }
  }
}

module.exports = new SMSService()
