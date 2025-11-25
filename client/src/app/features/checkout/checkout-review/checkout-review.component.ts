import { Component, inject, Input } from '@angular/core';
import { CartService } from '../../../core/services/cart.service';
import { CurrencyPipe } from '@angular/common';
import { ConfirmationToken } from '@stripe/stripe-js';
import { AddressPipe } from "../../../shared/pipes/address.pipe";
import { PaymentCardPipe } from "../../../shared/pipes/payment-card.pipe";
import { ShippingAddress } from '../../../shared/models/order';

@Component({
  selector: 'app-checkout-review',
  standalone: true,
  imports: [
    CurrencyPipe,
    AddressPipe,
    PaymentCardPipe
],
  templateUrl: './checkout-review.component.html',
  styleUrl: './checkout-review.component.scss'
})
export class CheckoutReviewComponent {
  cartService = inject(CartService);
  @Input() confirmationToken?: ConfirmationToken;
  @Input() shippingAddress?: ShippingAddress;

  isFreeOrder(): boolean {
    const total = this.cartService.totals()?.total ?? 0;
    // Consider orders free if total is $0 or below Stripe's minimum ($0.50)
    return total === 0 || total < 50; // 50 cents = $0.50
  }
}
