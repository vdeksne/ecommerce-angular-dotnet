import { Pipe, PipeTransform } from '@angular/core';
import { ConfirmationToken } from '@stripe/stripe-js';
import { PaymentSummary } from '../models/order';

@Pipe({
  name: 'paymentCard',
  standalone: true
})
export class PaymentCardPipe implements PipeTransform {

  transform(value?: ConfirmationToken['payment_method_preview'] | PaymentSummary, ...args: unknown[]): unknown {
    if (value && 'card' in value && value.card) {
      const {brand, last4, exp_month, exp_year} = 
        (value as ConfirmationToken['payment_method_preview']).card!
      return `${brand.toUpperCase()} **** **** **** ${last4}, Exp: ${exp_month}/${exp_year}`;
    } else if (value && 'last4' in value) {
      const {brand, last4, expMonth, expYear} = value as PaymentSummary;
      if (brand === 'apple_pay') {
        return `Apple Pay **** ${last4}`;
      }
      if (expMonth > 0 && expYear > 0) {
        return `${brand.toUpperCase()} **** **** **** ${last4}, Exp: ${expMonth}/${expYear}`;
      }
      return `${brand.toUpperCase()} **** ${last4}`;
    } else if (value && 'type' in value && (value as any).type === 'apple_pay') {
      return 'Apple Pay';
    } else {
      return 'Unknown payment method'
    }
  }

}
