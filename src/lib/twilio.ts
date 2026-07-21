interface SendSMSParams {
  to: string;
  message: string;
  salonId: string;
}

interface SMSResult {
  success: boolean;
  sid?: string;
  error?: string;
}

class TwilioClient {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
  }

  async sendSMS({ to, message, salonId }: SendSMSParams): Promise<SMSResult> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      return { success: false, error: 'Twilio credentials are not configured' };
    }

    try {
      const form = new URLSearchParams({ To: to, From: this.fromNumber, Body: message });
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.accountSid)}/Messages.json`, {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'content-type': 'application/x-www-form-urlencoded',
          'idempotency-key': `${salonId}:${to}:${Buffer.from(message).toString('base64url').slice(0, 32)}`,
        },
        body: form,
        signal: AbortSignal.timeout(15_000),
      });
      const result = await response.json();
      if (!response.ok || !result.sid) return { success: false, error: result.message || `Twilio returned HTTP ${response.status}` };
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Send appointment reminder
  async sendAppointmentReminder(params: {
    to: string;
    clientName: string;
    serviceName: string;
    appointmentTime: Date;
    technicianName: string;
    salonId: string;
  }): Promise<SMSResult> {
    const timeStr = params.appointmentTime.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const message = `Hi ${params.clientName}! Reminder: Your ${params.serviceName} appointment with ${params.technicianName} is scheduled for ${timeStr}. Reply CONFIRM to confirm or call us to reschedule.`;

    return this.sendSMS({
      to: params.to,
      message,
      salonId: params.salonId,
    });
  }

  // Send booking confirmation
  async sendBookingConfirmation(params: {
    to: string;
    clientName: string;
    serviceName: string;
    appointmentTime: Date;
    salonId: string;
  }): Promise<SMSResult> {
    const timeStr = params.appointmentTime.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const message = `Hi ${params.clientName}! Your ${params.serviceName} appointment is confirmed for ${timeStr}. We look forward to seeing you!`;

    return this.sendSMS({
      to: params.to,
      message,
      salonId: params.salonId,
    });
  }

  // Send waitlist notification
  async sendWaitlistNotification(params: {
    to: string;
    clientName: string;
    salonId: string;
  }): Promise<SMSResult> {
    const message = `Hi ${params.clientName}! Your table is ready. Please check in at the front desk within 5 minutes.`;

    return this.sendSMS({
      to: params.to,
      message,
      salonId: params.salonId,
    });
  }

  // Send review request
  async sendReviewRequest(params: {
    to: string;
    clientName: string;
    serviceName: string;
    reviewLink?: string;
    salonId: string;
  }): Promise<SMSResult> {
    const message = params.reviewLink
      ? `Hi ${params.clientName}! Thank you for visiting us today for your ${params.serviceName}. We'd love to hear your feedback: ${params.reviewLink}`
      : `Hi ${params.clientName}! Thank you for visiting us today for your ${params.serviceName}. We hope you loved it! We'd appreciate a review if you have a moment.`;

    return this.sendSMS({
      to: params.to,
      message,
      salonId: params.salonId,
    });
  }
}

export const twilioClient = new TwilioClient();
export type { SendSMSParams, SMSResult };
