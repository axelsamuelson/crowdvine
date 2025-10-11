// Email templates for the access request system
// Centralized location for all email templates to avoid duplication

export function getAccessApprovalEmailTemplate(signupUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to PACT</title>
        <!-- Pre-header text for better email client preview -->
        <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
          Your access to PACT has been approved. Complete your registration now.
        </div>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, Arial, sans-serif; 
            line-height: 1.6; 
            color: #000000; 
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
          }
          .logo-section {
            text-align: center;
            padding: 40px 20px 20px;
            background-color: #ffffff;
          }
          .logo {
            width: 120px;
            height: auto;
          }
          .header { 
            background-color: #ffffff; 
            color: #000000; 
            padding: 20px 30px 30px; 
            text-align: center; 
          }
          .header h1 {
            font-size: 28px;
            font-weight: 300;
            margin: 0 0 10px 0;
            letter-spacing: -0.5px;
          }
          .header p {
            font-size: 16px;
            color: #6B7280;
            margin: 0;
            font-weight: 400;
          }
          .content { 
            background-color: #ffffff; 
            padding: 20px 30px 40px;
            color: #000000;
          }
          .content p {
            font-size: 15px;
            line-height: 1.7;
            margin: 0 0 20px 0;
            color: #000000;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .button { 
            display: inline-block; 
            background-color: #000000; 
            color: #ffffff !important; 
            padding: 14px 32px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: 500;
            font-size: 15px;
            letter-spacing: 0.3px;
          }
          .button:hover {
            background-color: #1a1a1a;
          }
          .note {
            font-size: 13px;
            color: #6B7280;
            margin: 20px 0;
            padding: 15px;
            background-color: #f9fafb;
            border-left: 3px solid #E5E7EB;
          }
          .footer { 
            text-align: center; 
            padding: 30px 30px 40px;
            color: #6B7280; 
            font-size: 13px;
            background-color: #ffffff;
            border-top: 1px solid #E5E7EB;
          }
          .footer p {
            margin: 5px 0;
          }
          .tagline {
            font-style: italic;
            font-weight: 400;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-section">
            <svg class="logo" width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <text x="0" y="30" font-family="Inter, -apple-system, sans-serif" font-size="32" font-weight="300" fill="#000000">PACT</text>
            </svg>
          </div>
          
          <div class="header">
            <h1>Welcome to PACT</h1>
            <p>Your Access Has Been Approved</p>
          </div>
          
          <div class="content">
            <p>Hello,</p>
            
            <p>We're pleased to inform you that your request to join PACT has been approved. You're now invited to be part of an exclusive community connecting quality wine producers directly with discerning consumers.</p>
            
            <p>PACT is built on the principle of bringing together those who create exceptional wines and those who appreciate them. Our curated platform facilitates direct relationships, shared experiences, and access to wines you won't find elsewhere.</p>
            
            <div class="button-container">
              <a href="${signupUrl}" class="button">Complete Registration</a>
            </div>
            
            <div class="note">
              <strong>Important:</strong> This registration link is unique to you and will expire in 7 days for security reasons.
            </div>
            
            <p>If you have any questions, please don't hesitate to reach out.</p>
            
            <p>Welcome to the community.</p>
          </div>
          
          <div class="footer">
            <p class="tagline">Producers And Consumers Together</p>
            <p style="margin-top: 20px;">This email was sent because you requested access to PACT.</p>
            <p>If you didn't make this request, please ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getAccessApprovalEmailText(signupUrl: string): string {
  return `
Welcome to PACT

Your Access Has Been Approved

Hello,

We're pleased to inform you that your request to join PACT has been approved. You're now invited to be part of an exclusive community connecting quality wine producers directly with discerning consumers.

PACT is built on the principle of bringing together those who create exceptional wines and those who appreciate them. Our curated platform facilitates direct relationships, shared experiences, and access to wines you won't find elsewhere.

Complete your registration by clicking this link:
${signupUrl}

Important: This registration link is unique to you and will expire in 7 days for security reasons.

If you have any questions, please don't hesitate to reach out.

Welcome to the community.

---
Producers And Consumers Together

This email was sent because you requested access to PACT.
If you didn't make this request, please ignore this email.
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
