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

    [HttpGet("homepage-image")]
    public async Task<ActionResult<HomePageImageResponseDto>> GetHomePageImage()
    {
        try
        {
            var settings = await unit.Repository<HomePageSettings>().GetByIdAsync(1);
            if (settings == null || string.IsNullOrEmpty(settings.MainImageUrl))
            {
                // Return JSON object with empty string
                return Ok(new HomePageImageResponseDto 
                { 
                    ImageUrl = "", 
                    ObjectPositionX = 50, 
                    ObjectPositionY = 50 
                });
            }

            // If URL is the old localhost:3845, return empty to use default
            if (settings.MainImageUrl.Contains("localhost:3845"))
            {
                return Ok(new HomePageImageResponseDto 
                { 
                    ImageUrl = "", 
                    ObjectPositionX = 50, 
                    ObjectPositionY = 50 
                });
            }

            return Ok(new HomePageImageResponseDto 
            { 
                ImageUrl = settings.MainImageUrl,
                ObjectPositionX = settings.ObjectPositionX,
                ObjectPositionY = settings.ObjectPositionY
            });
        }
        catch (Exception ex)
        {
            // Log error and return empty string to use default fallback
            Console.WriteLine($"Error loading homepage image: {ex.Message}");
            return Ok(new HomePageImageResponseDto 
            { 
                ImageUrl = "", 
                ObjectPositionX = 50, 
                ObjectPositionY = 50 
            });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("homepage-image")]
    public async Task<ActionResult> UpdateHomePageImage([FromBody] UpdateHomePageImageDto dto)
    {
        var settings = await unit.Repository<HomePageSettings>().GetByIdAsync(1);
        if (settings == null)
        {
            // Create new settings if they don't exist
            settings = new HomePageSettings
            {
                Id = 1,
                MainImageUrl = dto.ImageUrl,
                ObjectPositionX = dto.ObjectPositionX ?? 50,
                ObjectPositionY = dto.ObjectPositionY ?? 50
            };
            unit.Repository<HomePageSettings>().Add(settings);
        }
        else
        {
            settings.MainImageUrl = dto.ImageUrl;
            if (dto.ObjectPositionX.HasValue) settings.ObjectPositionX = dto.ObjectPositionX.Value;
            if (dto.ObjectPositionY.HasValue) settings.ObjectPositionY = dto.ObjectPositionY.Value;
            unit.Repository<HomePageSettings>().Update(settings);
        }

        if (await unit.Complete())
        {
            return Ok(new { message = "Homepage image updated successfully", imageUrl = settings.MainImageUrl });
        }

        return BadRequest("Problem updating homepage image");
    }

    [HttpGet("context-page")]
    public async Task<ActionResult<ContextPageResponseDto>> GetContextPage()
    {
        try
        {
            var settings = await unit.Repository<ContextPageSettings>().GetByIdAsync(1);
            if (settings == null)
            {
                return Ok(new ContextPageResponseDto
                {
                    SectionTitle = "",
                    SectionText = "",
                    ImageUrl = "",
                    ObjectPositionX = 50,
                    ObjectPositionY = 50
                });
            }

            // Filter out invalid localhost:3845 URLs
            var imageUrl = settings.ImageUrl ?? "";
            if (!string.IsNullOrEmpty(imageUrl) && imageUrl.Contains("localhost:3845"))
            {
                imageUrl = "";
            }

            return Ok(new ContextPageResponseDto
            {
                SectionTitle = settings.SectionTitle ?? "",
                SectionText = settings.SectionText ?? "",
                ImageUrl = imageUrl,
                ObjectPositionX = settings.ObjectPositionX,
                ObjectPositionY = settings.ObjectPositionY
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error loading context page: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return Ok(new ContextPageResponseDto
            {
                SectionTitle = "",
                SectionText = "",
                ImageUrl = "",
                ObjectPositionX = 50,
                ObjectPositionY = 50
            });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("context-page")]
    public async Task<ActionResult> UpdateContextPage([FromBody] UpdateContextPageDto dto)
    {
        var settings = await unit.Repository<ContextPageSettings>().GetByIdAsync(1);
        if (settings == null)
        {
            settings = new ContextPageSettings
            {
                Id = 1,
                SectionTitle = dto.SectionTitle ?? "",
                SectionText = dto.SectionText ?? "",
                ImageUrl = dto.ImageUrl ?? "",
                ObjectPositionX = dto.ObjectPositionX ?? 50,
                ObjectPositionY = dto.ObjectPositionY ?? 50
            };
            unit.Repository<ContextPageSettings>().Add(settings);
        }
        else
        {
            if (dto.SectionTitle != null) settings.SectionTitle = dto.SectionTitle;
            if (dto.SectionText != null) settings.SectionText = dto.SectionText;
            if (dto.ImageUrl != null) settings.ImageUrl = dto.ImageUrl;
            if (dto.ObjectPositionX.HasValue) settings.ObjectPositionX = dto.ObjectPositionX.Value;
            if (dto.ObjectPositionY.HasValue) settings.ObjectPositionY = dto.ObjectPositionY.Value;
            unit.Repository<ContextPageSettings>().Update(settings);
        }

        if (await unit.Complete())
        {
            return Ok(new { message = "Context page updated successfully" });
        }

        return BadRequest("Problem updating context page");
    }
}

public class AssignRoleDto
{
    public required string Email { get; set; }
}

public class UpdateHomePageImageDto
{
    public required string ImageUrl { get; set; }
    public int? ObjectPositionX { get; set; }
    public int? ObjectPositionY { get; set; }
}

public class HomePageImageResponseDto
{
    public string ImageUrl { get; set; } = string.Empty;
    public int ObjectPositionX { get; set; } = 50;
    public int ObjectPositionY { get; set; } = 50;
}

public class UpdateContextPageDto
{
    public string? SectionTitle { get; set; }
    public string? SectionText { get; set; }
    public string? ImageUrl { get; set; }
    public int? ObjectPositionX { get; set; }
    public int? ObjectPositionY { get; set; }
}

public class ContextPageResponseDto
{
    public string SectionTitle { get; set; } = string.Empty;
    public string SectionText { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int ObjectPositionX { get; set; } = 50;
    public int ObjectPositionY { get; set; } = 50;
}
