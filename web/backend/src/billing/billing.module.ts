import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingRepository } from './billing.repository';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';

@Module({
  controllers: [BillingController],
  providers: [BillingRepository, BillingService, StripeService],
})
export class BillingModule {}
