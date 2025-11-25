using System.Security.Claims;
using Core.Entities;
using Core.Entities.OrderAggregate;
using Core.Interfaces;
using Core.Specifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

public class AdminController(IUnitOfWork unit, IPaymentService paymentService, UserManager<AppUser> userManager) : BaseApiController
{
    [Authorize(Roles = "Admin")]
    [HttpGet("orders")]
    public async Task<ActionResult> GetOrders([FromQuery] string? status, [FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 10)
    {
        var specParams = new OrderSpecParams
        {
            Status = status,
            PageIndex = pageIndex,
            PageSize = pageSize
        };
        var spec = new OrderSpecification(specParams);
        var countSpec = new OrderSpecification(new OrderSpecParams { Status = status });
        var totalItems = await unit.Repository<Order>().CountAsync(countSpec);
        var orders = await unit.Repository<Order>().ListAsync(spec);

        return Ok(new { data = orders, count = totalItems, pageIndex, pageSize });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("orders/{id}")]
    public async Task<ActionResult<Order>> GetOrderById(int id)
    {
        var spec = new OrderSpecification(id);
        var order = await unit.Repository<Order>().GetEntityWithSpec(spec);

        if (order == null) return NotFound();

        return Ok(order);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("orders/refund/{id}")]
    public async Task<ActionResult<Order>> RefundOrder(int id)
    {
        var spec = new OrderSpecification(id);
        var order = await unit.Repository<Order>().GetEntityWithSpec(spec);

        if (order == null) return NotFound();

        if (order.Status == OrderStatus.Refunded) return BadRequest("Order already refunded");

        if (!string.IsNullOrEmpty(order.PaymentIntentId))
        {
            await paymentService.RefundPayment(order.PaymentIntentId);
        }

        order.Status = OrderStatus.Refunded;
        unit.Repository<Order>().Update(order);
        await unit.Complete();

        return Ok(order);
    }

    [HttpGet("check-admin-status")]
    public ActionResult CheckAdminStatus()
    {
        if (User.Identity?.IsAuthenticated == false) 
        {
            return Ok(new { isAuthenticated = false, isAdmin = false, email = "", roles = "" });
        }

        var email = User.FindFirstValue(ClaimTypes.Email);
        var roles = User.FindFirstValue(ClaimTypes.Role);
        var isAdmin = User.IsInRole("Admin");

        return Ok(new 
        { 
            isAuthenticated = true,
            isAdmin = isAdmin,
            email = email,
            roles = roles
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("assign-admin-role")]
    public async Task<ActionResult> AssignAdminRole([FromBody] AssignRoleDto dto)
    {
        var user = await userManager.FindByEmailAsync(dto.Email);
        if (user == null)
        {
            return NotFound($"User with email {dto.Email} not found");
        }

        var result = await userManager.AddToRoleAsync(user, "Admin");
        if (result.Succeeded)
        {
            return Ok(new { message = $"Admin role assigned to {dto.Email}" });
        }

        return BadRequest(new { errors = result.Errors });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("remove-admin-role")]
    public async Task<ActionResult> RemoveAdminRole([FromBody] AssignRoleDto dto)
    {
        var user = await userManager.FindByEmailAsync(dto.Email);
        if (user == null)
        {
            return NotFound($"User with email {dto.Email} not found");
        }

        var result = await userManager.RemoveFromRoleAsync(user, "Admin");
        if (result.Succeeded)
        {
            return Ok(new { message = $"Admin role removed from {dto.Email}" });
        }

        return BadRequest(new { errors = result.Errors });
    }
}

public class AssignRoleDto
{
    public required string Email { get; set; }
}
