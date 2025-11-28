import { inject, Injectable } from '@angular/core';
import {
  ConfirmationToken,
  loadStripe,
  Stripe,
  StripeAddressElement,
  StripeAddressElementOptions,
  StripeElements,
  StripePaymentElement,
} from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CartService } from './cart.service';
import { Cart } from '../../shared/models/cart';
import { firstValueFrom, map } from 'rxjs';
import { AccountService } from './account.service';

@Injectable({
  providedIn: 'root',
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
  private elementsConfigType?: 'payment' | 'address';
  private readonly STRIPE_CDN_URL = 'https://js.stripe.com/v3';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2000;

  constructor() {
    if (!environment.stripePublicKey) {
      console.error(
        'Stripe public key is missing in environment configuration'
      );
      this.stripePromise = Promise.reject(
        new Error('Stripe public key not configured')
      );
    } else if (!environment.stripePublicKey.startsWith('pk_')) {
      console.error(
        'Invalid Stripe public key format. Key should start with pk_test_ or pk_live_'
      );
      this.stripePromise = Promise.reject(
        new Error('Invalid Stripe public key format')
      );
    } else {
      const isLiveMode = environment.stripePublicKey.startsWith('pk_live_');
      const modeLabel = isLiveMode ? 'LIVE MODE' : 'TEST MODE';
      console.log(
        `Initializing Stripe in ${modeLabel} with public key:`,
        environment.stripePublicKey.substring(0, 20) + '...'
      );
      if (
        isLiveMode &&
        (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1')
      ) {
        console.warn(
          '⚠️ Stripe is configured for LIVE MODE but running on localhost. ' +
            'Stripe may show domain verification warnings - this is normal. ' +
            'To avoid warnings, verify your domain in Stripe Dashboard or use test mode for local development.'
        );
      }
      this.stripePromise = this.loadStripeWithRetry(
        environment.stripePublicKey
      );
    }
  }

  /**
   * Load Stripe with retry logic and fallback to manual script injection
   */
  private async loadStripeWithRetry(
    publishableKey: string,
    retryCount: number = 0
  ): Promise<Stripe | null> {
    try {
      console.log(
        `Attempting to load Stripe (attempt ${retryCount + 1}/${
          this.MAX_RETRIES + 1
        })...`
      );

      // First, try using the loadStripe function from @stripe/stripe-js
      const stripe = await loadStripe(publishableKey);

      if (stripe) {
        console.log('Stripe loaded successfully via loadStripe');
        return stripe;
      }

      // If loadStripe returns null, try manual script injection
      console.warn(
        'loadStripe returned null, attempting manual script injection...'
      );
      return await this.loadStripeManually(publishableKey);
    } catch (error: any) {
      console.error(`Stripe load attempt ${retryCount + 1} failed:`, error);

      if (retryCount < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await this.delay(delay);
        return this.loadStripeWithRetry(publishableKey, retryCount + 1);
      }

      // All retries failed, try manual script injection as last resort
      console.warn(
        'All loadStripe attempts failed, trying manual script injection...'
      );
      try {
        return await this.loadStripeManually(publishableKey);
      } catch (manualError: any) {
        const errorMessage =
          `Failed to load Stripe after ${this.MAX_RETRIES + 1} attempts. ` +
          `Please check your internet connection and ensure https://js.stripe.com is accessible. ` +
          `Error: ${error.message || 'Unknown error'}`;
        console.error(errorMessage, { originalError: error, manualError });
        throw new Error(errorMessage);
      }
    }
  }

  /**
   * Manually inject Stripe script and wait for it to load
   */
  private async loadStripeManually(
    publishableKey: string
  ): Promise<Stripe | null> {
    return new Promise((resolve, reject) => {
      // Check if Stripe is already available
      if (typeof window !== 'undefined' && (window as any).Stripe) {
        console.log(
          'Stripe already available in window, using existing instance'
        );
        try {
          const Stripe = (window as any).Stripe;
          const stripe = Stripe(publishableKey);
          resolve(stripe);
          return;
        } catch (error: any) {
          console.error('Error initializing Stripe from window:', error);
        }
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector(
        `script[src^="${this.STRIPE_CDN_URL}"]`
      ) as HTMLScriptElement;
      if (existingScript) {
        console.log('Stripe script already exists, waiting for it to load...');

        // If Stripe is already available, use it immediately
        if ((window as any).Stripe) {
          try {
            const Stripe = (window as any).Stripe;
            const stripe = Stripe(publishableKey);
            console.log(
              'Stripe initialized from existing script (already loaded)'
            );
            resolve(stripe);
            return;
          } catch (error: any) {
            reject(new Error(`Failed to initialize Stripe: ${error.message}`));
            return;
          }
        }

        // If script is already complete/loaded, check for Stripe availability
        const scriptElement = existingScript as HTMLScriptElement & {
          complete?: boolean;
          readyState?: string;
        };
        if (
          scriptElement.complete === true ||
          scriptElement.readyState === 'complete' ||
          scriptElement.readyState === 'loaded'
        ) {
          const checkInterval = setInterval(() => {
            if ((window as any).Stripe) {
              clearInterval(checkInterval);
              try {
                const Stripe = (window as any).Stripe;
                const stripe = Stripe(publishableKey);
                console.log(
                  'Stripe initialized from existing script (completed)'
                );
                resolve(stripe);
              } catch (error: any) {
                clearInterval(checkInterval);
                reject(
                  new Error(`Failed to initialize Stripe: ${error.message}`)
                );
              }
            }
          }, 50);

          // Timeout after 10 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            reject(
              new Error('Timeout waiting for existing Stripe script to load')
            );
          }, 10000);
          return;
        }

        // Wait for script to load
        const loadHandler = () => {
          // Give it a moment for Stripe to initialize
          setTimeout(() => {
            if ((window as any).Stripe) {
              try {
                const Stripe = (window as any).Stripe;
                const stripe = Stripe(publishableKey);
                console.log(
                  'Stripe initialized from existing script after load event'
                );
                resolve(stripe);
              } catch (error: any) {
                reject(
                  new Error(`Failed to initialize Stripe: ${error.message}`)
                );
              }
            } else {
              reject(
                new Error(
                  'Stripe script loaded but window.Stripe is not available'
                )
              );
            }
          }, 100);
        };

        const errorHandler = () => {
          reject(new Error('Failed to load existing Stripe script'));
        };

        existingScript.addEventListener('load', loadHandler, { once: true });
        existingScript.addEventListener('error', errorHandler, { once: true });

        // If script is already loaded, trigger handler
        const scriptEl = existingScript as HTMLScriptElement & {
          complete?: boolean;
          readyState?: string;
        };
        if (scriptEl.complete === true || scriptEl.readyState === 'complete') {
          loadHandler();
        }
        return;
      }

      // Create and inject script
      const script = document.createElement('script');
      script.src = this.STRIPE_CDN_URL;
      script.async = true;

      const timeout = setTimeout(() => {
        reject(new Error('Stripe script loading timeout after 30 seconds'));
      }, 30000);

      script.addEventListener('load', () => {
        clearTimeout(timeout);
        console.log('Stripe script loaded manually');

        // Wait a bit for Stripe to be available
        const checkStripe = () => {
          if ((window as any).Stripe) {
            try {
              const Stripe = (window as any).Stripe;
              const stripe = Stripe(publishableKey);
              console.log('Stripe initialized manually');
              resolve(stripe);
            } catch (error: any) {
              reject(
                new Error(`Failed to initialize Stripe: ${error.message}`)
              );
            }
          } else {
            setTimeout(checkStripe, 100);
          }
        };
        checkStripe();
      });

      script.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(
          new Error(
            `Failed to load Stripe script from ${this.STRIPE_CDN_URL}. Please check your internet connection.`
          )
        );
      });

      const headOrBody = document.head || document.body;
      if (!headOrBody) {
        clearTimeout(timeout);
        reject(
          new Error(
            'Cannot inject Stripe script: document.head and document.body are not available'
          )
        );
        return;
      }

      headOrBody.appendChild(script);
      console.log('Stripe script tag injected');
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getStripeInstance() {
    try {
      const stripe = await this.stripePromise;
      if (!stripe) {
        throw new Error(
          'Stripe instance is null - check your Stripe public key'
        );
      }
      return stripe;
    } catch (error: any) {
      console.error('Error getting Stripe instance:', error);
      throw new Error(
        `Unable to load Stripe: ${error.message || 'Unknown error'}`
      );
    }
  }

  async initializeElements(requirePayment: boolean = true) {
    let stripe: Stripe;
    try {
      stripe = await this.getStripeInstance();
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to load Stripe';
      console.error('Stripe initialization error:', error);
      throw new Error(
        `${errorMsg}. Please check your Stripe public key configuration.`
      );
    }

    if (!stripe) {
      throw new Error('Stripe instance is null. Check your Stripe public key.');
    }

    // If elements already exist but were created for a different purpose, dispose them
    // Payment elements require clientSecret or mode, address elements don't
    const requestedConfigType = requirePayment ? 'payment' : 'address';
    if (this.elements && this.elementsConfigType !== requestedConfigType) {
      // Dispose existing elements and recreate with proper configuration
      this.elements = undefined;
      this.elementsConfigType = undefined;
    }

    if (!this.elements) {
      // Common appearance configuration
      const appearanceConfig = {
        labels: 'floating' as const,
        theme: 'stripe' as const,
        variables: {
          colorPrimary: '#000000',
          colorBackground: '#ffffff',
          colorText: '#000000',
          colorDanger: '#000000',
          fontFamily: '"Nunito Sans", sans-serif',
          borderRadius: '4px',
          spacingUnit: '4px',
        },
        rules: {
          '.Input': {
            borderColor: '#000000',
            color: '#000000',
            fontFamily: '"Nunito Sans", sans-serif',
          },
          '.Input:focus': {
            borderColor: '#000000',
            boxShadow: '0 0 0 1px #000000',
          },
          '.Label': {
            color: '#000000',
            fontFamily: '"Nunito Sans", sans-serif',
          },
          '.Error': {
            color: '#000000',
            fontFamily: '"Nunito Sans", sans-serif',
          },
          '.ApplePayButton': {
            fontFamily: '"Nunito Sans", sans-serif',
          },
        },
      };

      if (requirePayment) {
        // For payment elements, we MUST have either clientSecret or mode
        // Check if we already have a clientSecret to avoid unnecessary API calls
        let cart = this.cartService.cart();
        let clientSecret = cart?.clientSecret || cart?.setupClientSecret;

        // Only create/update payment intent if we don't already have one
        if (!clientSecret) {
          try {
            cart = await firstValueFrom(this.createOrUpdatePaymentIntent());
            clientSecret = cart?.clientSecret || cart?.setupClientSecret;
          } catch (error) {
            console.warn('Payment intent creation failed:', error);
            clientSecret = undefined;
          }
        }

        try {
          if (clientSecret) {
            // Normal flow with clientSecret (Payment Intent) or setupClientSecret (Setup Intent)
            this.elements = stripe.elements({
              clientSecret: clientSecret,
              appearance: appearanceConfig,
            });
            this.elementsConfigType = 'payment';
          } else {
            // No clientSecret - use mode based on order type
            const total = this.cartService.totals()?.total ?? 0;
            const mode = 'payment'; // Always payment mode since free orders are disabled

            // Currency is required when using mode instead of clientSecret
            this.elements = stripe.elements({
              mode: mode,
              currency: 'usd',
              appearance: appearanceConfig,
            });
            this.elementsConfigType = 'payment';
          }
        } catch (error) {
          // If payment intent creation fails, fall back to mode
          console.warn(
            'Failed to create payment intent, using mode fallback:',
            error
          );
          const total = this.cartService.totals()?.total ?? 0;
          const isFreeOrder = total === 0 || total < 50;
          const mode = isFreeOrder ? 'setup' : 'payment';

          // Currency is required when using mode instead of clientSecret
          this.elements = stripe.elements({
            mode: mode,
            currency: 'usd',
            appearance: appearanceConfig,
          });
          this.elementsConfigType = 'payment';
        }
      } else {
        // For address-only elements (when requirePayment is false), mode is not required
        // Address elements can be created without clientSecret or mode
        this.elements = stripe.elements({
          appearance: appearanceConfig,
        });
        this.elementsConfigType = 'address';
      }
    }
    return this.elements;
  }

  async createPaymentElement() {
    if (!this.paymentElement) {
      const elements = await this.initializeElements(true);
      if (!elements) {
        throw new Error('Elements instance has not been initialized');
      }

      // Verify elements has either clientSecret or mode configured
      // This is a safety check to ensure elements were created correctly
      try {
        // Disable Apple Pay completely - card payments only
        this.paymentElement = elements.create('payment', {
          wallets: {
            applePay: 'never',
            googlePay: 'never',
          },
        });
      } catch (error: any) {
        console.error('Error creating Payment Element:', error);

        // If the error is about missing clientSecret/mode, try to reinitialize
        if (
          error?.message?.includes('clientSecret') ||
          error?.message?.includes('mode')
        ) {
          console.warn('Elements missing clientSecret/mode, reinitializing...');
          // Dispose current elements and reinitialize
          this.elements = undefined;
          this.elementsConfigType = undefined;
          const newElements = await this.initializeElements(true);
          if (newElements) {
            try {
              this.paymentElement = (newElements.create as any)('payment');
              console.log('Payment Element created after reinitialization');
            } catch (retryError) {
              console.error(
                'Failed to create Payment Element after reinitialization:',
                retryError
              );
              throw new Error(
                'Failed to create payment element. Please refresh the page.'
              );
            }
          } else {
            throw new Error(
              'Failed to initialize Stripe elements. Please refresh the page.'
            );
          }
        } else {
          // Fallback if wallets option causes issues
          this.paymentElement = (elements.create as any)('payment');
        }
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

        // Only set name if we have valid non-null values
        if (user) {
          const firstName = user.firstName?.trim() || '';
          const lastName = user.lastName?.trim() || '';

          if (firstName && lastName) {
            defaultValues.name = `${firstName} ${lastName}`;
          } else if (firstName) {
            defaultValues.name = firstName;
          } else if (lastName) {
            defaultValues.name = lastName;
          }
          // If neither exists, don't set name at all - Stripe will use placeholder
        }

        if (user?.address) {
          defaultValues.address = {
            line1: user.address.line1,
            line2: user.address.line2,
            city: user.address.city,
            state: user.address.state,
            country: user.address.country,
            postal_code: user.address.postalCode,
          };
        }

        const options: StripeAddressElementOptions = {
          mode: 'shipping',
          defaultValues,
        };
        this.addressElement = elements.create('address', options);
      } else {
        throw new Error('Elements instance has not been loaded');
      }
    }
    return this.addressElement;
  }

  async createConfirmationToken(): Promise<{
    confirmationToken: ConfirmationToken;
    error?: any;
  }> {
    const stripe = await this.getStripeInstance();

    // Ensure we have a payment intent clientSecret before creating confirmation token
    let cart = this.cartService.cart();
    if (!cart?.clientSecret) {
      console.warn(
        'No clientSecret found, creating payment intent before confirmation token...'
      );
      try {
        cart = await firstValueFrom(this.createOrUpdatePaymentIntent());
        if (!cart?.clientSecret) {
          throw new Error('Failed to create payment intent. Please try again.');
        }
        console.log('Payment intent created for confirmation token');
      } catch (error) {
        console.error(
          'Error creating payment intent for confirmation token:',
          error
        );
        throw new Error(
          'Unable to initialize payment. Please refresh the page.'
        );
      }
    }

    // CRITICAL: Use existing elements that have the mounted payment element
    // The payment element must be part of the same elements instance to create a confirmation token
    // DO NOT recreate elements here as it will break the connection to the mounted payment element
    if (!this.elements || this.elementsConfigType !== 'payment') {
      throw new Error(
        'Payment elements not initialized. Please complete the payment step first.'
      );
    }

    if (!this.paymentElement) {
      throw new Error(
        'Payment element not found. Please complete the payment step first.'
      );
    }

    const elements = this.elements;

    // Verify the payment element is still mounted by checking if we can access it
    try {
      // Try to get the payment element from the DOM to verify it's mounted
      const paymentElementContainer =
        document.getElementById('payment-element');
      if (
        !paymentElementContainer ||
        !paymentElementContainer.children.length
      ) {
        console.warn(
          'Payment element container appears to be empty. Payment element may not be mounted.'
        );
      }
      console.log(
        'Using existing mounted payment element for confirmation token'
      );
    } catch (error) {
      console.warn('Could not verify payment element mount status:', error);
    }

    // Submit elements to validate - this also collects payment and address data
    // This will fail if payment element is not properly mounted or accessible
    const result = await elements.submit();
    if (result.error) {
      throw new Error(
        result.error.message ||
          'Failed to validate payment information. Please check your payment details and ensure payment step is completed.'
      );
    }

    if (stripe) {
      const confirmationTokenResult = await stripe.createConfirmationToken({
        elements,
      });

      const confirmationToken = confirmationTokenResult.confirmationToken;
      if (!confirmationToken) {
        throw new Error('Failed to create confirmation token');
      }

      // Log confirmation token details for debugging
      console.log('Confirmation token created successfully:', {
        id: confirmationToken.id,
        livemode: confirmationToken.livemode,
        hasPaymentIntent: !!confirmationToken.payment_intent,
        paymentMethodType: confirmationToken.payment_method_preview?.type,
      });

      // Verify the confirmation token has a payment intent attached
      if (confirmationToken.payment_intent === null && cart?.clientSecret) {
        console.warn(
          'Confirmation token created without payment intent. This may be normal for Link payments or if using setup intents.'
        );
        // For Link payments or certain payment methods, payment_intent can be null initially
        // This is expected behavior and Stripe will handle it during confirmation
      }

      return { confirmationToken, error: confirmationTokenResult.error };
    } else {
      throw new Error('Stripe not available');
    }
  }

  async confirmSetupIntent(): Promise<{ setupIntent: any; error?: any }> {
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
    const confirmResult = (await stripe.confirmSetup({
      elements,
      clientSecret: cart.setupClientSecret,
      confirmParams: {
        return_url: window.location.origin + '/checkout/success',
      },
    })) as { setupIntent?: any; error?: any };

    // Handle the union type properly
    if (confirmResult.error) {
      return { setupIntent: null, error: confirmResult.error };
    } else if (confirmResult.setupIntent) {
      return { setupIntent: confirmResult.setupIntent, error: undefined };
    } else {
      return {
        setupIntent: null,
        error: { message: 'Unknown error confirming setup intent' },
      };
    }
  }

  async confirmPayment(confirmationToken: ConfirmationToken) {
    const stripe = await this.getStripeInstance();

    // Ensure we have a payment intent clientSecret
    let cart = this.cartService.cart();
    if (!cart?.clientSecret) {
      console.warn(
        'No clientSecret in cart, creating payment intent before confirmation...'
      );
      try {
        cart = await firstValueFrom(this.createOrUpdatePaymentIntent());
        if (!cart?.clientSecret) {
          throw new Error('Failed to create payment intent. Please try again.');
        }
      } catch (error: any) {
        console.error('Error creating payment intent for confirmation:', error);
        throw new Error(
          'Unable to initialize payment. Please refresh and try again.'
        );
      }
    }

    const elements = await this.initializeElements();
    if (!elements) {
      throw new Error('Payment elements not available');
    }

    const result = await elements.submit();
    if (result.error) {
      throw new Error(result.error.message || 'Payment form validation failed');
    }

    const clientSecret = cart?.clientSecret;

    if (!stripe) {
      throw new Error('Stripe failed to load. Please refresh the page.');
    }

    if (!clientSecret) {
      throw new Error(
        'Payment intent not available. Please complete checkout steps again.'
      );
    }

    try {
      console.log(
        'Confirming payment with clientSecret and confirmation token'
      );
      const confirmResult = await stripe.confirmPayment({
        clientSecret: clientSecret,
        confirmParams: {
          confirmation_token: confirmationToken.id,
        },
        redirect: 'if_required',
      });

      console.log('Payment confirmation result:', {
        status: confirmResult.paymentIntent?.status,
        error: confirmResult.error?.message,
      });

      return confirmResult;
    } catch (error: any) {
      console.error('Stripe payment confirmation error:', error);
      throw new Error(
        error.message ||
          'Failed to process payment. Please check your card details and try again.'
      );
    }
  }

  createOrUpdatePaymentIntent() {
    const cart = this.cartService.cart();
    const hasClientSecret = !!cart?.clientSecret;
    if (!cart) throw new Error('Problem with cart');
    return this.http.post<Cart>(this.baseUrl + 'payments/' + cart.id, {}).pipe(
      map(async (cart) => {
        if (!hasClientSecret) {
          await firstValueFrom(this.cartService.setCart(cart));
          return cart;
        }
        return cart;
      })
    );
  }

  disposeElements() {
    this.elements = undefined;
    this.addressElement = undefined;
    this.paymentElement = undefined;
    this.elementsConfigType = undefined;
  }
}
