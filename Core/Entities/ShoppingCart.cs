namespace Core.Entities;

public class ShoppingCart
{
    public required string Id { get; set; }
    public List<CartItem> Items { get; set; } = [];
    public int? DeliveryMethodId { get; set; }
    public string? ClientSecret { get; set; }
    public string? PaymentIntentId { get; set; }
    public string? SetupClientSecret { get; set; }
    public string? SetupIntentId { get; set; }
    public string? CheckoutSessionId { get; set; }
    public string? CheckoutSessionUrl { get; set; }
    public AppCoupon? Coupon { get; set; }
}
