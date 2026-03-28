import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { BillingRepository } from './billing.repository';
import {
  BILLING_PLANS,
  getStripePriceId,
  type BillingInterval,
  type BillingPlanSlug,
} from './billing.plans';
import { StripeService } from './stripe.service';

type Entitlement = {
  plan: BillingPlanSlug;
  minutesPerMonth: number;
  features: {
    dualAudio: boolean;
    speakerDiarization: boolean;
    micTranslationTts: boolean;
    extendedHistory: boolean;
    contentProtection: boolean;
  };
};

@Injectable()
export class BillingService {
  constructor(
    private repo: BillingRepository,
    private stripeService: StripeService,
  ) {}

  listPlans() {
    return [
      ...BILLING_PLANS.map((plan) => ({ slug: plan.slug, name: plan.name })),
      { slug: 'enterprise', name: 'Enterprise' },
    ];
  }

  async createCheckoutSession(params: {
    userId: string;
    email: string;
    plan: BillingPlanSlug;
    interval: BillingInterval;
    successUrl: string;
    cancelUrl: string;
  }) {
    const stripe = this.stripeService.getClient();
    if (!stripe) throw new Error('stripe is not configured');

    const priceId = getStripePriceId(params.plan, params.interval);
    if (!priceId) throw new Error('invalid plan or missing stripe price id');

    const existingCustomerId = await this.repo.getStripeCustomerIdByUserId(
      params.userId,
    );

    const stripeCustomerId =
      existingCustomerId ??
      (
        await stripe.customers.create({
          email: params.email,
          metadata: { userId: params.userId },
        })
      ).id;

    if (!existingCustomerId) {
      await this.repo.createBillingCustomerMapping(
        params.userId,
        stripeCustomerId,
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.userId,
      metadata: {
        userId: params.userId,
        plan: params.plan,
        interval: params.interval,
      },
    });

    return { url: session.url };
  }

  async createPortalSession(params: { userId: string; returnUrl: string }) {
    const stripe = this.stripeService.getClient();
    if (!stripe) throw new Error('stripe is not configured');

    const stripeCustomerId = await this.repo.getStripeCustomerIdByUserId(
      params.userId,
    );
    if (!stripeCustomerId) {
      throw new Error('stripe customer not found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: params.returnUrl,
    });

    return { url: session.url };
  }

  async getEntitlement(userId: string): Promise<Entitlement> {
    const sub = await this.repo.getActiveSubscriptionByUserId(userId);
    const plan = sub ? this.resolvePlanFromPriceId(sub.priceId) : 'free';

    if (plan === 'pro') {
      return {
        plan: 'pro',
        minutesPerMonth: 2400,
        features: {
          dualAudio: true,
          speakerDiarization: true,
          micTranslationTts: true,
          extendedHistory: true,
          contentProtection: true,
        },
      };
    }

    if (plan === 'lite') {
      return {
        plan: 'lite',
        minutesPerMonth: 900,
        features: {
          dualAudio: false,
          speakerDiarization: false,
          micTranslationTts: false,
          extendedHistory: true,
          contentProtection: false,
        },
      };
    }

    return {
      plan: 'free',
      minutesPerMonth: 300,
      features: {
        dualAudio: false,
        speakerDiarization: false,
        micTranslationTts: false,
        extendedHistory: false,
        contentProtection: false,
      },
    };
  }

  async handleStripeWebhookEvent(event: Stripe.Event) {
    if (await this.repo.hasProcessedStripeEvent(event.id)) return;

    const stripeCreatedAt = event.created
      ? new Date(event.created * 1000)
      : null;
    await this.repo.markStripeEventProcessed(
      event.id,
      event.type,
      stripeCreatedAt,
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription?.id ?? null);
      const stripeCustomerId =
        typeof session.customer === 'string'
          ? session.customer
          : (session.customer?.id ?? null);
      const userId =
        session.metadata?.userId ?? session.client_reference_id ?? null;
      if (!subscriptionId || !stripeCustomerId || !userId) return;

      const stripe = this.stripeService.getClient();
      if (!stripe) return;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await this.upsertFromStripeSubscription(userId, subscription);
      return;
    }

    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object;
      const stripeCustomerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
      const userId =
        subscription.metadata?.userId ??
        (await this.repo.getUserIdByStripeCustomerId(stripeCustomerId));
      if (!userId) return;

      await this.upsertFromStripeSubscription(userId, subscription);
    }
  }

  private async upsertFromStripeSubscription(
    userId: string,
    subscription: Stripe.Subscription,
  ) {
    const item = subscription.items.data[0];
    const priceId = item?.price.id ?? '';
    if (!priceId) return;

    const stripeCustomerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    await this.repo.upsertSubscription({
      userId,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      priceId,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  }

  private resolvePlanFromPriceId(priceId: string): BillingPlanSlug {
    const liteMonthly = process.env.STRIPE_PRICE_LITE_MONTHLY;
    const liteYearly = process.env.STRIPE_PRICE_LITE_YEARLY;
    const proMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY;
    const proYearly = process.env.STRIPE_PRICE_PRO_YEARLY;

    if (priceId && (priceId === liteMonthly || priceId === liteYearly)) {
      return 'lite';
    }

    if (priceId && (priceId === proMonthly || priceId === proYearly)) {
      return 'pro';
    }

    return 'free';
  }
}
