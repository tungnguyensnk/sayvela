import { IsIn, IsOptional, IsString } from 'class-validator';
import type { BillingInterval, BillingPlanSlug } from '../billing.plans';

export class CreateCheckoutSessionDto {
  @IsString()
  @IsIn(['lite', 'pro'] satisfies BillingPlanSlug[])
  plan!: BillingPlanSlug;

  @IsOptional()
  @IsString()
  @IsIn(['month', 'year'] satisfies BillingInterval[])
  interval?: BillingInterval;
}
