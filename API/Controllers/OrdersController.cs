using API.DTOs;
using API.Extensions;
using Core.Entities;
using Core.Entities.OrderAggregate;
using Core.Interfaces;
using Core.Specifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

public class OrdersController(ICartService cartService, IUnitOfWork unit, IEmailService emailService) : BaseApiController
{
    [AllowAnonymous]
    [HttpPost]
    public async Task<ActionResult<Order>> CreateOrder(CreateOrderDto orderDto)
    {
        // Get email from authenticated user if available, otherwise use email from DTO (guest checkout)
        var email = User.Identity?.IsAuthenticated == true 
            ? User.GetEmail() 
            : orderDto.BuyerEmail;

        var cart = await cartService.GetCartAsync(orderDto.CartId);

        if (cart == null) return BadRequest("Cart not found");

        // Calculate order total to check if it's a free order
        var orderTotal = items.Sum(x => x.Price * x.Quantity) + (deliveryMethod?.Price ?? 0);
        
        // Allow orders without payment intent only if total is 0 (free products)
        if (orderTotal > 0 && cart.PaymentIntentId == null) 
            return BadRequest("No payment intent for this order");

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

        var subtotal = items.Sum(x => x.Price * x.Quantity);
        var orderTotal = subtotal + deliveryMethod.Price;

        var order = new Order
        {
            OrderItems = items,
            DeliveryMethod = deliveryMethod,
            ShippingAddress = orderDto.ShippingAddress,
            Subtotal = subtotal,
            Discount = orderDto.Discount,
            PaymentSummary = orderTotal > 0 ? orderDto.PaymentSummary : null, // No payment summary for free orders
            PaymentIntentId = orderTotal > 0 ? cart.PaymentIntentId : null, // No payment intent for free orders
            BuyerEmail = email,
            Status = orderTotal == 0 ? OrderStatus.PaymentReceived : OrderStatus.Pending // Auto-complete free orders
        };

        unit.Repository<Order>().Add(order);

        if (await unit.Complete())
        {
            // Send order confirmation email asynchronously (don't wait for it)
            _ = Task.Run(async () =>
            {
                try
                {
                    await emailService.SendOrderConfirmationEmailAsync(order);
                }
                catch
                {
                    // Email sending errors are logged in the service, don't fail the order
                }
            });

            return order;
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
