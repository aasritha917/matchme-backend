const nodemailer = require("nodemailer")

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

// Send password reset email
const sendPasswordResetEmail = async (email, name, resetToken) => {
  try {
    const transporter = createTransporter()

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`

    const mailOptions = {
      from: `"MatchMe Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request - MatchMe",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>We received a request to reset your password for your MatchMe account.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
              <p><strong>This link will expire in 10 minutes.</strong></p>
              <p>If you didn't request this password reset, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2024 MatchMe Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }

    const result = await transporter.sendMail(mailOptions)
    console.log("Password reset email sent:", result.messageId)
    return result
  } catch (error) {
    console.error("Error sending password reset email:", error)
    throw error
  }
}

// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter()

    const mailOptions = {
      from: `"MatchMe Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to MatchMe! 💕",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to MatchMe</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💕 Welcome to MatchMe!</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Welcome to MatchMe - where meaningful connections begin! 🎉</p>
              <p>We're excited to have you join our community of amazing people looking for love and companionship.</p>
              <p>Here's what you can do next:</p>
              <ul>
                <li>✨ Complete your profile</li>
                <li>📸 Upload your best photos</li>
                <li>💫 Start discovering amazing matches</li>
                <li>💬 Begin meaningful conversations</li>
              </ul>
              <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard" class="button">Complete Your Profile</a>
              <p>Happy matching! 💕</p>
            </div>
            <div class="footer">
              <p>© 2024 MatchMe Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }

    const result = await transporter.sendMail(mailOptions)
    console.log("Welcome email sent:", result.messageId)
    return result
  } catch (error) {
    console.error("Error sending welcome email:", error)
    throw error
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
}
