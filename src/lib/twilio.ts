// Twilio SMS Client
// Note: Requires twilio package to be installed: npm install twilio

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

// Placeholder for Twilio client - will use actual Twilio SDK in production
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
    // Validate configuration
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.warn('Twilio not configured - SMS will be logged but not sent');

      // In development, just log the message
      console.log(`[SMS to ${to}]: ${message}`);

      return {
        success: true,
        sid: `dev_${Date.now()}`,
      };
    }

    try {
      // In production, this would use the actual Twilio SDK
      // const twilio = require('twilio')(this.accountSid, this.authToken);
      // const result = await twilio.messages.create({
      //   body: message,
      //   from: this.fromNumber,
      //   to: to,
      // });

      // For now, simulate sending
      console.log(`[Twilio SMS] To: ${to}, From: ${this.fromNumber}, Message: ${message}`);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        sid: `sim_${Date.now()}`,
      };
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
