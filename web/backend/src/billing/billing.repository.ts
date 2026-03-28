import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db';
import { billingCustomers } from '../schema/billing-customers';
import { stripeEvents } from '../schema/stripe-events';
import { subscriptions } from '../schema/subscriptions';

type SubscriptionUpsertInput = {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  priceId: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
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
}
