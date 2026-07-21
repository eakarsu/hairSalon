import Stripe from 'stripe';

interface CreatePaymentIntentParams {
  amount: number; // Amount in dollars
  clientId: string;
  appointmentId?: string;
  description?: string;
}

interface PaymentResult {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}

interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

class StripeClient {
  private secretKey: string;
  private publishableKey: string;

  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY || '';
    this.publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  }

  isConfigured(): boolean {
    return !!this.secretKey;
  }

  private client(): Stripe {
    if (!this.secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
    return new Stripe(this.secretKey, { apiVersion: '2024-06-20' });
  }

  async createPaymentIntent({
    amount,
    clientId,
    appointmentId,
    description,
  }: CreatePaymentIntentParams): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Stripe is not configured' };
    }

    try {
      const paymentIntent = await this.client().paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        metadata: { clientId, appointmentId: appointmentId || '' },
        description,
      });
      return {
        success: true,
        clientSecret: paymentIntent.client_secret || undefined,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Stripe payment intent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Stripe is not configured' };
    }

    try {
      const paymentIntent = await this.client().paymentIntents.retrieve(paymentIntentId);
      return {
        success: paymentIntent.status === 'succeeded',
        paymentIntentId,
      };
    } catch (error) {
      console.error('Stripe confirm error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Confirmation failed',
      };
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<RefundResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Stripe is not configured' };
    }

    try {
      const refund = await this.client().refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });
      return {
        success: refund.status === 'succeeded' || refund.status === 'pending',
        refundId: refund.id,
      };
    } catch (error) {
      console.error('Stripe refund error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }

  getPublishableKey(): string {
    return this.publishableKey;
  }
}

export const stripeClient = new StripeClient();
export type { CreatePaymentIntentParams, PaymentResult, RefundResult };
