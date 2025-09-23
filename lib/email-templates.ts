// Email templates for the access request system
// Centralized location for all email templates to avoid duplication

export function getAccessApprovalEmailTemplate(signupUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to PACT Wines</title>
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
            <h1>🍷 Welcome to PACT Wines!</h1>
            <p>Your access request has been approved</p>
          </div>
          <div class="content">
            <h2>Congratulations!</h2>
            <p>We're excited to welcome you to PACT Wines, the exclusive wine community where quality meets community.</p>
            
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
            <p><strong>The PACT Wines Team</strong></p>
          </div>
          <div class="footer">
            <p>This email was sent because you requested access to PACT Wines.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getAccessApprovalEmailText(signupUrl: string): string {
  return `
Welcome to PACT Wines!

Your access request has been approved!

We're excited to welcome you to PACT Wines, the exclusive wine community where quality meets community.

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
The PACT Wines Team

---
This email was sent because you requested access to PACT Wines.
If you didn't request this, please ignore this email.
  `;
}

export function getWelcomeEmailTemplate(data: {
  customerEmail: string;
  customerName: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to CrowdVine</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
          .content { padding: 30px; }
          .feature { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍷 Welcome to CrowdVine!</h1>
            <p>Your journey into premium wines begins now</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.customerName}!</h2>
            
            <p>Welcome to CrowdVine, the exclusive wine community where quality meets community. We're thrilled to have you join our curated platform!</p>

            <div class="feature">
              <h3>🎯 What You Can Explore</h3>
              <ul>
                <li><strong>Exclusive Wines:</strong> Curated selections from boutique producers worldwide</li>
                <li><strong>Pallet Sharing:</strong> Access premium wines through our innovative sharing system</li>
                <li><strong>Community:</strong> Connect with fellow wine enthusiasts and collectors</li>
                <li><strong>Limited Releases:</strong> Get early access to rare vintages and new releases</li>
              </ul>
            </div>

            <div class="feature">
              <h3>🍾 Getting Started</h3>
              <p>Start by browsing our current collections and discover wines that match your taste preferences. Our pallet-sharing system makes premium wines accessible while building connections with like-minded enthusiasts.</p>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://pactwines.com"}/shop" class="button">
                Start Exploring Wines
              </a>
            </div>

            <p>If you have any questions or need assistance, our support team is here to help. We're committed to making your wine journey exceptional.</p>
            
            <p>Welcome to the community!</p>
            <p><strong>The CrowdVine Team</strong></p>
          </div>
          
          <div class="footer">
            <p>Welcome to CrowdVine - Premium Wine Community</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getWelcomeEmailText(data: {
  customerEmail: string;
  customerName: string;
}): string {
  return `
Welcome to CrowdVine!

Hello ${data.customerName}!

Welcome to CrowdVine, the exclusive wine community where quality meets community. We're thrilled to have you join our curated platform!

What You Can Explore:
- Exclusive Wines: Curated selections from boutique producers worldwide
- Pallet Sharing: Access premium wines through our innovative sharing system
- Community: Connect with fellow wine enthusiasts and collectors
- Limited Releases: Get early access to rare vintages and new releases

Getting Started:
Start by browsing our current collections and discover wines that match your taste preferences. Our pallet-sharing system makes premium wines accessible while building connections with like-minded enthusiasts.

Visit our shop: ${process.env.NEXT_PUBLIC_APP_URL || "https://pactwines.com"}/shop

If you have any questions or need assistance, our support team is here to help. We're committed to making your wine journey exceptional.

Welcome to the community!

The CrowdVine Team

---
Welcome to CrowdVine - Premium Wine Community
If you have any questions, please contact our support team.
  `;
}
