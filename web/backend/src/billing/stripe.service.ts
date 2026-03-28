import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;

  getClient() {
    if (this.stripe) return this.stripe;

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return null;

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });

    return this.stripe;
  }

  getWebhookSecret() {
    return process.env.STRIPE_WEBHOOK_SECRET ?? null;
  }
}
