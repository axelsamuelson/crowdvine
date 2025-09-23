import nodemailer from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface AccessApprovalEmailData {
  email: string;
  signupUrl: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    };

    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.warn("Email service not configured - SMTP credentials missing");
      return;
    }

    this.transporter = nodemailer.createTransporter(emailConfig);
  }

  async sendAccessApprovalEmail(
    data: AccessApprovalEmailData,
  ): Promise<boolean> {
    if (!this.transporter) {
      console.error("Email service not configured");
      return false;
    }

    const { email, signupUrl } = data;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "🎉 Welcome to CrowdVine - Your Access Has Been Approved!",
      html: this.getAccessApprovalEmailTemplate(signupUrl),
      text: this.getAccessApprovalEmailText(signupUrl),
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log("Access approval email sent:", result.messageId);
      return true;
    } catch (error) {
      console.error("Failed to send access approval email:", error);
      return false;
    }
  }

  private getAccessApprovalEmailTemplate(signupUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to CrowdVine</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍷 Welcome to CrowdVine!</h1>
              <p>Your access request has been approved</p>
            </div>
            <div class="content">
              <h2>Congratulations!</h2>
              <p>We're excited to welcome you to CrowdVine, the exclusive wine community where quality meets community.</p>
              
              <p>Your access request has been approved, and you're now ready to join our curated platform featuring:</p>
              <ul>
                <li>🎯 Exclusive wines from boutique producers</li>
                <li>📦 Pallet-sharing system for premium accessibility</li>
                <li>👥 Community of wine enthusiasts and collectors</li>
                <li>🍾 Limited releases and rare vintages</li>
              </ul>
              
              <p>Click the button below to complete your registration and start exploring:</p>
              
              <div style="text-align: center;">
                <a href="${signupUrl}" class="button">Complete Registration</a>
              </div>
              
              <p><strong>Important:</strong> This link is unique to you and will expire in 7 days for security reasons.</p>
              
              <p>If you have any questions, feel free to reach out to our support team.</p>
              
              <p>Welcome to the community!</p>
              <p><strong>The CrowdVine Team</strong></p>
            </div>
            <div class="footer">
              <p>This email was sent because you requested access to CrowdVine.</p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getAccessApprovalEmailText(signupUrl: string): string {
    return `
Welcome to CrowdVine!

Your access request has been approved!

We're excited to welcome you to CrowdVine, the exclusive wine community where quality meets community.

Your access request has been approved, and you're now ready to join our curated platform featuring:
- Exclusive wines from boutique producers
- Pallet-sharing system for premium accessibility  
- Community of wine enthusiasts and collectors
- Limited releases and rare vintages

Complete your registration by clicking this link:
${signupUrl}

Important: This link is unique to you and will expire in 7 days for security reasons.

If you have any questions, feel free to reach out to our support team.

Welcome to the community!
The CrowdVine Team

---
This email was sent because you requested access to CrowdVine.
If you didn't request this, please ignore this email.
    `;
  }
}

export const emailService = new EmailService();
