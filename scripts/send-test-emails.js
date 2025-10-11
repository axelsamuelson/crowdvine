// Script to send test emails for building sender reputation
// Run this daily to improve email deliverability speed

import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const testEmails = [
  'axelrib@hotmail.com',
  'ave.samuelson@gmail.com',
  // Add more test emails here
];

const testEmailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PACT Test Email</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
      line-height: 1.6; 
      color: #000000; 
      margin: 0; 
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #ffffff;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .logo {
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      color: #000000;
      margin-bottom: 20px;
    }
    .content {
      text-align: center;
    }
    .button {
      display: inline-block;
      background-color: #000000;
      color: #ffffff;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">PACT</div>
    <div class="content">
      <h2>Test Email - Sender Reputation Building</h2>
      <p>This is a test email to build sender reputation and improve deliverability speed.</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
      <a href="https://pactwines.com" class="button">Visit PACT</a>
      <p style="font-size: 12px; color: #666; margin-top: 30px;">
        This email helps improve our email deliverability. You can safely ignore it.
      </p>
    </div>
  </div>
</body>
</html>
`;

async function sendTestEmails() {
  console.log('🚀 Starting reputation building emails...');
  
  for (const email of testEmails) {
    try {
      const msg = {
        to: email,
        from: {
          email: 'welcome@pactwines.com',
          name: 'PACT Wines'
        },
        subject: `PACT Test Email - ${new Date().toLocaleDateString()}`,
        html: testEmailTemplate,
        text: `PACT Test Email - ${new Date().toLocaleDateString()}\n\nThis is a test email to build sender reputation.\n\nVisit: https://pactwines.com`,
        headers: {
          'X-Mailer': 'PACT Wines Platform',
          'X-Priority': '3',
        }
      };

      const result = await sgMail.send(msg);
      console.log(`✅ Test email sent to ${email}`);
      console.log(`   Status: ${result[0].statusCode}`);
      
      // Wait 2 seconds between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Failed to send to ${email}:`, error.message);
    }
  }
  
  console.log('🎉 Reputation building emails completed!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sendTestEmails().catch(console.error);
}

export { sendTestEmails };
