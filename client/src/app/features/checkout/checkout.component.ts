import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { OrderSummaryComponent } from "../../shared/components/order-summary/order-summary.component";
import {MatStepper, MatStepperModule} from '@angular/material/stepper';
import { MatButton } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { StripeService } from '../../core/services/stripe.service';
import { ConfirmationToken, StripeAddressElement, StripeAddressElementChangeEvent, StripePaymentElement, StripePaymentElementChangeEvent } from '@stripe/stripe-js';
import { SnackbarService } from '../../core/services/snackbar.service';
import {MatCheckboxChange, MatCheckboxModule} from '@angular/material/checkbox';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { Address } from '../../shared/models/user';
import { firstValueFrom } from 'rxjs';
import { AccountService } from '../../core/services/account.service';
import { CheckoutDeliveryComponent } from "./checkout-delivery/checkout-delivery.component";
import { CheckoutReviewComponent } from "./checkout-review/checkout-review.component";
import { CartService } from '../../core/services/cart.service';
import { CurrencyPipe } from '@angular/common';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { OrderToCreate, ShippingAddress } from '../../shared/models/order';
import { OrderService } from '../../core/services/order.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    OrderSummaryComponent,
    MatStepperModule,
    MatButton,
    MatCheckboxModule,
    CheckoutDeliveryComponent,
    CheckoutReviewComponent,
    CurrencyPipe,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit, OnDestroy {
  private stripeService = inject(StripeService);
  private snackbar = inject(SnackbarService);
  private router = inject(Router);
  private accountService = inject(AccountService);
  private orderService = inject(OrderService);
  private fb = inject(FormBuilder);
  cartService = inject(CartService);
  addressElement?: StripeAddressElement;
  paymentElement?: StripePaymentElement;
  saveAddress = false;
  completionStatus = signal<{address: boolean, card: boolean, delivery: boolean}>(
    {address: false, card: false, delivery: false}
  );
  confirmationToken?: ConfirmationToken;
  loading = false;
  emailForm!: FormGroup;
  reviewShippingAddress?: ShippingAddress;
  
  get isAuthenticated(): boolean {
    return !!this.accountService.currentUser();
  }
  
  get buyerEmail(): string {
    if (this.isAuthenticated) {
      return this.accountService.currentUser()?.email || '';
    }
    return this.emailForm?.get('email')?.value || '';
  }

  isLocalhost(): boolean {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }

  isFreeOrder(): boolean {
    const total = this.cartService.totals()?.total ?? 0;
    // Consider orders free if total is $0 or below Stripe's minimum ($0.50)
    // This allows checkout without payment for digital art and email collection
    return total === 0 || total < 50; // 50 cents = $0.50
  }

  async ngOnInit() {
    // For free orders, automatically mark payment as complete (no payment needed)
    if (this.isFreeOrder()) {
      this.completionStatus.update(state => {
        state.card = true;
        return state;
      });
    }

    // Initialize email form for guest checkout
    const currentUser = this.accountService.currentUser();
    this.emailForm = this.fb.group({
      email: [
        currentUser?.email || '', 
        [Validators.required, Validators.email]
      ]
    });
    
    try {
      this.addressElement = await this.stripeService.createAddressElement();
      this.addressElement.mount('#address-element');
      this.addressElement.on('change', this.handleAddressChange)

      // Initialize payment element but don't mount yet - mount when step is active
      // For free orders, this will use Setup Intent; for paid orders, Payment Intent
      this.paymentElement = await this.stripeService.createPaymentElement();
      if (this.paymentElement) {
        this.paymentElement.on('change', this.handlePaymentChange);
        
        // Listen for Apple Pay ready event to ensure QR code is available on desktop
        this.paymentElement.on('ready', () => {
          console.log('Payment Element ready - Apple Pay QR code available on desktop');
        });

        // Listen for loader events to debug payment method availability
        this.paymentElement.on('loaderstart', () => {
          console.log('Payment Element loader started - checking available payment methods');
        });

        // Debug: Check what payment methods are available
        this.paymentElement.on('change', (event: any) => {
          if (event.value && event.value.type) {
            console.log('Payment method type:', event.value.type);
          }
          if (event.wallets) {
            console.log('Available wallets:', event.wallets);
          }
        });
      }
    } catch (error: any) {
      this.snackbar.error(error.message);
    }
  }

  handleAddressChange = (event: StripeAddressElementChangeEvent) => {
    const addressComplete = event.complete;
    const emailValid = this.isAuthenticated || (this.emailForm.get('email')?.valid ?? false);
    
    this.completionStatus.update(state => {
      state.address = addressComplete && emailValid;
      return state;
    })
  }
  
  onEmailChange() {
    this.handleAddressChange({ complete: this.completionStatus().address } as StripeAddressElementChangeEvent);
  }

  handlePaymentChange = (event: StripePaymentElementChangeEvent) => {
    this.completionStatus.update(state => {
      state.card = event.complete;
      return state;
    })
  }

  handleDeliveryChange(event: boolean) {
    this.completionStatus.update(state => {
      state.delivery = event;
      return state;
    })
  }

  async getConfirmationToken() {
    try {
      if (Object.values(this.completionStatus()).every(status => status === true)) {
        const result = await this.stripeService.createConfirmationToken();
        if (result.error) throw new Error(result.error.message);
        this.confirmationToken = result.confirmationToken;
        console.log(this.confirmationToken);
      }
    } catch (error: any) {
      this.snackbar.error(error.message);
    }

  }

  async onStepChange(event: StepperSelectionEvent) {
    if (event.selectedIndex === 1) {
      // Only save address if user is authenticated and wants to save it
      if (this.saveAddress && this.isAuthenticated) {
        const address = await this.getAddressFromStripeAddress() as Address;
        if (address) {
          firstValueFrom(this.accountService.updateAddress(address)).catch(err => {
            // Silently fail if address update fails - not critical for checkout
            console.warn('Failed to save address:', err);
          });
        }
      }
    }
    // Determine which step we're on
    const isPaymentStep = event.selectedIndex === 2;
    const isConfirmationStep = event.selectedIndex === 3;

    if (isPaymentStep) {
      // Payment step - mount the payment element when step becomes active
      await firstValueFrom(this.stripeService.createOrUpdatePaymentIntent());
      
      // Wait for DOM to be ready, then mount payment element
      setTimeout(() => {
        if (this.paymentElement) {
          try {
            const element = document.getElementById('payment-element');
            if (element) {
              // Unmount first if already mounted to avoid errors
              try {
                this.paymentElement.unmount();
              } catch (e) {
                // Ignore unmount errors if not mounted
              }
              // Mount the payment element
              this.paymentElement.mount('#payment-element');
              console.log('Payment Element mounted successfully');
              
              // Check for Apple Pay availability after mounting
              setTimeout(() => {
                const applePayButton = document.querySelector('[data-testid="apple-pay-button"], .ApplePayButton, iframe[title*="Apple Pay"], button[id*="apple-pay"]');
                if (applePayButton) {
                  console.log('✅ Apple Pay button found in DOM');
                } else {
                  console.warn('⚠️ Apple Pay button not found. Possible reasons:');
                  console.warn('1. Apple Pay not available in your browser/region');
                  console.warn('2. Domain not verified in Stripe Dashboard (Settings > Payment Methods > Apple Pay)');
                  console.warn('3. Apple Pay not enabled in Stripe account');
                  console.warn('4. Browser/device doesn\'t support Apple Pay');
                  console.warn('5. Using test mode - verify domain in Stripe Dashboard');
                }
              }, 1000);
            } else {
              console.error('Payment element container not found in DOM');
            }
          } catch (error: any) {
            console.error('Error mounting payment element:', error);
            this.snackbar.error('Failed to load payment form. Please refresh the page.');
          }
        } else {
          console.error('Payment Element not initialized');
        }
      }, 200);
    }
    if (isConfirmationStep) {
      // Skip confirmation token for free orders
      if (!this.isFreeOrder()) {
        await this.getConfirmationToken();
      } else {
        // For free orders, mark card as complete (no payment needed)
        this.completionStatus.update(state => {
          state.card = true;
          return state;
        });
        // Get shipping address for review display
        const address = await this.getAddressFromStripeAddress() as ShippingAddress;
        if (address) {
          this.reviewShippingAddress = address;
        }
      }
    }
  }

  async confirmPayment(stepper: MatStepper) {
    this.loading = true;
    try {
      // Handle free orders (use Setup Intent to save payment method for future use)
      if (this.isFreeOrder()) {
        const cart = this.cartService.cart();
        
        // If Setup Intent is available, confirm it to save payment method
        if (cart?.setupClientSecret && this.paymentElement) {
          try {
            const { setupIntent, error } = await this.stripeService.confirmSetupIntent();
            if (error) {
              console.warn('Setup Intent confirmation failed:', error);
              // Continue with order creation even if Setup Intent fails
            } else if (setupIntent) {
              console.log('Payment method saved successfully:', setupIntent.payment_method);
            }
          } catch (error) {
            console.warn('Error confirming Setup Intent:', error);
            // Continue with order creation even if Setup Intent fails
          }
        }

        // Create order (payment method saved or skipped)
        const order = await this.createOrderModel();
        const orderResult = await firstValueFrom(this.orderService.createOrder(order));
        if (orderResult) {
          this.cartService.deleteCart();
          this.cartService.selectedDelivery.set(null);
          this.router.navigateByUrl('/checkout/success');
        } else {
          throw new Error('Order creation failed');
        }
        return;
      }

      // Handle paid orders (require Stripe payment)
      if (this.confirmationToken) {
        const result = await this.stripeService.confirmPayment(this.confirmationToken);

        if (result.paymentIntent?.status === 'succeeded') {
          const order = await this.createOrderModel();
          const orderResult = await firstValueFrom(this.orderService.createOrder(order));
          if (orderResult) {
            // Order is already marked as complete in the service
            this.cartService.deleteCart();
            this.cartService.selectedDelivery.set(null);
            this.router.navigateByUrl('/checkout/success');
          } else {
            throw new Error('Order creation failed');
          } 
        } else if (result.error) {
          throw new Error(result.error.message);
        } else {
          throw new Error('Something went wrong');
        }
      } else {
        throw new Error('Payment confirmation required');
      }
    } catch (error: any) {
      this.snackbar.error(error.message || 'Something went wrong');
      stepper.previous();
    } finally {
      this.loading = false;
    }
  }

  private async createOrderModel(): Promise<OrderToCreate> {
    const cart = this.cartService.cart();
    const shippingAddress = await this.getAddressFromStripeAddress() as ShippingAddress;
    const paymentMethodPreview = this.confirmationToken?.payment_method_preview;
    const card = paymentMethodPreview?.card;

    if (!cart?.id || !cart.deliveryMethodId || !shippingAddress) {
      throw new Error('Problem creating order');
    }

    // Get email from authenticated user if available, otherwise from form
    const buyerEmail = this.buyerEmail;
    
    if (!buyerEmail) {
      throw new Error('Email is required for checkout');
    }

    // Handle free orders (no payment required)
    let paymentSummary = null;
    if (!this.isFreeOrder()) {
      // Handle both card and Apple Pay payments
      if (card) {
        // Standard card payment
        paymentSummary = {
          last4: +card.last4,
          brand: card.brand,
          expMonth: card.exp_month,
          expYear: card.exp_year
        };
      } else {
        // Apple Pay or other payment methods - use defaults
        // For Apple Pay, the card info might not be available in the preview
        // but the payment will still process correctly
        const paymentType = (paymentMethodPreview as any)?.type || 'unknown';
        paymentSummary = {
          last4: 0,
          brand: paymentType === 'apple_pay' ? 'apple_pay' : paymentType,
          expMonth: 0,
          expYear: 0
        };
      }
    }

    return {
      cartId: cart.id,
      paymentSummary,
      deliveryMethodId: cart.deliveryMethodId,
      shippingAddress,
      discount: this.cartService.totals()?.discount,
      buyerEmail
    }
  }

  private async getAddressFromStripeAddress(): Promise<Address | ShippingAddress | null> {
    const result = await this.addressElement?.getValue();
    const address = result?.value.address;

    if (address) {
      return {
        name: result.value.name,
        line1: address.line1,
        line2: address.line2 || undefined,
        city: address.city,
        country: address.country,
        state: address.state,
        postalCode: address.postal_code
      }
    } else return null;
  }

  onSaveAddressCheckboxChange(event: MatCheckboxChange) {
    this.saveAddress = event.checked;
  }

  ngOnDestroy(): void {
    this.stripeService.disposeElements();
  }
}
