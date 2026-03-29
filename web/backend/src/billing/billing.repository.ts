import { Injectable } from '@nestjs/common';
import { and, desc, eq, gt, lte } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db';
import { billingCustomers } from '../schema';
import { billingUsageCycles } from '../schema';
import { stripeEvents } from '../schema';
import { subscriptions } from '../schema';

type SubscriptionUpsertInput = {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  priceId: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

type UsageCycleCreateInput = {
  userId: string;
  plan: string;
  minutesLimit: number;
  minutesUsed: number;
  cycleStartedAt: Date;
  cycleEndsAt: Date;
  stripeSubscriptionId: string | null;
};

@Injectable()
export class BillingRepository {
  async getStripeCustomerIdByUserId(userId: string) {
    const res = await db
      .select()
      .from(billingCustomers)
      .where(eq(billingCustomers.userId, userId));
    return res[0]?.stripeCustomerId ?? null;
  }

  async getUserIdByStripeCustomerId(stripeCustomerId: string) {
    const res = await db
      .select()
      .from(billingCustomers)
      .where(eq(billingCustomers.stripeCustomerId, stripeCustomerId));
    return res[0]?.userId ?? null;
  }

  async createBillingCustomerMapping(userId: string, stripeCustomerId: string) {
    await db.insert(billingCustomers).values({ userId, stripeCustomerId });
  }

  async upsertSubscription(input: SubscriptionUpsertInput) {
    const existing = await db
      .select()
      .from(subscriptions)
      .where(
        eq(subscriptions.stripeSubscriptionId, input.stripeSubscriptionId),
      );

    if (existing.length === 0) {
      const id = crypto.randomUUID();
      await db.insert(subscriptions).values({
        id,
        userId: input.userId,
        stripeCustomerId: input.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        status: input.status,
        priceId: input.priceId,
        currentPeriodEnd: input.currentPeriodEnd ?? undefined,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      });
      return;
    }

    await db
      .update(subscriptions)
      .set({
        userId: input.userId,
        stripeCustomerId: input.stripeCustomerId,
        status: input.status,
        priceId: input.priceId,
        currentPeriodEnd: input.currentPeriodEnd ?? undefined,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        updatedAt: new Date(),
      })
      .where(
        eq(subscriptions.stripeSubscriptionId, input.stripeSubscriptionId),
      );
  }

  async getLatestSubscriptionByUserId(userId: string) {
    const res = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.updatedAt))
      .limit(1);
    return res[0] ?? null;
  }

  async hasProcessedStripeEvent(eventId: string) {
    const res = await db
      .select()
      .from(stripeEvents)
      .where(eq(stripeEvents.id, eventId));
    return res.length > 0;
  }

  async markStripeEventProcessed(
    eventId: string,
    type: string,
    stripeCreatedAt: Date | null,
  ) {
    await db.insert(stripeEvents).values({
      id: eventId,
      type,
      stripeCreatedAt: stripeCreatedAt ?? undefined,
    });
  }

  async getActiveSubscriptionByUserId(userId: string) {
    const res = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active'),
        ),
      )
      .orderBy(desc(subscriptions.updatedAt))
      .limit(1);
    return res[0] ?? null;
  }

  async getActiveUsageCycleByUserId(userId: string, now = new Date()) {
    const res = await db
      .select()
      .from(billingUsageCycles)
      .where(
        and(
          eq(billingUsageCycles.userId, userId),
          lte(billingUsageCycles.cycleStartedAt, now),
          gt(billingUsageCycles.cycleEndsAt, now),
        ),
      )
      .orderBy(desc(billingUsageCycles.cycleStartedAt))
      .limit(1);
    return res[0] ?? null;
  }

  async createUsageCycle(input: UsageCycleCreateInput) {
    const id = crypto.randomUUID();
    await db.insert(billingUsageCycles).values({
      id,
      userId: input.userId,
      plan: input.plan,
      minutesLimit: input.minutesLimit,
      minutesUsed: input.minutesUsed,
      cycleStartedAt: input.cycleStartedAt,
      cycleEndsAt: input.cycleEndsAt,
      stripeSubscriptionId: input.stripeSubscriptionId ?? undefined,
    });
    return id;
  }

  async updateUsageCycle(
    id: string,
    patch: Partial<{
      plan: string;
      minutesLimit: number;
      minutesUsed: number;
      cycleStartedAt: Date;
      cycleEndsAt: Date;
      stripeSubscriptionId: string | null;
    }>,
  ) {
    await db
      .update(billingUsageCycles)
      .set({
        plan: patch.plan,
        minutesLimit: patch.minutesLimit,
        minutesUsed: patch.minutesUsed,
        cycleStartedAt: patch.cycleStartedAt,
        cycleEndsAt: patch.cycleEndsAt,
        stripeSubscriptionId: patch.stripeSubscriptionId ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(billingUsageCycles.id, id));
  }
}
