using API.DTOs;
using API.Extensions;
using Core.Entities;
using Core.Entities.OrderAggregate;
using Core.Interfaces;
using Core.Specifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace API.Controllers;

public class OrdersController(ICartService cartService, IUnitOfWork unit, IEmailService emailService, ILogger<OrdersController> logger) : BaseApiController
{
    [AllowAnonymous]
    [HttpPost]
    public async Task<ActionResult<OrderDto>> CreateOrder(CreateOrderDto orderDto)
    {
        // Get email from authenticated user if available, otherwise use email from DTO (guest checkout)
        var email = User.Identity?.IsAuthenticated == true 
            ? User.GetEmail() 
            : orderDto.BuyerEmail;

        var cart = await cartService.GetCartAsync(orderDto.CartId);

        if (cart == null) return BadRequest("Cart not found");

        var items = new List<OrderItem>();

        foreach (var item in cart.Items)
        {
            var productItem = await unit.Repository<Product>().GetByIdAsync(item.ProductId);

            if (productItem == null) return BadRequest("Problem with the order");

            var itemOrdered = new ProductItemOrdered
            {
                ProductId = item.ProductId,
                ProductName = item.ProductName,
                PictureUrl = item.PictureUrl
            };

            var orderItem = new OrderItem
            {
                ItemOrdered = itemOrdered,
                Price = productItem.Price,
                Quantity = item.Quantity
            };
            items.Add(orderItem);
        }

        var deliveryMethod = await unit.Repository<DeliveryMethod>().GetByIdAsync(orderDto.DeliveryMethodId);

        if (deliveryMethod == null) return BadRequest("No delivery method selected");

        // Calculate order total
        var subtotal = items.Sum(x => x.Price * x.Quantity);
        var discount = orderDto.Discount;
        var orderTotal = subtotal + deliveryMethod.Price - discount;
        
        // REQUIRE payment for all orders - disable free orders
        if (string.IsNullOrEmpty(cart.PaymentIntentId)) 
            return BadRequest("Payment intent required. Orders must have a valid payment.");

        // REQUIRE PaymentSummary for all orders
        if (orderDto.PaymentSummary == null)
            return BadRequest("Payment summary is required");

        var order = new Order
        {
            OrderItems = items,
            DeliveryMethod = deliveryMethod,
            ShippingAddress = orderDto.ShippingAddress,
            Subtotal = subtotal,
            Discount = orderDto.Discount,
            PaymentSummary = orderDto.PaymentSummary,
            PaymentIntentId = cart.PaymentIntentId,
            BuyerEmail = email,
            Status = OrderStatus.Pending
        };

        unit.Repository<Order>().Add(order);

        if (await unit.Complete())
        {
            // Send order confirmation email asynchronously (don't wait for it)
            // Use Task.Run with proper error handling and logging
            _ = Task.Run(async () =>
            {
                try
                {
                    await emailService.SendOrderConfirmationEmailAsync(order);
                    logger.LogInformation("Order confirmation email sent successfully for order #{OrderId}", order.Id);
                }
                catch (Exception ex)
                {
                    // Log email sending errors but don't fail the order
                    logger.LogError(ex, "Failed to send order confirmation email for order #{OrderId}. Email settings may not be configured. Check appsettings.json for EmailSettings.", order.Id);
                }
            });

            return order.ToDto();
        }

        return BadRequest("Problem creating order");
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OrderDto>>> GetOrdersForUser()
    {
        var spec = new OrderSpecification(User.GetEmail());

        var orders = await unit.Repository<Order>().ListAsync(spec);

        var ordersToReturn = orders.Select(o => o.ToDto()).ToList();

        return Ok(ordersToReturn);
    }

    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderDto>> GetOrderById(int id)
    {
        var spec = new OrderSpecification(User.GetEmail(), id);

        var order = await unit.Repository<Order>().GetEntityWithSpec(spec);

        if (order == null) return NotFound();

        return order.ToDto();
    }
}
