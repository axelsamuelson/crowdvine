import sgMail from "@sendgrid/mail";
import {
  getWelcomeEmailTemplate,
  getWelcomeEmailText,
} from "./email-templates";
import { getSiteContentByKey } from "./actions/content";

// Cache for logo to avoid repeated database calls
let logoCache: { value: string | null; timestamp: number } | null = null;
const LOGO_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getLogoForEmail(): Promise<string | null> {
  // Check cache first
  if (logoCache && Date.now() - logoCache.timestamp < LOGO_CACHE_DURATION) {
    return logoCache.value;
  }

  try {
    const logoUrl = await getSiteContentByKey("header_logo");
    
    // Update cache
    logoCache = {
      value: logoUrl,
      timestamp: Date.now(),
    };

    return logoUrl;
  } catch (error) {
    console.error("Error fetching logo for email:", error);
    return null;
  }
}

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

interface OrderConfirmationData {
  customerEmail: string;
  customerName: string;
  orderId: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

interface WelcomeEmailData {
  customerEmail: string;
  customerName: string;
}

class SendGridService {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@pactwines.com";
    this.fromName = process.env.SENDGRID_FROM_NAME || "CrowdVine";
  }

  async sendEmail(data: EmailData): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.error("❌ SENDGRID ERROR: API key not configured!");
      console.error("Please set SENDGRID_API_KEY in Vercel environment variables.");
      console.error("For development, you can set it in .env.local file.");
      return false;
    }

    const msg = {
      to: data.to,
      from: {
        email: data.from || this.fromEmail,
        name: this.fromName,
      },
      subject: data.subject,
      html: data.html,
      text: data.text || this.stripHtml(data.html),
      // Add headers for better deliverability
      headers: {
        'X-Mailer': 'PACT Wines Platform',
        'X-Priority': '1', // High priority
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        'List-Unsubscribe': '<mailto:unsubscribe@pactwines.com>',
        'X-Mailgun-Tag': 'approval-email',
        'X-Custom-Header': 'urgent-delivery',
      },
      // Add tracking settings
      trackingSettings: {
        clickTracking: {
          enable: true,
          enableText: false
        },
        openTracking: {
          enable: true,
          substitutionTag: '%open-track%'
        }
      },
      // Add spam score reduction
      mailSettings: {
        spamCheck: {
          enable: true,
          threshold: 3, // Lower threshold for better delivery
          postToUrl: 'https://pactwines.com/api/spam-webhook'
        },
        footer: {
          enable: false
        },
        sandboxMode: {
          enable: false // Make sure sandbox mode is off
        }
      },
      // Add categories for better routing
      categories: ['approval-email', 'urgent', 'hotmail-optimized']
    };

    console.log("📧 Attempting to send email via SendGrid:", {
      to: data.to,
      from: msg.from,
      subject: data.subject,
      hasApiKey: !!process.env.SENDGRID_API_KEY,
      apiKeyLength: process.env.SENDGRID_API_KEY?.length,
    });

    try {
      const result = await sgMail.send(msg);
      console.log(`✅ Email sent successfully to ${data.to}`);
      console.log("SendGrid response:", result);
      return true;
    } catch (error: any) {
      console.error("❌ SendGrid error:", error);
      if (error.response) {
        console.error("SendGrid response status:", error.response?.status);
        console.error("SendGrid response body:", JSON.stringify(error.response?.body, null, 2));
      }
      if (error.message) {
        console.error("SendGrid error message:", error.message);
      }
      return false;
    }
  }

  async sendOrderConfirmation(data: OrderConfirmationData): Promise<boolean> {
    const html = await this.getOrderConfirmationTemplate(data);
    const text = this.getOrderConfirmationText(data);

    return this.sendEmail({
      to: data.customerEmail,
      subject: `Order Confirmation - ${data.orderId}`,
      html,
      text,
    });
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const html = await getWelcomeEmailTemplate(data);
    const text = await getWelcomeEmailText(data);

    return this.sendEmail({
      to: data.customerEmail,
      subject: "Welcome to PACT",
      html,
      text,
    });
  }

  private async getOrderConfirmationTemplate(data: OrderConfirmationData): Promise<string> {
    const logoUrl = await getLogoForEmail();
    
    const logoHtml = logoUrl 
      ? `<img src="${logoUrl}" alt="PACT" style="width: 120px; height: auto; max-width: 200px;" />`
      : `<div style="font-size: 24px; font-weight: bold; color: #000000; letter-spacing: 2px;">PACT</div>`;
    const itemsHtml = data.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #eee;">
          <div style="display: flex; align-items: center;">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">` : ""}
            <div>
              <h4 style="margin: 0 0 5px 0; color: #333;">${item.name}</h4>
              <p style="margin: 0; color: #666; font-size: 14px;">Quantity: ${item.quantity}</p>
            </div>
          </div>
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">
          ${item.price.toFixed(2)} SEK
        </td>
      </tr>
    `,
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
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
              max-width: 200px;
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
            }
            .content { 
              padding: 30px; 
              background-color: #ffffff;
            }
            .order-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .total-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .shipping-info { background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { 
              background-color: #f9fafb; 
              padding: 30px; 
              text-align: center; 
              font-size: 14px; 
              color: #6B7280; 
              border-top: 1px solid #e5e7eb;
            }
            .button { 
              display: inline-block; 
              background-color: #000000; 
              color: #ffffff; 
              padding: 14px 28px; 
              text-decoration: none; 
              border-radius: 4px; 
              margin: 20px 0; 
              font-weight: 500;
              font-size: 16px;
            }
            .button:hover {
              background-color: #1f2937;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo-section">
              ${logoHtml}
            </div>
            
            <div class="header">
              <h1>Order Confirmation</h1>
              <p>Thank you for your order!</p>
            </div>
            
            <div class="content">
              <div class="order-info">
                <h2>Order Details</h2>
                <p><strong>Order ID:</strong> ${data.orderId}</p>
                <p><strong>Order Date:</strong> ${data.orderDate}</p>
                <p><strong>Customer:</strong> ${data.customerName}</p>
              </div>

              <h3>Items Ordered</h3>
              <table class="items-table">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="padding: 15px; text-align: left;">Item</th>
                    <th style="padding: 15px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div class="total-section">
                <h3>Order Summary</h3>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span>Subtotal:</span>
                  <span>${data.subtotal.toFixed(2)} SEK</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span>Tax:</span>
                  <span>${data.tax.toFixed(2)} SEK</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span>Shipping:</span>
                  <span>${data.shipping.toFixed(2)} SEK</span>
                </div>
                <hr style="margin: 15px 0;">
                <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 18px; font-weight: bold;">
                  <span>Total:</span>
                  <span>${data.total.toFixed(2)} SEK</span>
                </div>
              </div>

              <div class="shipping-info">
                <h3>Shipping Address</h3>
                <p>${data.shippingAddress.name}<br>
                ${data.shippingAddress.street}<br>
                ${data.shippingAddress.postalCode} ${data.shippingAddress.city}<br>
                ${data.shippingAddress.country}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://pactwines.com"}/profile/reservations" class="button">
                  View Your Reservations
                </a>
              </div>

              <p>We'll send you another email when your order ships. If you have any questions, please don't hesitate to contact us.</p>
              
              <p>Thank you for choosing PACT!</p>
              <p><strong>The PACT Team</strong></p>
            </div>
            
            <div class="footer">
              <p>This email was sent regarding your order ${data.orderId}.</p>
              <p>Producers And Consumers Together</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getOrderConfirmationText(data: OrderConfirmationData): string {
    const itemsText = data.items
      .map(
        (item) =>
          `${item.name} (Qty: ${item.quantity}) - ${item.price.toFixed(2)} SEK`,
      )
      .join("\n");

    return `
Order Confirmation - ${data.orderId}

Dear ${data.customerName},

Thank you for your order! Here are the details:

Order ID: ${data.orderId}
Order Date: ${data.orderDate}

Items Ordered:
${itemsText}

Order Summary:
Subtotal: ${data.subtotal.toFixed(2)} SEK
Tax: ${data.tax.toFixed(2)} SEK
Shipping: ${data.shipping.toFixed(2)} SEK
Total: ${data.total.toFixed(2)} SEK

Shipping Address:
${data.shippingAddress.name}
${data.shippingAddress.street}
${data.shippingAddress.postalCode} ${data.shippingAddress.city}
${data.shippingAddress.country}

We'll send you another email when your order ships. If you have any questions, please don't hesitate to contact us.

Thank you for choosing PACT!

The PACT Team

---
This email was sent regarding your order ${data.orderId}.
Producers And Consumers Together
    `;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

export const sendGridService = new SendGridService();
