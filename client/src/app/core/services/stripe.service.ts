import { inject, Injectable } from '@angular/core';
import {ConfirmationToken, loadStripe, Stripe, StripeAddressElement, StripeAddressElementOptions, StripeElements, StripePaymentElement} from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CartService } from './cart.service';
import { Cart } from '../../shared/models/cart';
import { firstValueFrom, map } from 'rxjs';
import { AccountService } from './account.service';

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  baseUrl = environment.apiUrl;
  private cartService = inject(CartService);
  private accountService = inject(AccountService);
  private http = inject(HttpClient);
  private stripePromise: Promise<Stripe | null>;
  private elements?: StripeElements;
  private addressElement?: StripeAddressElement;
  private paymentElement?: StripePaymentElement;

  constructor() {
    this.stripePromise = loadStripe(environment.stripePublicKey);
  }

  getStripeInstance() {
    return this.stripePromise;
  }

  async initializeElements(requirePayment: boolean = true) {
    if (!this.elements) {
      const stripe = await this.getStripeInstance();
      if (stripe) {
        const cart = await firstValueFrom(this.createOrUpdatePaymentIntent());
        // For free orders, use setupClientSecret (Setup Intent) instead of clientSecret (Payment Intent)
        const clientSecret = cart.clientSecret || cart.setupClientSecret;
        
        if (!clientSecret) {
          if (requirePayment) {
            return null; // Payment elements require clientSecret
          }
          // For address-only (free orders), create elements without clientSecret
          this.elements = stripe.elements({
            appearance: {
              labels: 'floating',
              theme: 'stripe',
              variables: {
                colorPrimary: '#000000',
                colorBackground: '#ffffff',
                colorText: '#000000',
                colorDanger: '#000000',
                fontFamily: '"Nunito Sans", sans-serif',
                borderRadius: '4px',
                spacingUnit: '4px'
              },
              rules: {
                '.Input': {
                  borderColor: '#000000',
                  color: '#000000',
                  fontFamily: '"Nunito Sans", sans-serif'
                },
                '.Input:focus': {
                  borderColor: '#000000',
                  boxShadow: '0 0 0 1px #000000'
                },
                '.Label': {
                  color: '#000000',
                  fontFamily: '"Nunito Sans", sans-serif'
                },
                '.Error': {
                  color: '#000000',
                  fontFamily: '"Nunito Sans", sans-serif'
                },
                '.ApplePayButton': {
                  fontFamily: '"Nunito Sans", sans-serif'
                }
              }
            }
          });
          return this.elements;
        } else {
          // Normal flow with clientSecret (Payment Intent) or setupClientSecret (Setup Intent)
          this.elements = stripe.elements({
            clientSecret: clientSecret,
            appearance: {
              labels: 'floating',
              theme: 'stripe',
              variables: {
                colorPrimary: '#000000',
                colorBackground: '#ffffff',
                colorText: '#000000',
                colorDanger: '#000000',
                fontFamily: '"Nunito Sans", sans-serif',
                borderRadius: '4px',
                spacingUnit: '4px'
              },
              rules: {
                '.Input': {
                  borderColor: '#000000',
                  color: '#000000',
                  fontFamily: '"Nunito Sans", sans-serif'
                },
                '.Input:focus': {
                  borderColor: '#000000',
                  boxShadow: '0 0 0 1px #000000'
                },
                '.Label': {
                  color: '#000000',
                  fontFamily: '"Nunito Sans", sans-serif'
                },
                '.Error': {
                  color: '#000000',
                  fontFamily: '"Nunito Sans", sans-serif'
                },
                '.ApplePayButton': {
                  fontFamily: '"Nunito Sans", sans-serif'
                }
              }
            }
          });
        }
      } else {
        throw new Error('Stripe has not been loaded');
      }
    }
    return this.elements;
  }

  async createPaymentElement() {
    if (!this.paymentElement) {
      const elements = await this.initializeElements();
      if (elements) {
        try {
          // Use type assertion to work around Stripe TypeScript definition issues
          // Configure Apple Pay to always show when available
          this.paymentElement = (elements.create as any)('payment', {
            wallets: {
              applePay: 'always',
              googlePay: 'never'
            },
            // Additional options to ensure Apple Pay is visible
            layout: 'tabs'
          });
          console.log('Payment Element created with Apple Pay enabled');
        } catch (error) {
          console.warn('Error creating Payment Element with wallets, falling back to basic:', error);
          // Fallback if wallets option causes issues
          this.paymentElement = (elements.create as any)('payment');
        }
      } else {
        throw new Error('Elements instance has not been initialized');
      }
    }
    return this.paymentElement;
  }

  async createAddressElement() {
    if (!this.addressElement) {
      // For address element, don't require payment (allow free orders)
      const elements = await this.initializeElements(false);
      if (elements) {
        const user = this.accountService.currentUser();
        let defaultValues: StripeAddressElementOptions['defaultValues'] = {};

        if (user) {
          defaultValues.name = user.firstName + ' ' + user.lastName;
        }

        if (user?.address) {
          defaultValues.address  = {
            line1: user.address.line1,
            line2: user.address.line2,
            city: user.address.city,
            state: user.address.state,
            country: user.address.country,
            postal_code: user.address.postalCode
          }
        }

        const options: StripeAddressElementOptions = {
          mode: 'shipping',
          defaultValues
        };
        this.addressElement = elements.create('address', options);
      } else {
        throw new Error('Elements instance has not been loaded');
      }
    }
    return this.addressElement;
  }

  async createConfirmationToken() {
    const stripe = await this.getStripeInstance();
    const elements = await this.initializeElements();
    if (!elements) {
      throw new Error('Payment elements not available');
    }
    const result = await elements.submit();
    if (result.error) throw new Error(result.error.message);
    if (stripe) {
      return await stripe.createConfirmationToken({elements});
    } else {
      throw new Error('Stripe not available');
    }
  }

  async confirmSetupIntent(): Promise<{setupIntent: any, error?: any}> {
    const stripe = await this.getStripeInstance();
    const cart = this.cartService.cart();
    
    if (!stripe || !cart?.setupClientSecret) {
      throw new Error('Setup Intent not available');
    }

    const elements = await this.initializeElements();
    if (!elements) {
      throw new Error('Payment elements not available');
    }

    const result = await elements.submit();
    if (result.error) {
      return { setupIntent: null, error: result.error };
    }

    // Confirm the Setup Intent
    const confirmResult = await stripe.confirmSetup({
      elements,
      clientSecret: cart.setupClientSecret,
      confirmParams: {
        return_url: window.location.origin + '/checkout/success'
      }
    }) as { setupIntent?: any; error?: any };

    // Handle the union type properly
    if (confirmResult.error) {
      return { setupIntent: null, error: confirmResult.error };
    } else if (confirmResult.setupIntent) {
      return { setupIntent: confirmResult.setupIntent, error: undefined };
    } else {
      return { setupIntent: null, error: { message: 'Unknown error confirming setup intent' } };
    }
  }

  async confirmPayment(confirmationToken: ConfirmationToken) {
    const stripe = await this.getStripeInstance();
    const elements = await this.initializeElements();
    if (!elements) {
      throw new Error('Payment elements not available');
    }
    const result = await elements.submit();
    if (result.error) throw new Error(result.error.message);

    const clientSecret = this.cartService.cart()?.clientSecret;

    if (stripe && clientSecret) {
      return await stripe.confirmPayment({
        clientSecret: clientSecret,
        confirmParams: {
          confirmation_token: confirmationToken.id
        },
        redirect: 'if_required'
      })
    } else {
      throw new Error('Unable to load stripe');
    }
  }

  createOrUpdatePaymentIntent() {
    const cart = this.cartService.cart();
    const hasClientSecret = !!cart?.clientSecret;
    if (!cart) throw new Error('Problem with cart');
    return this.http.post<Cart>(this.baseUrl + 'payments/' + cart.id, {}).pipe(
      map(async cart => {
        if (!hasClientSecret) {
          await firstValueFrom(this.cartService.setCart(cart));
          return cart;
        }
        return cart;
      })
    )
  }

  disposeElements() {
    this.elements = undefined;
    this.addressElement = undefined;
    this.paymentElement = undefined;
  }

}
