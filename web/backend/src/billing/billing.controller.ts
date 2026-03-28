import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Get,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';

type RequestWithUser = Request & { user?: { userId: string; email: string } };

@Controller('backend/billing')
export class BillingController {
  constructor(
    private billing: BillingService,
    private stripeService: StripeService,
  ) {}

  @Get('plans')
  listPlans() {
    return { plans: this.billing.listPlans() };
  }

  @Post('checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Req() req: RequestWithUser,
    @Body() body: CreateCheckoutSessionDto,
  ) {
    const userId = req.user?.userId;
    const email = req.user?.email;
    if (!userId || !email) {
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost';
    const successUrl = `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/pricing`;

    try {
      const interval = body.interval ?? 'month';
      return await this.billing.createCheckoutSession({
        userId,
        email,
        plan: body.plan,
        interval,
        successUrl,
        cancelUrl,
      });
    } catch (err) {
      throw new HttpException(
        err instanceof Error
          ? err.message
          : 'failed to create checkout session',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  async createPortalSession(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost';
    const returnUrl = `${baseUrl}/settings/billing`;

    try {
      return await this.billing.createPortalSession({ userId, returnUrl });
    } catch (err) {
      throw new HttpException(
        err instanceof Error ? err.message : 'failed to create portal session',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('entitlement')
  @UseGuards(JwtAuthGuard)
  async getEntitlement(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    }

    return await this.billing.getEntitlement(userId);
  }

  @Post('webhook')
  @SkipThrottle()
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    const stripe = this.stripeService.getClient();
    const webhookSecret = this.stripeService.getWebhookSecret();

    if (!stripe || !webhookSecret) {
      throw new HttpException(
        'stripe is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!signature) {
      throw new HttpException('missing signature', HttpStatus.BAD_REQUEST);
    }

    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      throw new HttpException('missing raw body', HttpStatus.BAD_REQUEST);
    }

    try {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
      await this.billing.handleStripeWebhookEvent(event);
      return { received: true };
    } catch {
      throw new HttpException('invalid signature', HttpStatus.BAD_REQUEST);
    }
  }
}
