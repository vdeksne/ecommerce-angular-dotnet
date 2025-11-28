import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { OrderSummaryComponent } from '../../shared/components/order-summary/order-summary.component';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatButton } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { StripeService } from '../../core/services/stripe.service';
import {
  ConfirmationToken,
  StripeAddressElement,
  StripeAddressElementChangeEvent,
  StripePaymentElement,
  StripePaymentElementChangeEvent,
} from '@stripe/stripe-js';
import { SnackbarService } from '../../core/services/snackbar.service';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { Address } from '../../shared/models/user';
import { firstValueFrom } from 'rxjs';
import { AccountService } from '../../core/services/account.service';
import { CheckoutDeliveryComponent } from './checkout-delivery/checkout-delivery.component';
import { CheckoutReviewComponent } from './checkout-review/checkout-review.component';
import { CartService } from '../../core/services/cart.service';
import { CurrencyPipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderToCreate, ShippingAddress } from '../../shared/models/order';
import { OrderService } from '../../core/services/order.service';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
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
    MatInputModule,
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
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
  private paymentElementMounted = false;
  saveAddress = false;
  completionStatus = signal<{
    address: boolean;
    card: boolean;
    delivery: boolean;
  }>({ address: false, card: false, delivery: false });
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
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
  }

  isFreeOrder(): boolean {
    // DISABLED: All orders now require payment
    return false;
  }

  async ngOnInit() {
    // Payment always required - no free orders

    // Initialize email form for guest checkout
    const currentUser = this.accountService.currentUser();
    this.emailForm = this.fb.group({
      email: [
        currentUser?.email || '',
        [Validators.required, Validators.email],
      ],
    });

    try {
      console.log('Initializing Stripe elements...');

      // First, verify Stripe can load
      try {
        const stripe = await this.stripeService.getStripeInstance();
        if (!stripe) {
          throw new Error(
            'Stripe failed to initialize. Check your Stripe public key.'
          );
        }
        console.log('Stripe loaded successfully');
      } catch (stripeError: any) {
        console.error('Stripe loading error:', stripeError);
        this.snackbar.error(
          `Failed to load Stripe: ${
            stripeError.message || 'Unknown error'
          }. Please refresh the page.`
        );
        return;
      }

      this.addressElement = await this.stripeService.createAddressElement();
      this.addressElement.mount('#address-element');
      this.addressElement.on('change', this.handleAddressChange);
      console.log('Address element initialized');

      // Initialize payment element but don't mount yet - mount when step is active
      this.paymentElement = await this.stripeService.createPaymentElement();
      if (this.paymentElement) {
        this.paymentElement.on('change', this.handlePaymentChange);
        console.log('Payment element initialized');
      } else {
        console.error('Payment element creation returned null');
        this.snackbar.error(
          'Failed to create payment form. Please refresh the page.'
        );
      }
    } catch (error: any) {
      console.error('Error initializing checkout:', error);
      const errorMessage = error.message || 'Failed to initialize payment form';
      this.snackbar.error(
        `${errorMessage}. Please refresh the page or check your internet connection.`
      );
    }
  }

  handleAddressChange = async (event: StripeAddressElementChangeEvent) => {
    const addressComplete = event.complete;
    const emailValid =
      this.isAuthenticated || (this.emailForm.get('email')?.valid ?? false);

    this.completionStatus.update((state) => {
      state.address = addressComplete && emailValid;
      return state;
    });

    // Store the address when it's complete for use in review step
    if (addressComplete && emailValid) {
      try {
        // Wait a bit for Stripe to fully update the address value
        await new Promise((resolve) => setTimeout(resolve, 100));
        const address = await this.getAddressFromStripeAddress();
        if (address && address.line1) {
          this.reviewShippingAddress = address as ShippingAddress;
          console.log(
            'Address stored when completed:',
            this.reviewShippingAddress
          );
        } else {
          console.warn(
            'Address element marked complete but address data not yet available'
          );
        }
      } catch (error: any) {
        console.warn('Could not store address yet:', error);
        // Don't block - will retrieve again in confirmation step
      }
    }
  };

  onEmailChange() {
    this.handleAddressChange({
      complete: this.completionStatus().address,
    } as StripeAddressElementChangeEvent);
  }

  handlePaymentChange = (event: StripePaymentElementChangeEvent) => {
    this.completionStatus.update((state) => {
      state.card = event.complete;
      return state;
    });
  };

  handleDeliveryChange(event: boolean) {
    // Defer signal update to avoid ExpressionChangedAfterItHasBeenCheckedError
    // This happens when delivery status is set synchronously during component initialization
    Promise.resolve().then(() => {
      this.completionStatus.update((state) => {
        state.delivery = event;
        return state;
      });
    });
  }

  async getConfirmationToken() {
    try {
      if (
        Object.values(this.completionStatus()).every(
          (status) => status === true
        )
      ) {
        const result = await this.stripeService.createConfirmationToken();
        if (result.error) throw new Error(result.error.message);
        this.confirmationToken = result.confirmationToken;
        // Log confirmation token info (without sensitive data)
        if (this.confirmationToken) {
          console.log('Confirmation token created:', {
            id: this.confirmationToken.id,
            livemode: this.confirmationToken.livemode,
            hasPaymentIntent: !!this.confirmationToken.payment_intent,
            paymentMethodType:
              this.confirmationToken.payment_method_preview?.type,
          });
        }
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error creating confirmation token:', error);
      throw error;
    }
  }

  async onPaymentStepNext(stepper: MatStepper) {
    // Create confirmation token BEFORE moving to confirmation step
    // This ensures payment element is still visible/mounted
    if (!this.completionStatus().card) {
      this.snackbar.error('Please complete the payment details');
      return;
    }

    this.loading = true;
    try {
      // Ensure payment intent exists
      let cart = this.cartService.cart();
      if (!cart?.clientSecret) {
        cart = await firstValueFrom(
          this.stripeService.createOrUpdatePaymentIntent()
        );
        if (!cart?.clientSecret) {
          throw new Error('Failed to create payment intent. Please try again.');
        }
      }

      // Create confirmation token while payment element is still visible
      await this.getConfirmationToken();

      // Get shipping address before moving to confirmation
      try {
        const address = await this.getAddressFromStripeAddress();
        if (address && address.line1) {
          this.reviewShippingAddress = address as ShippingAddress;
        }
      } catch (error: any) {
        console.warn('Could not retrieve address:', error);
      }

      // Now move to confirmation step
      stepper.next();
    } catch (error: any) {
      console.error('Error preparing for confirmation:', error);
      this.snackbar.error(
        error.message || 'Failed to prepare order. Please try again.'
      );
    } finally {
      this.loading = false;
    }
  }

  async onStepChange(event: StepperSelectionEvent) {
    if (event.selectedIndex === 1) {
      // Only save address if user is authenticated and wants to save it
      if (this.saveAddress && this.isAuthenticated) {
        const address = (await this.getAddressFromStripeAddress()) as Address;
        if (address) {
          firstValueFrom(this.accountService.updateAddress(address)).catch(
            (err) => {
              // Silently fail if address update fails - not critical for checkout
              console.warn('Failed to save address:', err);
            }
          );
        }
      }

      // Always store the address when leaving the address step (for review)
      try {
        const address = await this.getAddressFromStripeAddress();
        if (address && address.line1) {
          this.reviewShippingAddress = address as ShippingAddress;
          console.log(
            'Address stored when leaving address step:',
            this.reviewShippingAddress
          );
        }
      } catch (error: any) {
        console.warn(
          'Could not store address when leaving address step:',
          error
        );
      }
    }
    // Determine which step we're on
    const isPaymentStep = event.selectedIndex === 2;
    const isConfirmationStep = event.selectedIndex === 3;

    if (isPaymentStep) {
      // Payment step - mount the payment element when step becomes active
      // Only mount once to avoid multiple Stripe API calls
      if (!this.paymentElementMounted) {
        // Only create/update payment intent if we don't already have one
        const cart = this.cartService.cart();
        if (!cart?.clientSecret) {
          await firstValueFrom(
            this.stripeService.createOrUpdatePaymentIntent()
          );
        }

        // Wait for DOM to be ready, then mount payment element
        setTimeout(() => {
          if (this.paymentElement && !this.paymentElementMounted) {
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
                this.paymentElementMounted = true;
                console.log('Payment Element mounted successfully');
              } else {
                console.error('Payment element container not found in DOM');
              }
            } catch (error: any) {
              console.error('Error mounting payment element:', error);
              this.snackbar.error(
                'Failed to load payment form. Please refresh the page.'
              );
            }
          } else if (this.paymentElementMounted) {
            console.log('Payment Element already mounted, skipping remount');
          } else {
            console.error('Payment Element not initialized');
          }
        }, 200);
      }
    }
    if (isConfirmationStep) {
      // Confirmation token should already be created when leaving payment step
      // Just ensure we have address for display
      if (!this.reviewShippingAddress || !this.reviewShippingAddress.line1) {
        // Try to get address from confirmation token first
        const shipping = this.confirmationToken?.shipping;
        const shippingAddress = shipping?.address;
        if (shipping && shippingAddress) {
          this.reviewShippingAddress = {
            name: shipping.name || 'Unknown',
            line1: shippingAddress.line1 || '',
            line2: shippingAddress.line2 || undefined,
            city: shippingAddress.city || '',
            state: shippingAddress.state || '',
            postalCode: shippingAddress.postal_code || '',
            country: shippingAddress.country || '',
          };
          console.log(
            '✅ Shipping address from confirmation token:',
            this.reviewShippingAddress
          );
        } else {
          // Fallback: try to get from address element
          try {
            const address = await this.getAddressFromStripeAddress();
            if (address && address.line1) {
              this.reviewShippingAddress = address as ShippingAddress;
              console.log(
                '✅ Shipping address retrieved from address element:',
                this.reviewShippingAddress
              );
            }
          } catch (error: any) {
            console.warn('Could not retrieve address:', error);
          }
        }
      }
    }
  }

  async confirmPayment(stepper: MatStepper) {
    this.loading = true;
    try {
      // All orders require payment
      if (!this.confirmationToken) {
        throw new Error(
          'Payment confirmation required. Please complete payment details.'
        );
      }

      const result = await this.stripeService.confirmPayment(
        this.confirmationToken
      );

      if (result.paymentIntent?.status === 'succeeded') {
        const order = await this.createOrderModel();
        const orderResult = await firstValueFrom(
          this.orderService.createOrder(order)
        );
        if (orderResult) {
          this.cartService.deleteCart();
          this.cartService.selectedDelivery.set(null);
          this.router.navigateByUrl('/checkout/success');
        } else {
          throw new Error(
            'Order creation failed. Please contact support if payment was charged.'
          );
        }
      } else if (result.paymentIntent?.status === 'requires_action') {
        // Payment requires additional authentication (3D Secure)
        throw new Error(
          'Payment requires additional authentication. Please complete the verification.'
        );
      } else if (result.error) {
        throw new Error(
          result.error.message || 'Payment failed. Please try again.'
        );
      } else {
        throw new Error(
          `Payment failed with status: ${
            result.paymentIntent?.status || 'unknown'
          }. Please try again.`
        );
      }
    } catch (error: any) {
      console.error('Payment confirmation error:', error);

      // Provide user-friendly error messages
      let errorMessage = 'Payment failed. Please try again.';

      if (error.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes('stripe')) {
          errorMessage =
            'Unable to process payment. Please refresh the page and try again.';
        } else if (msg.includes('card') || msg.includes('payment method')) {
          errorMessage =
            'Invalid card details. Please check your card information and try again.';
        } else if (msg.includes('network') || msg.includes('connection')) {
          errorMessage =
            'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      this.snackbar.error(errorMessage);
      stepper.previous();
    } finally {
      this.loading = false;
    }
  }

  private async createOrderModel(): Promise<OrderToCreate> {
    const cart = this.cartService.cart();
    const shippingAddress =
      (await this.getAddressFromStripeAddress()) as ShippingAddress;
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

    // All orders require payment - always create payment summary
    let paymentSummary;
    if (card) {
      // Standard card payment
      paymentSummary = {
        last4: +card.last4,
        brand: card.brand,
        expMonth: card.exp_month,
        expYear: card.exp_year,
      };
    } else {
      // Apple Pay or other payment methods - use defaults
      // For Apple Pay, the card info might not be available in the preview
      // but the payment will still process correctly
      const paymentType = (paymentMethodPreview as any)?.type || 'card';
      paymentSummary = {
        last4: 0,
        brand: paymentType === 'apple_pay' ? 'apple_pay' : paymentType,
        expMonth: 0,
        expYear: 0,
      };
    }

    if (!paymentSummary) {
      throw new Error('Payment summary is required');
    }

    return {
      cartId: cart.id,
      paymentSummary,
      deliveryMethodId: cart.deliveryMethodId,
      shippingAddress,
      discount: this.cartService.totals()?.discount,
      buyerEmail,
    };
  }

  private async getAddressFromStripeAddress(): Promise<
    Address | ShippingAddress | null
  > {
    if (!this.addressElement) {
      console.warn('Address element not available');
      return null;
    }

    try {
      // Get the current value from the address element
      const result = await this.addressElement.getValue();
      console.log('Raw address element result:', {
        complete: result?.complete,
        value: result?.value,
      });

      const address = result?.value?.address;
      const name = result?.value?.name || '';

      if (address && address.line1) {
        const shippingAddress: ShippingAddress = {
          name: name || 'Unknown',
          line1: address.line1 || '',
          line2: address.line2 || undefined,
          city: address.city || '',
          country: address.country || '',
          state: address.state || '',
          postalCode: address.postal_code || '',
        };
        console.log('Extracted shipping address:', shippingAddress);
        return shippingAddress;
      } else {
        console.warn('Address data incomplete - missing line1:', {
          hasAddress: !!address,
          hasLine1: !!address?.line1,
          address: address,
          name: name,
        });
        return null;
      }
    } catch (error: any) {
      console.error(
        'Error getting address from Stripe address element:',
        error
      );
      return null;
    }
  }

  onSaveAddressCheckboxChange(event: MatCheckboxChange) {
    this.saveAddress = event.checked;
  }

  ngOnDestroy(): void {
    this.paymentElementMounted = false;
    this.stripeService.disposeElements();
  }
}
