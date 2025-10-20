import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createPaymentLinkForReservation } from "@/lib/stripe/payment-links";

/**
 * Trigger payment notifications for all pending reservations in a completed pallet
 */
export async function triggerPaymentNotifications(
  palletId: string,
): Promise<void> {
  console.log(
    `📧 [Email Notifications] Triggering payment notifications for pallet ${palletId}`,
  );

  const supabase = getSupabaseAdmin();

  try {
    // Get all reservations for this pallet that need payment
    // Note: Get only basic fields, calculate amounts from items
    const { data: reservations, error: reservationsError } = await supabase
      .from("order_reservations")
      .select(
        `
        id,
        payment_deadline,
        status,
        profiles!inner(email, full_name),
        pallets(name)
      `,
      )
      .eq("pallet_id", palletId)
      .in("status", ["placed", "pending_payment"]);

    if (reservationsError) {
      console.error(
        `❌ [Email Notifications] Error fetching reservations for pallet ${palletId}:`,
        reservationsError,
      );
      throw new Error(
        `Failed to fetch reservations: ${reservationsError.message}`,
      );
    }

    if (!reservations || reservations.length === 0) {
      console.log(
        `ℹ️ [Email Notifications] No pending reservations found for pallet ${palletId}`,
      );
      return;
    }

    console.log(
      `📧 [Email Notifications] Found ${reservations.length} reservations needing payment notifications for pallet ${palletId}`,
    );

    // Process each reservation
    const results = await Promise.allSettled(
      reservations.map((reservation) => sendPaymentNotification(reservation)),
    );

    // Log results
    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successCount++;
        console.log(
          `✅ [Email Notifications] Successfully sent notification for reservation ${reservations[index].id}`,
        );
      } else {
        failureCount++;
        console.error(
          `❌ [Email Notifications] Failed to send notification for reservation ${reservations[index].id}:`,
          result.reason,
        );
      }
    });

    console.log(
      `📊 [Email Notifications] Payment notifications completed for pallet ${palletId}: ${successCount} success, ${failureCount} failures`,
    );
  } catch (error) {
    console.error(
      `❌ [Email Notifications] Error triggering payment notifications for pallet ${palletId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Send payment notification email for a single reservation
 */
async function sendPaymentNotification(reservation: any): Promise<void> {
  const supabase = getSupabaseAdmin();

  try {
    // Get bottle count and prices from order_reservation_items with wine prices
    const { data: items } = await supabase
      .from("order_reservation_items")
      .select(
        `
        quantity,
        item_id,
        wines(base_price_cents)
      `,
      )
      .eq("reservation_id", reservation.id);

    const bottleCount =
      items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

    // Calculate total amount from items
    const totalAmountCents =
      items?.reduce((sum, item) => {
        const price = item.wines?.base_price_cents || 0;
        const quantity = item.quantity || 0;
        return sum + price * quantity;
      }, 0) || 0;

    // Create payment link
    const paymentLink = await createPaymentLinkForReservation(reservation.id);

    // Calculate deadline info
    const deadline = new Date(reservation.payment_deadline);
    const deadlineStr = deadline.toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Send email
    await sendPaymentReadyEmail({
      to: reservation.profiles.email,
      name: reservation.profiles.full_name || "Friend",
      palletName: reservation.pallets?.name || "Your Pallet",
      bottleCount: bottleCount,
      totalAmount: (totalAmountCents / 100).toFixed(2),
      paymentLink: paymentLink,
      deadline: deadlineStr,
      reservationId: reservation.id,
    });
  } catch (error) {
    console.error(
      `❌ [Email Notification] Error sending payment notification for reservation ${reservation.id}:`,
      error,
    );
    throw error;
  }
}

/**
 * Send payment ready email using SendGrid
 */
async function sendPaymentReadyEmail(params: {
  to: string;
  name: string;
  palletName: string;
  bottleCount: number;
  totalAmount: string;
  paymentLink: string;
  deadline: string;
  reservationId: string;
}): Promise<void> {
  console.log(
    `📧 [Email] Sending payment ready email to ${params.to} for reservation ${params.reservationId}`,
  );

  try {
    // Import SendGrid client
    const sgMail = await import("@sendgrid/mail");
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    const msg = {
      to: params.to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: process.env.SENDGRID_FROM_NAME || "PACT",
      },
      subject: `🍷 Your Pallet is Ready - Payment Required`,
      html: generatePaymentEmailHTML(params),
      text: generatePaymentEmailText(params),
    };

    await sgMail.send(msg);
    console.log(`✅ [Email] Payment ready email sent to ${params.to}`);
  } catch (error) {
    console.error(
      `❌ [Email] Error sending payment ready email to ${params.to}:`,
      error,
    );
    throw error;
  }
}

/**
 * Generate HTML email content
 */
function generatePaymentEmailHTML(params: {
  name: string;
  palletName: string;
  bottleCount: number;
  totalAmount: string;
  paymentLink: string;
  deadline: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Pallet is Ready - Payment Required</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background-color: #000000; padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">PACT</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.8;">Wine Collective</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
            Great news, ${params.name}! 🎉
          </h2>
          
          <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Your wine pallet <strong>"${params.palletName}"</strong> has reached 100% and is ready to ship!
          </p>
          
          <!-- Order Summary -->
          <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Your Reservation</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 10px 0;">
              <span style="color: #666666; font-size: 16px;">${params.bottleCount} bottles</span>
              <span style="color: #000000; font-size: 18px; font-weight: 600;">${params.totalAmount} SEK</span>
            </div>
          </div>
          
          <!-- Payment Instructions -->
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Next Steps</h3>
            <p style="color: #856404; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
              Please complete your payment by <strong>${params.deadline}</strong> to confirm your order.
            </p>
            <p style="color: #856404; font-size: 14px; line-height: 1.5; margin: 0;">
              If you don't complete payment by the deadline, your reservation will be released to other customers.
            </p>
          </div>
          
          <!-- Payment Button -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${params.paymentLink}" 
               style="display: inline-block; background-color: #000000; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: 600; transition: background-color 0.2s;">
              Complete Payment
            </a>
          </div>
          
          <!-- Additional Info -->
          <div style="border-top: 1px solid #e9ecef; padding-top: 30px; margin-top: 40px;">
            <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">What happens next?</h3>
            <ul style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Complete your payment using the button above</li>
              <li>We'll process your order and prepare it for shipping</li>
              <li>You'll receive a shipping confirmation email</li>
              <li>Your wine will be delivered to your pickup location</li>
            </ul>
          </div>
          
          <!-- Support -->
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 30px 0 0 0;">
            <p style="color: #666666; font-size: 14px; line-height: 1.5; margin: 0;">
              Questions? Contact us at <a href="mailto:support@pactwines.com" style="color: #000000; text-decoration: none;">support@pactwines.com</a>
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            © 2025 PACT. All rights reserved.
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email content
 */
function generatePaymentEmailText(params: {
  name: string;
  palletName: string;
  bottleCount: number;
  totalAmount: string;
  paymentLink: string;
  deadline: string;
}): string {
  return `
Great news, ${params.name}! 🎉

Your wine pallet "${params.palletName}" has reached 100% and is ready to ship!

Your Reservation:
- ${params.bottleCount} bottles
- ${params.totalAmount} SEK

Next Steps:
Please complete your payment by ${params.deadline} to confirm your order.

Complete Payment: ${params.paymentLink}

If you don't complete payment by the deadline, your reservation will be released to other customers.

What happens next?
1. Complete your payment using the link above
2. We'll process your order and prepare it for shipping
3. You'll receive a shipping confirmation email
4. Your wine will be delivered to your pickup location

Questions? Contact us at support@pactwines.com

© 2025 PACT. All rights reserved.
  `;
}

/**
 * Send reminder email for approaching deadline
 */
export async function sendPaymentReminder(
  reservationId: string,
): Promise<void> {
  console.log(
    `⏰ [Email Reminder] Sending payment reminder for reservation ${reservationId}`,
  );

  const supabase = getSupabaseAdmin();

  try {
    // Get reservation details
    const { data: reservation, error } = await supabase
      .from("order_reservations")
      .select(
        `
        id,
        quantity,
        total_amount_cents,
        payment_deadline,
        payment_link,
        profiles!inner(email, full_name),
        pallets(name)
      `,
      )
      .eq("id", reservationId)
      .eq("status", "pending_payment")
      .single();

    if (error || !reservation) {
      throw new Error(
        `Reservation ${reservationId} not found or not pending payment`,
      );
    }

    if (!reservation.payment_link) {
      throw new Error(`No payment link found for reservation ${reservationId}`);
    }

    // Calculate time remaining
    const deadline = new Date(reservation.payment_deadline);
    const now = new Date();
    const hoursRemaining = Math.max(
      0,
      Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)),
    );

    if (hoursRemaining === 0) {
      throw new Error(
        `Payment deadline has passed for reservation ${reservationId}`,
      );
    }

    // Send reminder email
    await sendPaymentReminderEmail({
      to: reservation.profiles.email,
      name: reservation.profiles.full_name || "Friend",
      palletName: reservation.pallets?.name || "Your Pallet",
      bottleCount: reservation.quantity,
      totalAmount: (reservation.total_amount_cents / 100).toFixed(2),
      paymentLink: reservation.payment_link,
      hoursRemaining: hoursRemaining,
      reservationId: reservation.id,
    });

    console.log(
      `✅ [Email Reminder] Payment reminder sent to ${reservation.profiles.email}`,
    );
  } catch (error) {
    console.error(
      `❌ [Email Reminder] Error sending payment reminder for reservation ${reservationId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Send payment reminder email
 */
async function sendPaymentReminderEmail(params: {
  to: string;
  name: string;
  palletName: string;
  bottleCount: number;
  totalAmount: string;
  paymentLink: string;
  hoursRemaining: number;
  reservationId: string;
}): Promise<void> {
  const sgMail = await import("@sendgrid/mail");
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

  const msg = {
    to: params.to,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL!,
      name: process.env.SENDGRID_FROM_NAME || "PACT",
    },
    subject: `⏰ Payment Reminder - ${params.hoursRemaining} hours remaining`,
    html: `
      <h2>Payment Reminder</h2>
      <p>Hi ${params.name},</p>
      <p>This is a friendly reminder that your payment for <strong>"${params.palletName}"</strong> is due soon.</p>
      
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Time remaining:</strong> ${params.hoursRemaining} hours</p>
        <p><strong>Order:</strong> ${params.bottleCount} bottles - ${params.totalAmount} SEK</p>
      </div>
      
      <p>Please complete your payment to secure your reservation:</p>
      
      <a href="${params.paymentLink}" 
         style="display: inline-block; background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
        Complete Payment
      </a>
      
      <p>If you don't complete payment by the deadline, your reservation will be released.</p>
    `,
    text: `
Payment Reminder

Hi ${params.name},

This is a friendly reminder that your payment for "${params.palletName}" is due soon.

Time remaining: ${params.hoursRemaining} hours
Order: ${params.bottleCount} bottles - ${params.totalAmount} SEK

Please complete your payment to secure your reservation:
${params.paymentLink}

If you don't complete payment by the deadline, your reservation will be released.
    `,
  };

  await sgMail.send(msg);
}
