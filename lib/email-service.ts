// Test email service som använder Ethereal Email (gratis för utveckling)
// Gå till https://ethereal.email/create för att få test-credentials

import { createTransport } from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface ReservationEmailData {
  reservationId: string;
  trackingCode?: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    wineName: string;
    vintage: string;
    quantity: number;
    price: string;
  }>;
  totalAmount: string;
  address: {
    street: string;
    postcode: string;
    city: string;
    countryCode: string;
  };
  createdAt: string;
}

interface Transporter {
  sendMail: (options: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }) => Promise<any>;
}

class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    // För utveckling, använd Ethereal Email eller Gmail
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "test@ethereal.email",
        pass: process.env.SMTP_PASS || "test-password",
      },
    };

    this.transporter = createTransport(emailConfig);
  }

  async sendReservationConfirmation(
    data: ReservationEmailData,
  ): Promise<boolean> {
    try {
      // För utveckling, logga email-innehållet istället för att skicka
      if (
        !process.env.SMTP_USER ||
        process.env.SMTP_USER === "your-email@gmail.com"
      ) {
        // Email would be sent in production
        return true;
      }

      const itemsList = data.items
        .map(
          (item) =>
            `• ${item.wineName} ${item.vintage} - ${item.quantity} st - ${item.price} SEK`,
        )
        .join("\n");

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #2c3e50; margin: 0;">🍷 CrowdVine</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0;">Din vinreservation är bekräftad</p>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <h2 style="color: #2c3e50; margin-top: 0;">Hej ${data.customerName}!</h2>
            
            <p>Tack för din reservation hos CrowdVine. Din order har mottagits och behandlas nu.</p>
            
            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">📋 Reservationsdetaljer</h3>
              <p><strong>Reservations-ID:</strong> ${data.reservationId}</p>
              ${data.trackingCode ? `<p><strong>Tracking-kod:</strong> <span style="font-family: monospace; font-weight: bold; color: #e74c3c;">${data.trackingCode}</span></p>` : ""}
              <p><strong>Datum:</strong> ${new Date(data.createdAt).toLocaleDateString("sv-SE")}</p>
              <p><strong>Status:</strong> <span style="color: #27ae60; font-weight: bold;">Placerad</span></p>
            </div>
            
            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">🍷 Beställda viner</h3>
              <div style="font-family: monospace; background-color: white; padding: 15px; border-radius: 4px;">
                ${itemsList}
              </div>
              <p style="text-align: right; font-weight: bold; margin-top: 15px;">
                Totalt: ${data.totalAmount} SEK
              </p>
            </div>
            
            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">📍 Leveransadress</h3>
              <p>${data.address.street}</p>
              <p>${data.address.postcode} ${data.address.city}</p>
              <p>${data.address.countryCode}</p>
            </div>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3 style="color: #856404; margin-top: 0;">ℹ️ Viktig information</h3>
              <ul style="color: #856404;">
                <li>Ingen betalning har debiterats ännu</li>
                <li>Vi debiterar endast när en pall bildas</li>
                <li>Du kan avbryta reservationen när som helst före pall-bildning</li>
                <li>Vi meddelar dig via email när din pall är redo</li>
              </ul>
            </div>
            
            <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
              <h3 style="color: #0c5460; margin-top: 0;">🔍 Kolla din reservationsstatus</h3>
              <p style="color: #0c5460;">
                Du kan kolla status på din reservation genom att besöka:
                <br>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/reservation-status?email=${encodeURIComponent(data.customerEmail)}&${data.trackingCode ? `trackingCode=${data.trackingCode}` : `reservationId=${data.reservationId}`}" 
                   style="color: #17a2b8; text-decoration: none; font-weight: bold;">
                  Kolla reservationsstatus →
                </a>
              </p>
            </div>
            
            <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
              Har du frågor? Kontakta oss på support@crowdvine.se
            </p>
          </div>
          
          <div style="background-color: #34495e; padding: 20px; text-align: center; color: white;">
            <p style="margin: 0; font-size: 14px;">© 2024 CrowdVine. Alla rättigheter förbehållna.</p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: `"CrowdVine" <${process.env.SMTP_USER || "noreply@crowdvine.se"}>`,
        to: data.customerEmail,
        subject: `🍷 Reservationsbekräftelse - ${data.reservationId}`,
        html: emailContent,
        text: `
          CrowdVine - Reservationsbekräftelse
          
          Hej ${data.customerName}!
          
          Din reservation har mottagits och behandlas nu.
          
          Reservations-ID: ${data.reservationId}
          ${data.trackingCode ? `Tracking-kod: ${data.trackingCode}` : ""}
          Datum: ${new Date(data.createdAt).toLocaleDateString("sv-SE")}
          Status: Placerad
          
          Beställda viner:
          ${data.items.map((item) => `- ${item.wineName} ${item.vintage} - ${item.quantity} st - ${item.price} SEK`).join("\n")}
          
          Totalt: ${data.totalAmount} SEK
          
          Leveransadress:
          ${data.address.street}
          ${data.address.postcode} ${data.address.city}
          ${data.address.countryCode}
          
          Viktig information:
          - Ingen betalning har debiterats ännu
          - Vi debiterar endast när en pall bildas
          - Du kan avbryta reservationen när som helst före pall-bildning
          - Vi meddelar dig via email när din pall är redo
          
          Kolla din reservationsstatus:
          ${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/reservation-status?email=${encodeURIComponent(data.customerEmail)}&${data.trackingCode ? `trackingCode=${data.trackingCode}` : `reservationId=${data.reservationId}`}
          
          Har du frågor? Kontakta oss på support@crowdvine.se
        `,
      };

      if (!this.transporter) {
        console.error("Email transporter not initialized");
        return false;
      }

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", result.messageId);
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }

  async sendReservationStatusUpdate(data: {
    reservationId: string;
    customerName: string;
    customerEmail: string;
    status: string;
    message: string;
  }): Promise<boolean> {
    try {
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #2c3e50; margin: 0;">🍷 CrowdVine</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0;">Statusuppdatering för din reservation</p>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <h2 style="color: #2c3e50; margin-top: 0;">Hej ${data.customerName}!</h2>
            
            <p>Din reservation har uppdaterats med ny status.</p>
            
            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">📋 Statusuppdatering</h3>
              <p><strong>Reservations-ID:</strong> ${data.reservationId}</p>
              <p><strong>Ny status:</strong> <span style="color: #27ae60; font-weight: bold;">${data.status}</span></p>
              <p><strong>Meddelande:</strong> ${data.message}</p>
            </div>
            
            <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
              <h3 style="color: #0c5460; margin-top: 0;">🔍 Kolla din reservationsstatus</h3>
              <p style="color: #0c5460;">
                Du kan kolla status på din reservation genom att besöka:
                <br>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/reservation-status?email=${encodeURIComponent(data.customerEmail)}&reservationId=${data.reservationId}" 
                   style="color: #17a2b8; text-decoration: none; font-weight: bold;">
                  Kolla reservationsstatus →
                </a>
              </p>
            </div>
            
            <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
              Har du frågor? Kontakta oss på support@crowdvine.se
            </p>
          </div>
          
          <div style="background-color: #34495e; padding: 20px; text-align: center; color: white;">
            <p style="margin: 0; font-size: 14px;">© 2024 CrowdVine. Alla rättigheter förbehållna.</p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: `"CrowdVine" <${process.env.SMTP_USER || "noreply@crowdvine.se"}>`,
        to: data.customerEmail,
        subject: `🍷 Statusuppdatering - ${data.reservationId}`,
        html: emailContent,
      };

      if (!this.transporter) {
        console.error("Email transporter not initialized");
        return false;
      }

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Status update email sent successfully:", result.messageId);
      return true;
    } catch (error) {
      console.error("Failed to send status update email:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
