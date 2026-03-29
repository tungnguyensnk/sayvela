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
  minutesUsed: number;
  minutesRemaining: number;
  usagePercentage: number;
  cycleStartedAt: string | null;
  cycleEndsAt: string | null;
  upgradeRecommendation: 'lite' | 'pro' | null;
  features: {
    dualAudio: boolean;
    speakerDiarization: boolean;
    micTranslationTts: boolean;
    extendedHistory: boolean;
    contentProtection: boolean;
  };
};

type VerifyCheckoutSessionResult =
  | {
      state: 'paid';
      paymentStatus: Stripe.Checkout.Session.PaymentStatus;
      synced: boolean;
    }
  | {
      state: 'unpaid';
      paymentStatus: Stripe.Checkout.Session.PaymentStatus;
    }
  | {
      state: 'not_found';
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
    const now = new Date();
    const sub = await this.repo.getActiveSubscriptionByUserId(userId);
    const { plan, interval } = sub
      ? this.resolvePlanIntervalFromPriceId(sub.priceId)
      : { plan: 'free' as const, interval: 'month' as const };

    const cycle = sub
      ? await this.ensureSubscriptionUsageCycle({
          userId,
          stripeSubscriptionId: sub.stripeSubscriptionId,
          currentPeriodEnd: sub.currentPeriodEnd ?? null,
          plan,
          interval,
          now,
        })
      : await this.ensureFreeUsageCycle({ userId, now });

    const minutesPerMonth = this.getMinutesPerMonth(plan);
    const minutesUsed = cycle.minutesUsed;
    const minutesRemaining = Math.max(0, cycle.minutesLimit - minutesUsed);
    const usagePercentage = this.getUsagePercentage(
      minutesUsed,
      cycle.minutesLimit,
    );

    return {
      plan,
      minutesPerMonth,
      minutesUsed,
      minutesRemaining,
      usagePercentage,
      cycleStartedAt: cycle.cycleStartedAt?.toISOString() ?? null,
      cycleEndsAt: cycle.cycleEndsAt?.toISOString() ?? null,
      upgradeRecommendation:
        plan === 'free' ? 'lite' : plan === 'lite' ? 'pro' : null,
      features: this.getFeatures(plan),
    };
  }

  async verifyCheckoutSession(params: {
    userId: string;
    sessionId: string;
  }): Promise<VerifyCheckoutSessionResult> {
    const stripe = this.stripeService.getClient();
    if (!stripe) throw new Error('stripe is not configured');

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(params.sessionId, {
        expand: ['subscription'],
      });
    } catch (err) {
      const stripeCode =
        typeof err === 'object' && err
          ? 'code' in err
            ? (err as { code?: unknown }).code
            : undefined
          : undefined;
      if (stripeCode === 'resource_missing') return { state: 'not_found' };
      return { state: 'not_found' };
    }

    const sessionUserId =
      session.metadata?.userId ?? session.client_reference_id ?? null;
    if (!sessionUserId || sessionUserId !== params.userId) {
      return { state: 'not_found' };
    }

    if (session.payment_status !== 'paid') {
      return { state: 'unpaid', paymentStatus: session.payment_status };
    }

    let synced = false;
    const subscriptionRef = session.subscription;
    if (subscriptionRef) {
      const subscription =
        typeof subscriptionRef === 'string'
          ? await stripe.subscriptions.retrieve(subscriptionRef)
          : subscriptionRef;
      await this.upsertFromStripeSubscription(params.userId, subscription);
      synced = true;
    }

    return { state: 'paid', paymentStatus: session.payment_status, synced };
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

    const { plan, interval } = this.resolvePlanIntervalFromPriceId(priceId);
    await this.ensureSubscriptionUsageCycle({
      userId,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
      plan,
      interval,
      now: new Date(),
    });
  }

  private resolvePlanIntervalFromPriceId(priceId: string): {
    plan: BillingPlanSlug;
    interval: BillingInterval;
  } {
    const liteMonthly = process.env.STRIPE_PRICE_LITE_MONTHLY;
    const liteYearly = process.env.STRIPE_PRICE_LITE_YEARLY;
    const proMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY;
    const proYearly = process.env.STRIPE_PRICE_PRO_YEARLY;

    if (priceId && priceId === liteMonthly) {
      return { plan: 'lite', interval: 'month' };
    }

    if (priceId && priceId === liteYearly) {
      return { plan: 'lite', interval: 'year' };
    }

    if (priceId && priceId === proMonthly) {
      return { plan: 'pro', interval: 'month' };
    }

    if (priceId && priceId === proYearly) {
      return { plan: 'pro', interval: 'year' };
    }

    return { plan: 'free', interval: 'month' };
  }

  private getMinutesPerMonth(plan: BillingPlanSlug) {
    if (plan === 'pro') return 2400;
    if (plan === 'lite') return 900;
    return 300;
  }

  private getFeatures(plan: BillingPlanSlug) {
    if (plan === 'pro') {
      return {
        dualAudio: true,
        speakerDiarization: true,
        micTranslationTts: true,
        extendedHistory: true,
        contentProtection: true,
      };
    }

    if (plan === 'lite') {
      return {
        dualAudio: false,
        speakerDiarization: false,
        micTranslationTts: false,
        extendedHistory: true,
        contentProtection: false,
      };
    }

    return {
      dualAudio: false,
      speakerDiarization: false,
      micTranslationTts: false,
      extendedHistory: false,
      contentProtection: false,
    };
  }

  private getUsagePercentage(minutesUsed: number, minutesLimit: number) {
    if (minutesLimit <= 0) return 0;
    const raw = Math.round((minutesUsed / minutesLimit) * 100);
    return Math.max(0, Math.min(100, raw));
  }

  private addMonths(date: Date, months: number) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  private addYears(date: Date, years: number) {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + years);
    return next;
  }

  private getQuotaWindowFromSubscription(params: {
    now: Date;
    currentPeriodEnd: Date | null;
    interval: BillingInterval;
  }): { cycleStartedAt: Date; cycleEndsAt: Date } {
    if (!params.currentPeriodEnd) {
      const cycleStartedAt = params.now;
      const cycleEndsAt = this.addMonths(params.now, 1);
      return { cycleStartedAt, cycleEndsAt };
    }

    if (params.interval === 'month') {
      const cycleEndsAt = params.currentPeriodEnd;
      const cycleStartedAt = this.addMonths(cycleEndsAt, -1);
      return { cycleStartedAt, cycleEndsAt };
    }

    const subscriptionStartedAt = this.addYears(params.currentPeriodEnd, -1);
    let cursor = subscriptionStartedAt;
    let cycleStartedAt = subscriptionStartedAt;
    let cycleEndsAt = this.addMonths(subscriptionStartedAt, 1);

    for (let i = 0; i < 12; i += 1) {
      const next = this.addMonths(cursor, 1);
      if (params.now < next) {
        cycleStartedAt = cursor;
        cycleEndsAt = next;
        break;
      }
      cursor = next;
      cycleStartedAt = cursor;
      cycleEndsAt = this.addMonths(cursor, 1);
    }

    if (cycleEndsAt > params.currentPeriodEnd) {
      cycleEndsAt = params.currentPeriodEnd;
    }

    return { cycleStartedAt, cycleEndsAt };
  }

  private isSameWindow(
    a: { cycleStartedAt: Date; cycleEndsAt: Date },
    b: {
      cycleStartedAt: Date;
      cycleEndsAt: Date;
    },
  ) {
    return (
      a.cycleStartedAt.getTime() === b.cycleStartedAt.getTime() &&
      a.cycleEndsAt.getTime() === b.cycleEndsAt.getTime()
    );
  }

  private async ensureFreeUsageCycle(params: { userId: string; now: Date }) {
    const active = await this.repo.getActiveUsageCycleByUserId(
      params.userId,
      params.now,
    );

    if (active && active.plan === 'free') return active;

    if (active) {
      await this.repo.updateUsageCycle(active.id, { cycleEndsAt: params.now });
    }

    const cycleStartedAt = params.now;
    const cycleEndsAt = this.addMonths(params.now, 1);
    const minutesLimit = this.getMinutesPerMonth('free');

    const id = await this.repo.createUsageCycle({
      userId: params.userId,
      plan: 'free',
      minutesLimit,
      minutesUsed: 0,
      cycleStartedAt,
      cycleEndsAt,
      stripeSubscriptionId: null,
    });

    return {
      id,
      userId: params.userId,
      plan: 'free',
      minutesLimit,
      minutesUsed: 0,
      cycleStartedAt,
      cycleEndsAt,
      stripeSubscriptionId: null,
      createdAt: null,
      updatedAt: null,
    };
  }

  private async ensureSubscriptionUsageCycle(params: {
    userId: string;
    stripeSubscriptionId: string;
    currentPeriodEnd: Date | null;
    plan: BillingPlanSlug;
    interval: BillingInterval;
    now: Date;
  }) {
    const window = this.getQuotaWindowFromSubscription({
      now: params.now,
      currentPeriodEnd: params.currentPeriodEnd,
      interval: params.interval,
    });

    const active = await this.repo.getActiveUsageCycleByUserId(
      params.userId,
      params.now,
    );

    const minutesLimit = this.getMinutesPerMonth(params.plan);

    if (active && this.isSameWindow(active, window)) {
      if (active.plan === params.plan) {
        const effectiveMinutesLimit =
          active.minutesLimit >= minutesLimit
            ? active.minutesLimit
            : minutesLimit;

        if (
          effectiveMinutesLimit !== active.minutesLimit ||
          active.stripeSubscriptionId !== params.stripeSubscriptionId
        ) {
          await this.repo.updateUsageCycle(active.id, {
            minutesLimit: effectiveMinutesLimit,
            stripeSubscriptionId: params.stripeSubscriptionId,
          });
          return {
            ...active,
            minutesLimit: effectiveMinutesLimit,
            stripeSubscriptionId: params.stripeSubscriptionId,
          };
        }
        return active;
      }

      if (active.plan === 'lite' && params.plan === 'pro') {
        const carryOverMinutes = Math.max(
          0,
          active.minutesLimit - active.minutesUsed,
        );
        const upgradedMinutesLimit = minutesLimit + carryOverMinutes;

        await this.repo.updateUsageCycle(active.id, {
          cycleEndsAt: params.now,
        });

        const id = await this.repo.createUsageCycle({
          userId: params.userId,
          plan: 'pro',
          minutesLimit: upgradedMinutesLimit,
          minutesUsed: 0,
          cycleStartedAt: window.cycleStartedAt,
          cycleEndsAt: window.cycleEndsAt,
          stripeSubscriptionId: params.stripeSubscriptionId,
        });

        return {
          id,
          userId: params.userId,
          plan: 'pro',
          minutesLimit: upgradedMinutesLimit,
          minutesUsed: 0,
          cycleStartedAt: window.cycleStartedAt,
          cycleEndsAt: window.cycleEndsAt,
          stripeSubscriptionId: params.stripeSubscriptionId,
          createdAt: null,
          updatedAt: null,
        };
      }

      await this.repo.updateUsageCycle(active.id, { cycleEndsAt: params.now });
    } else if (active) {
      await this.repo.updateUsageCycle(active.id, { cycleEndsAt: params.now });
    }

    const id = await this.repo.createUsageCycle({
      userId: params.userId,
      plan: params.plan,
      minutesLimit,
      minutesUsed: 0,
      cycleStartedAt: window.cycleStartedAt,
      cycleEndsAt: window.cycleEndsAt,
      stripeSubscriptionId: params.stripeSubscriptionId,
    });

    return {
      id,
      userId: params.userId,
      plan: params.plan,
      minutesLimit,
      minutesUsed: 0,
      cycleStartedAt: window.cycleStartedAt,
      cycleEndsAt: window.cycleEndsAt,
      stripeSubscriptionId: params.stripeSubscriptionId,
      createdAt: null,
      updatedAt: null,
    };
  }
}
