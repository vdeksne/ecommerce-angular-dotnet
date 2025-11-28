using Core.Entities;
using Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Stripe;

namespace Infrastructure.Services;

public class PaymentService : IPaymentService
{
    private readonly ICartService cartService;
    private readonly IUnitOfWork unit;

    private readonly IConfiguration _config;

    public PaymentService(IConfiguration config, ICartService cartService,
        IUnitOfWork unit)
    {
        this.cartService = cartService;
        this.unit = unit;
        this._config = config;
        StripeConfiguration.ApiKey = config["StripeSettings:SecretKey"];
    }

    public async Task<ShoppingCart?> CreateOrUpdatePaymentIntent(string cartId)
    {
        var cart = await cartService.GetCartAsync(cartId)
            ?? throw new Exception("Cart unavailable");

        var shippingPrice = await GetShippingPriceAsync(cart) ?? 0;

        await ValidateCartItemsInCartAsync(cart);

        var subtotal = CalculateSubtotal(cart);

        if (cart.Coupon != null)
        {
            subtotal = await ApplyDiscountAsync(cart.Coupon, subtotal);
        }

        var total = subtotal + shippingPrice;

        // Skip payment intent creation for free orders or amounts below Stripe's minimum ($0.50)
        // Stripe requires minimum charge of $0.50 USD
        const long stripeMinimumAmount = 50; // $0.50 in cents
        
        // Wrap the entire payment intent creation in try-catch as a safety net
        try
        {
            if (total >= stripeMinimumAmount)
            {
                await CreateUpdatePaymentIntentAsync(cart, total);
            }
            else
            {
                // For free/small orders, use Setup Intent to save payment method for future use
                await CreateOrUpdateSetupIntentAsync(cart);
            }
        }
        catch (StripeException ex)
        {
            // If ANY Stripe exception occurs, clear payment intent and use Setup Intent
            cart.PaymentIntentId = null;
            cart.ClientSecret = null;
            
            // Check if this is an amount-too-small error
            var errorMessage = ex.Message ?? "";
            var errorCode = ex.StripeError?.Code ?? "";
            
            if (errorCode == "amount_too_small" || 
                errorMessage.Contains("minimum charge", StringComparison.OrdinalIgnoreCase) ||
                errorMessage.Contains("Setup Intent", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    await CreateOrUpdateSetupIntentAsync(cart);
                }
                catch
                {
                    // If Setup Intent fails, that's okay - order can still proceed
                }
            }
            // Don't rethrow - allow order to proceed
        }
        catch (Exception)
        {
            // Catch any other exception type
            cart.PaymentIntentId = null;
            cart.ClientSecret = null;
            // Don't rethrow - allow order to proceed
        }

        await cartService.SetCartAsync(cart);

        return cart;
    }

    public async Task<string> RefundPayment(string paymentIntentId)
    {
        var refundOptions = new RefundCreateOptions
        {
            PaymentIntent = paymentIntentId
        };

        var refundService = new RefundService();
        var result = await refundService.CreateAsync(refundOptions);

        return result.Status;
    }

    private async Task CreateUpdatePaymentIntentAsync(ShoppingCart cart, long total)
    {
        // Stripe requires minimum charge of $0.50 USD
        const long stripeMinimumAmount = 50; // $0.50 in cents
        
        if (total < stripeMinimumAmount)
        {
            // Clear any existing payment intent for free/small orders
            cart.PaymentIntentId = null;
            cart.ClientSecret = null;
            return;
        }

        // Wrap ENTIRE method body in try-catch to prevent ANY exceptions from propagating
        try
        {
            var service = new PaymentIntentService();

            if (string.IsNullOrEmpty(cart.PaymentIntentId))
            {
                try
                {
                    var options = new PaymentIntentCreateOptions
                    {
                        Amount = total,
                        Currency = "usd",
                        PaymentMethodTypes = ["card"] // Card payments only - Apple Pay disabled
                    };
                    var intent = await service.CreateAsync(options);
                    cart.PaymentIntentId = intent.Id;
                    cart.ClientSecret = intent.ClientSecret;
                }
                catch (StripeException ex)
                {
                    // Catch ALL Stripe exceptions - check message inside
                    var errorMessage = ex.Message ?? "";
                    var errorCode = ex.StripeError?.Code ?? "";
                    
                    // If this is an amount-too-small error, clear payment intent and return
                    if (errorCode == "amount_too_small" || 
                        errorMessage.Contains("minimum charge", StringComparison.OrdinalIgnoreCase) ||
                        errorMessage.Contains("greater than or equal", StringComparison.OrdinalIgnoreCase) ||
                        errorMessage.Contains("Setup Intent", StringComparison.OrdinalIgnoreCase))
                    {
                        cart.PaymentIntentId = null;
                        cart.ClientSecret = null;
                        return; // Don't rethrow - allow order to proceed
                    }
                    // For any other Stripe exception, rethrow to outer catch
                    throw;
                }
            }
            else
            {
                try
                {
                    var options = new PaymentIntentUpdateOptions
                    {
                        Amount = total
                    };
                    await service.UpdateAsync(cart.PaymentIntentId, options);
                }
                catch (StripeException ex)
                {
                    // Catch ALL Stripe exceptions from update - check message inside
                    var errorMessage = ex.Message ?? "";
                    var errorCode = ex.StripeError?.Code ?? "";
                    
                    // Handle resource_missing error
                    if (errorCode == "resource_missing" || errorMessage.Contains("No such payment_intent"))
                    {
                        // Payment intent doesn't exist (e.g., from test keys), create a new one
                        // But only if amount meets Stripe's minimum ($0.50)
                        if (total >= stripeMinimumAmount)
                        {
                            cart.PaymentIntentId = null;
                            try
                            {
                                var createOptions = new PaymentIntentCreateOptions
                                {
                                    Amount = total,
                                    Currency = "usd",
                                    PaymentMethodTypes = ["card"] // Card payments only
                                };
                                var intent = await service.CreateAsync(createOptions);
                                cart.PaymentIntentId = intent.Id;
                                cart.ClientSecret = intent.ClientSecret;
                            }
                            catch (StripeException createEx)
                            {
                                // Catch ALL Stripe exceptions from create - check message inside
                                var createErrorMessage = createEx.Message ?? "";
                                var createErrorCode = createEx.StripeError?.Code ?? "";
                                
                                // If this is an amount-too-small error, clear and return
                                if (createErrorCode == "amount_too_small" || 
                                    createErrorMessage.Contains("minimum charge", StringComparison.OrdinalIgnoreCase) ||
                                    createErrorMessage.Contains("greater than or equal", StringComparison.OrdinalIgnoreCase) ||
                                    createErrorMessage.Contains("Setup Intent", StringComparison.OrdinalIgnoreCase))
                                {
                                    cart.PaymentIntentId = null;
                                    cart.ClientSecret = null;
                                    return; // Don't rethrow - allow order to proceed
                                }
                                // For any other Stripe exception, rethrow to outer catch
                                throw;
                            }
                        }
                        else
                        {
                            // Amount too small, clear payment intent
                            cart.PaymentIntentId = null;
                            cart.ClientSecret = null;
                            return;
                        }
                    }
                    // If this is an amount-too-small error, cancel and clear
                    else if (errorCode == "amount_too_small" || 
                        errorMessage.Contains("minimum charge", StringComparison.OrdinalIgnoreCase) ||
                        errorMessage.Contains("greater than or equal", StringComparison.OrdinalIgnoreCase) ||
                        errorMessage.Contains("Setup Intent", StringComparison.OrdinalIgnoreCase))
                    {
                        try
                        {
                            if (!string.IsNullOrEmpty(cart.PaymentIntentId))
                            {
                                await service.CancelAsync(cart.PaymentIntentId);
                            }
                        }
                        catch
                        {
                            // Ignore errors when canceling
                        }
                        cart.PaymentIntentId = null;
                        cart.ClientSecret = null;
                        return; // Don't rethrow - allow order to proceed
                    }
                    // For any other Stripe exception, rethrow to outer catch
                    throw;
                }
            }
        }
        catch (StripeException ex)
        {
            // Catch-all for ANY Stripe exceptions - don't let ANY escape
            var errorMessage = ex.Message ?? "";
            var errorCode = ex.StripeError?.Code ?? "";
            
            // Cancel existing payment intent if it exists
            try
            {
                if (!string.IsNullOrEmpty(cart.PaymentIntentId))
                {
                    var service = new PaymentIntentService();
                    await service.CancelAsync(cart.PaymentIntentId);
                }
            }
            catch
            {
                // Ignore errors when canceling
            }
            
            // Clear payment intent
            cart.PaymentIntentId = null;
            cart.ClientSecret = null;
            
            // If this is an amount-too-small error, create Setup Intent instead
            if (errorCode == "amount_too_small" || 
                errorMessage.Contains("minimum charge", StringComparison.OrdinalIgnoreCase) ||
                errorMessage.Contains("greater than or equal", StringComparison.OrdinalIgnoreCase) ||
                errorMessage.Contains("Setup Intent", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    await CreateOrUpdateSetupIntentAsync(cart);
                }
                catch
                {
                    // If Setup Intent creation fails, that's okay - order can still proceed
                }
            }
            
            // NEVER rethrow - always allow the order to proceed
            return;
        }
        catch (Exception)
        {
            // Catch ANY other exception type as well
            cart.PaymentIntentId = null;
            cart.ClientSecret = null;
            // Don't rethrow - allow the order to proceed
            return;
        }
    }

    private async Task CreateOrUpdateSetupIntentAsync(ShoppingCart cart)
    {
        // Use Setup Intent to save payment method for future use without charging
        var service = new SetupIntentService();

        try
        {
            if (string.IsNullOrEmpty(cart.SetupIntentId))
            {
                // Create new Setup Intent
                var options = new SetupIntentCreateOptions
                {
                    PaymentMethodTypes = ["card"], // Card payments only
                    Usage = "off_session" // Save for future use
                };
                var setupIntent = await service.CreateAsync(options);
                cart.SetupIntentId = setupIntent.Id;
                cart.SetupClientSecret = setupIntent.ClientSecret;
            }
            else
            {
                // Setup Intent already exists, retrieve it to get fresh client secret
                try
                {
                    var setupIntent = await service.GetAsync(cart.SetupIntentId);
                    cart.SetupClientSecret = setupIntent.ClientSecret;
                }
                catch (StripeException ex) when (ex.StripeError?.Code == "resource_missing")
                {
                    // Setup Intent doesn't exist, create a new one
                    cart.SetupIntentId = null;
                    var options = new SetupIntentCreateOptions
                    {
                        PaymentMethodTypes = ["card"], // Card payments only
                        Usage = "off_session"
                    };
                    var setupIntent = await service.CreateAsync(options);
                    cart.SetupIntentId = setupIntent.Id;
                    cart.SetupClientSecret = setupIntent.ClientSecret;
                }
            }
        }
        catch (StripeException)
        {
            // If Setup Intent creation fails, clear it and allow order to proceed
            cart.SetupIntentId = null;
            cart.SetupClientSecret = null;
            // Don't rethrow - allow the order to proceed
        }
    }

    private async Task<long> ApplyDiscountAsync(AppCoupon appCoupon, long amount)
    {
        var couponService = new Stripe.CouponService();

        var coupon = await couponService.GetAsync(appCoupon.CouponId);

        if (coupon.AmountOff.HasValue)
        {
            amount -= (long)coupon.AmountOff * 100;
        }

        if (coupon.PercentOff.HasValue)
        {
            var discount = amount * (coupon.PercentOff.Value / 100);
            amount -= (long)discount;
        }

        return amount;
    }

    private long CalculateSubtotal(ShoppingCart cart)
    {
        var itemTotal = cart.Items.Sum(x => x.Quantity * x.Price * 100);
        return (long)itemTotal;
    }

    private async Task ValidateCartItemsInCartAsync(ShoppingCart cart)
    {
        foreach (var item in cart.Items)
        {
            var productItem = await unit.Repository<Core.Entities.Product>()
                .GetByIdAsync(item.ProductId) ?? throw new Exception("Problem getting product in cart");

            if (item.Price != productItem.Price)
            {
                item.Price = productItem.Price;
            }
            
            // Update quantity in stock from product
            item.QuantityInStock = productItem.QuantityInStock;
        }
    }

    private async Task<long?> GetShippingPriceAsync(ShoppingCart cart)
    {
        if (cart.DeliveryMethodId.HasValue)
        {
            var deliveryMethod = await unit.Repository<DeliveryMethod>()
                .GetByIdAsync((int)cart.DeliveryMethodId)
                    ?? throw new Exception("Problem with delivery method");

            return (long)deliveryMethod.Price * 100;
        }

        return null;
    }
}