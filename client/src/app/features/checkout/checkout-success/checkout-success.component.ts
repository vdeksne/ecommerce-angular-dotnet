import { Component, inject, OnDestroy, computed } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { SignalrService } from '../../../core/services/signalr.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { AddressPipe } from '../../../shared/pipes/address.pipe';
import { PaymentCardPipe } from '../../../shared/pipes/payment-card.pipe';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../shared/models/order';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [
    MatButton,
    RouterLink,
    MatProgressSpinnerModule,
    DatePipe,
    AddressPipe,
    CurrencyPipe,
    PaymentCardPipe
  ],
  templateUrl: './checkout-success.component.html',
  styleUrl: './checkout-success.component.scss'
})
export class CheckoutSuccessComponent implements OnDestroy {
  signalrService = inject(SignalrService);
  private orderService = inject(OrderService);
  order = computed(() => this.orderService.lastCreatedOrder);

  ngOnDestroy(): void {
    this.orderService.orderComplete = false;
    this.orderService.lastCreatedOrder = null;
    this.signalrService.orderSignal.set(null);
  }
}
