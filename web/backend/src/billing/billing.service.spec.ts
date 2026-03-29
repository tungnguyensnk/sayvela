import { BillingService } from './billing.service';
import { BillingRepository } from './billing.repository';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';

describe('BillingService', () => {
  const getStripeCustomerIdByUserId = jest.fn<
    Promise<string | null>,
    [string]
  >();
  const createBillingCustomerMapping = jest.fn<
    Promise<void>,
    [string, string]
  >();
  const upsertSubscription = jest.fn<Promise<void>, [any]>();
  const getActiveSubscriptionByUserId = jest.fn<Promise<any>, [string]>();
  const getActiveUsageCycleByUserId = jest.fn<Promise<any>, [string, Date?]>();
  const createUsageCycle = jest.fn<Promise<string>, [any]>();
  const updateUsageCycle = jest.fn<Promise<void>, [string, any]>();
  const hasProcessedStripeEvent = jest.fn<Promise<boolean>, [string]>();
  const markStripeEventProcessed = jest.fn<
    Promise<void>,
    [string, string, Date | null]
  >();
  const getUserIdByStripeCustomerId = jest.fn<
    Promise<string | null>,
    [string]
  >();

  const repo = {
    getStripeCustomerIdByUserId,
    createBillingCustomerMapping,
    upsertSubscription,
    getActiveSubscriptionByUserId,
    getActiveUsageCycleByUserId,
    createUsageCycle,
    updateUsageCycle,
    hasProcessedStripeEvent,
    markStripeEventProcessed,
    getUserIdByStripeCustomerId,
  } as unknown as BillingRepository;

  const stripeCustomersCreate = jest.fn();
  const stripeCheckoutSessionsCreate = jest.fn();
  const stripeSubscriptionsRetrieve = jest.fn();
  const stripe = {
    customers: { create: stripeCustomersCreate },
    checkout: { sessions: { create: stripeCheckoutSessionsCreate } },
    subscriptions: { retrieve: stripeSubscriptionsRetrieve },
    webhooks: { constructEvent: jest.fn() },
  } as unknown as Stripe;

  const getClient = jest.fn<Stripe | null, []>(() => stripe);
  const getWebhookSecret = jest.fn<string | null, []>();

  const stripeService = {
    getClient,
    getWebhookSecret,
  } as unknown as StripeService;

  const service = new BillingService(repo, stripeService);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-15T00:00:00.000Z'));
    getClient.mockReturnValue(stripe);
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_monthly';
    process.env.STRIPE_PRICE_PRO_YEARLY = 'price_pro_yearly';
    process.env.STRIPE_PRICE_LITE_MONTHLY = 'price_lite_monthly';
    process.env.STRIPE_PRICE_LITE_YEARLY = 'price_lite_yearly';
    getActiveUsageCycleByUserId.mockResolvedValue(null);
    createUsageCycle.mockResolvedValue('cycle_1');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates checkout session with existing stripe customer', async () => {
    getStripeCustomerIdByUserId.mockResolvedValue('cus_1');
    stripeCheckoutSessionsCreate.mockResolvedValue({
      url: 'https://stripe/checkout',
    });

    const res = await service.createCheckoutSession({
      userId: 'u1',
      email: 'u1@sayvela.local',
      plan: 'pro',
      interval: 'month',
      successUrl: 'https://app/success',
      cancelUrl: 'https://app/cancel',
    });

    expect(stripeCustomersCreate).not.toHaveBeenCalled();
    expect(createBillingCustomerMapping).not.toHaveBeenCalled();
    expect(stripeCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer: 'cus_1',
        line_items: [{ price: 'price_pro_monthly', quantity: 1 }],
      }),
    );
    expect(res).toEqual({ url: 'https://stripe/checkout' });
  });

  it('creates stripe customer when mapping is missing', async () => {
    getStripeCustomerIdByUserId.mockResolvedValue(null);
    stripeCustomersCreate.mockResolvedValue({ id: 'cus_2' });
    stripeCheckoutSessionsCreate.mockResolvedValue({
      url: 'https://stripe/checkout2',
    });

    const res = await service.createCheckoutSession({
      userId: 'u2',
      email: 'u2@sayvela.local',
      plan: 'pro',
      interval: 'year',
      successUrl: 'https://app/success',
      cancelUrl: 'https://app/cancel',
    });

    expect(stripeCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'u2@sayvela.local',
        metadata: { userId: 'u2' },
      }),
    );
    expect(createBillingCustomerMapping).toHaveBeenCalledWith('u2', 'cus_2');
    expect(stripeCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_2',
        line_items: [{ price: 'price_pro_yearly', quantity: 1 }],
      }),
    );
    expect(res).toEqual({ url: 'https://stripe/checkout2' });
  });

  it('creates checkout session for lite yearly', async () => {
    getStripeCustomerIdByUserId.mockResolvedValue('cus_3');
    stripeCheckoutSessionsCreate.mockResolvedValue({
      url: 'https://stripe/lite-year',
    });

    const res = await service.createCheckoutSession({
      userId: 'u3',
      email: 'u3@sayvela.local',
      plan: 'lite',
      interval: 'year',
      successUrl: 'https://app/success',
      cancelUrl: 'https://app/cancel',
    });

    expect(stripeCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_3',
        line_items: [{ price: 'price_lite_yearly', quantity: 1 }],
      }),
    );
    expect(res).toEqual({ url: 'https://stripe/lite-year' });
  });

  it('returns free entitlement when no active subscription exists', async () => {
    getActiveSubscriptionByUserId.mockResolvedValue(null);

    const res = await service.getEntitlement('u_free');

    expect(res).toEqual(
      expect.objectContaining({
        plan: 'free',
        minutesPerMonth: 300,
        minutesUsed: 0,
        minutesRemaining: 300,
        usagePercentage: 0,
        upgradeRecommendation: 'lite',
      }),
    );
    expect(createUsageCycle).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u_free',
        plan: 'free',
        minutesLimit: 300,
        minutesUsed: 0,
      }),
    );
  });

  it('returns lite entitlement when subscription price is lite', async () => {
    getActiveSubscriptionByUserId.mockResolvedValue({
      priceId: 'price_lite_monthly',
      stripeSubscriptionId: 'sub_lite',
      currentPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
    });

    const res = await service.getEntitlement('u_lite');

    expect(res.plan).toBe('lite');
    expect(res.minutesPerMonth).toBe(900);
    expect(res.minutesRemaining).toBe(900);
    expect(res.upgradeRecommendation).toBe('pro');
    expect(res.features).toEqual(
      expect.objectContaining({
        extendedHistory: true,
        dualAudio: false,
      }),
    );
  });

  it('returns pro entitlement when subscription price is pro', async () => {
    getActiveSubscriptionByUserId.mockResolvedValue({
      priceId: 'price_pro_yearly',
      stripeSubscriptionId: 'sub_pro',
      currentPeriodEnd: new Date('2027-03-15T00:00:00.000Z'),
    });

    const res = await service.getEntitlement('u_pro');

    expect(res.plan).toBe('pro');
    expect(res.minutesPerMonth).toBe(2400);
    expect(res.upgradeRecommendation).toBeNull();
    expect(res.features).toEqual(
      expect.objectContaining({
        extendedHistory: true,
        dualAudio: true,
      }),
    );
  });

  it('skips webhook processing when event already processed', async () => {
    hasProcessedStripeEvent.mockResolvedValue(true);

    await service.handleStripeWebhookEvent({
      id: 'evt_1',
      type: 'any',
      created: 0,
    } as unknown as Stripe.Event);

    expect(markStripeEventProcessed).not.toHaveBeenCalled();
    expect(upsertSubscription).not.toHaveBeenCalled();
  });

  it('upserts subscription from checkout.session.completed', async () => {
    hasProcessedStripeEvent.mockResolvedValue(false);
    markStripeEventProcessed.mockResolvedValue();

    stripeSubscriptionsRetrieve.mockResolvedValue({
      id: 'sub_1',
      customer: 'cus_1',
      status: 'active',
      current_period_end: 1_700_000_000,
      cancel_at_period_end: false,
      items: { data: [{ price: { id: 'price_pro_monthly' } }] },
    });

    await service.handleStripeWebhookEvent({
      id: 'evt_2',
      type: 'checkout.session.completed',
      created: 1_700_000_000,
      data: {
        object: {
          subscription: 'sub_1',
          customer: 'cus_1',
          metadata: { userId: 'u1' },
        },
      },
    } as unknown as Stripe.Event);

    expect(stripeSubscriptionsRetrieve).toHaveBeenCalledWith('sub_1');
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: 'sub_1',
        status: 'active',
        priceId: 'price_pro_monthly',
      }),
    );
    expect(createUsageCycle).toHaveBeenCalled();
  });

  it('preserves minutes when upgrading lite to pro within same cycle', async () => {
    hasProcessedStripeEvent.mockResolvedValue(false);
    markStripeEventProcessed.mockResolvedValue();

    const cycleStartedAt = new Date('2026-03-01T00:00:00.000Z');
    const cycleEndsAt = new Date('2026-04-01T00:00:00.000Z');

    getActiveUsageCycleByUserId.mockResolvedValue({
      id: 'cycle_lite',
      userId: 'u1',
      plan: 'lite',
      minutesLimit: 900,
      minutesUsed: 280,
      cycleStartedAt,
      cycleEndsAt,
      stripeSubscriptionId: 'sub_1',
      createdAt: null,
      updatedAt: null,
    });

    await service.handleStripeWebhookEvent({
      id: 'evt_3',
      type: 'customer.subscription.updated',
      created: 1_700_000_000,
      data: {
        object: {
          id: 'sub_1',
          customer: 'cus_1',
          status: 'active',
          current_period_end: Math.floor(cycleEndsAt.getTime() / 1000),
          cancel_at_period_end: false,
          metadata: { userId: 'u1' },
          items: { data: [{ price: { id: 'price_pro_monthly' } }] },
        },
      },
    } as unknown as Stripe.Event);

    expect(updateUsageCycle).toHaveBeenCalledWith(
      'cycle_lite',
      expect.objectContaining({
        plan: 'pro',
        minutesLimit: 2400,
      }),
    );
    expect(createUsageCycle).not.toHaveBeenCalled();
  });
});
