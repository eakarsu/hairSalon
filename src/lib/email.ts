import { prisma } from './prisma';

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  salonId: string;
  fromEmail?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email provider configuration
const emailProvider = process.env.EMAIL_PROVIDER || 'simulation'; // 'sendgrid', 'ses', 'smtp', 'simulation'

async function sendWithSendGrid(options: EmailOptions): Promise<EmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'SendGrid API key not configured' };
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: options.fromEmail || process.env.FROM_EMAIL || 'noreply@nailflow.ai' },
        subject: options.subject,
        content: [{ type: 'text/html', value: options.body }],
      }),
    });

    if (response.ok) {
      const messageId = response.headers.get('x-message-id') || `sg-${Date.now()}`;
      return { success: true, messageId };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function sendWithSES(options: EmailOptions): Promise<EmailResult> {
  // AWS SES implementation would go here
  // For now, simulate
  console.log('[SES] Would send email:', options);
  return { success: true, messageId: `ses-${Date.now()}` };
}

async function simulateEmail(options: EmailOptions): Promise<EmailResult> {
  // Development mode - log email instead of sending
  console.log('========== SIMULATED EMAIL ==========');
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`Body: ${options.body.substring(0, 200)}...`);
  console.log('======================================');

  // Simulate small delay
  await new Promise(resolve => setTimeout(resolve, 100));

  return { success: true, messageId: `sim-${Date.now()}` };
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  let result: EmailResult;

  switch (emailProvider) {
    case 'sendgrid':
      result = await sendWithSendGrid(options);
      break;
    case 'ses':
      result = await sendWithSES(options);
      break;
    default:
      result = await simulateEmail(options);
  }

  // Log the email attempt
  await prisma.emailLog.create({
    data: {
      salonId: options.salonId,
      toEmail: options.to,
      fromEmail: options.fromEmail || process.env.FROM_EMAIL || 'noreply@nailflow.ai',
      subject: options.subject,
      body: options.body,
      status: result.success ? 'SENT' : 'FAILED',
      provider: emailProvider,
      externalId: result.messageId,
      errorMsg: result.error,
    },
  });

  return result;
}

// Email templates
export function getAppointmentReminderTemplate(params: {
  clientName: string;
  salonName: string;
  serviceName: string;
  technicianName: string;
  dateTime: string;
  address: string;
}): { subject: string; body: string } {
  const { clientName, salonName, serviceName, technicianName, dateTime, address } = params;

  return {
    subject: `Reminder: Your appointment at ${salonName}`,
    body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8bbd9; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #fff; border: 1px solid #eee; }
    .details { background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .btn { display: inline-block; padding: 12px 24px; background: #e91e63; color: #fff; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; color: #333;">${salonName}</h1>
    </div>
    <div class="content">
      <p>Hi ${clientName},</p>
      <p>This is a friendly reminder about your upcoming appointment:</p>
      <div class="details">
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>With:</strong> ${technicianName}</p>
        <p><strong>Date & Time:</strong> ${dateTime}</p>
        <p><strong>Location:</strong> ${address}</p>
      </div>
      <p>We look forward to seeing you! If you need to reschedule, please contact us as soon as possible.</p>
      <p>Thank you for choosing ${salonName}!</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${salonName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}

export function getBookingConfirmationTemplate(params: {
  clientName: string;
  salonName: string;
  serviceName: string;
  technicianName: string;
  dateTime: string;
  address: string;
  totalAmount: number;
}): { subject: string; body: string } {
  const { clientName, salonName, serviceName, technicianName, dateTime, address, totalAmount } = params;

  return {
    subject: `Booking Confirmed at ${salonName}`,
    body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4caf50; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { color: #fff; margin: 0; }
    .content { padding: 20px; background: #fff; border: 1px solid #eee; }
    .details { background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .checkmark { font-size: 48px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="checkmark">✓</span>
      <h1>Booking Confirmed!</h1>
    </div>
    <div class="content">
      <p>Hi ${clientName},</p>
      <p>Great news! Your appointment has been confirmed.</p>
      <div class="details">
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>With:</strong> ${technicianName}</p>
        <p><strong>Date & Time:</strong> ${dateTime}</p>
        <p><strong>Location:</strong> ${address}</p>
        <p><strong>Total:</strong> $${totalAmount.toFixed(2)}</p>
      </div>
      <p>Need to make changes? Please contact us at least 24 hours before your appointment.</p>
      <p>See you soon!</p>
      <p>- The ${salonName} Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${salonName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}

export function getFollowUpTemplate(params: {
  clientName: string;
  salonName: string;
  serviceName: string;
  reviewLink?: string;
}): { subject: string; body: string } {
  const { clientName, salonName, serviceName, reviewLink } = params;

  return {
    subject: `Thank you for visiting ${salonName}!`,
    body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8bbd9; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #fff; border: 1px solid #eee; }
    .btn { display: inline-block; padding: 12px 24px; background: #e91e63; color: #fff; text-decoration: none; border-radius: 4px; margin: 10px 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; color: #333;">Thank You! 💅</h1>
    </div>
    <div class="content">
      <p>Hi ${clientName},</p>
      <p>Thank you for choosing ${salonName} for your ${serviceName}! We hope you love your new look.</p>
      <p>Your feedback means the world to us. If you have a moment, we'd appreciate hearing about your experience:</p>
      <p style="text-align: center;">
        ${reviewLink ? `<a href="${reviewLink}" class="btn">Leave a Review</a>` : ''}
        <a href="#" class="btn" style="background: #2196f3;">Book Again</a>
      </p>
      <p>We look forward to seeing you again soon!</p>
      <p>With love,<br>The ${salonName} Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${salonName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}
