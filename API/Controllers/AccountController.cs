using System.Security.Claims;
using API.DTOs;
using API.Extensions;
using Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

public class AccountController(SignInManager<AppUser> signInManager) : BaseApiController
{
    [HttpPost("register")]
    public async Task<ActionResult> Register(RegisterDto registerDto)
    {
        var user = new AppUser
        {
            FirstName = registerDto.FirstName,
            LastName = registerDto.LastName,
            Email = registerDto.Email,
            UserName = registerDto.Email
        };

        var result = await signInManager.UserManager.CreateAsync(user, registerDto.Password);

        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(error.Code, error.Description);
            }

            return ValidationProblem();
        }

        return Ok();
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<ActionResult> Logout()
    {
        await signInManager.SignOutAsync();

        return NoContent();
    }

    [HttpGet("user-info")]
    public async Task<ActionResult> GetUserInfo()
    {
        if (User.Identity?.IsAuthenticated == false) return NoContent();

        var user = await signInManager.UserManager.GetUserByEmailWithAddress(User);
        
        // Get all roles for the user
        var roles = await signInManager.UserManager.GetRolesAsync(user);

        // Always return roles as an array for consistency
        return Ok(new
        {
            user.FirstName,
            user.LastName,
            user.Email,
            Address = user.Address?.ToDto(),
            Roles = roles.ToArray() // Always return as array
        });
    }

    [HttpGet("auth-status")]
    public ActionResult GetAuthState()
    {
        return Ok(new { IsAuthenticated = User.Identity?.IsAuthenticated ?? false });
    }

    [Authorize]
    [HttpPost("address")]
    public async Task<ActionResult<Address>> CreateOrUpdateAddress(AddressDto addressDto)
    {
        var user = await signInManager.UserManager.GetUserByEmailWithAddress(User);

        if (user.Address == null)
        {
            user.Address = addressDto.ToEntity();
        }
        else 
        {
            user.Address.UpdateFromDto(addressDto);
        }

        var result = await signInManager.UserManager.UpdateAsync(user);

        if (!result.Succeeded) return BadRequest("Problem updating user address");

        return Ok(user.Address.ToDto());
    }

    [Authorize]
    [HttpPost("reset-password")]
    public async Task<ActionResult> ResetPassword(string currentPassword, string newPassword)
    {
        var user = await signInManager.UserManager.GetUserByEmail(User);

        var result = await signInManager.UserManager.ChangePasswordAsync(user, currentPassword, newPassword);

        if (result.Succeeded)
        {
            return Ok("Password updated");
        } 

        return BadRequest("Failed to update password");
    }

    // Development-only endpoint to ensure admin user has Admin role
    // WARNING: Remove this in production or add proper authentication
    [HttpPost("ensure-admin-role")]
    public async Task<ActionResult> EnsureAdminRole()
    {
        var adminUser = await signInManager.UserManager.FindByEmailAsync("admin@test.com");
        
        if (adminUser == null)
        {
            return NotFound("Admin user (admin@test.com) not found");
        }

        var isInAdminRole = await signInManager.UserManager.IsInRoleAsync(adminUser, "Admin");
        
        if (isInAdminRole)
        {
            return Ok(new { message = "Admin user already has Admin role", email = adminUser.Email });
        }

        var result = await signInManager.UserManager.AddToRoleAsync(adminUser, "Admin");
        
        if (result.Succeeded)
        {
            return Ok(new { message = "Admin role assigned to admin@test.com", email = adminUser.Email });
        }

        return BadRequest(new { errors = result.Errors });
    }

    // Development-only endpoint to assign admin role to the currently logged-in user
    // WARNING: Remove or secure this in production
    [Authorize]
    [HttpPost("assign-admin-to-self")]
    public async Task<ActionResult> AssignAdminRoleToSelf()
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrEmpty(email))
        {
            return BadRequest(new { error = "Email claim not found" });
        }

        var user = await signInManager.UserManager.FindByEmailAsync(email);
        if (user == null)
        {
            return NotFound($"User with email {email} not found");
        }

        var isInAdminRole = await signInManager.UserManager.IsInRoleAsync(user, "Admin");
        if (isInAdminRole)
        {
            return Ok(new { message = $"User {email} already has Admin role", email = email });
        }

        var result = await signInManager.UserManager.AddToRoleAsync(user, "Admin");
        if (result.Succeeded)
        {
            return Ok(new 
            { 
                message = $"Admin role assigned to {email}. Please log out and log back in for the changes to take effect.", 
                email = email 
            });
        }

        return BadRequest(new { errors = result.Errors });
    }

    // Simple endpoint to create a new admin user
    // WARNING: Remove or secure this in production
    [HttpPost("create-admin")]
    public async Task<ActionResult> CreateAdminUser([FromBody] CreateAdminDto dto)
    {
        // Check if user already exists
        var existingUser = await signInManager.UserManager.FindByEmailAsync(dto.Email);
        if (existingUser != null)
        {
            // User exists, just assign admin role
            var isInAdminRole = await signInManager.UserManager.IsInRoleAsync(existingUser, "Admin");
            if (!isInAdminRole)
            {
                var roleResult = await signInManager.UserManager.AddToRoleAsync(existingUser, "Admin");
                if (roleResult.Succeeded)
                {
                    return Ok(new { message = $"Admin role assigned to existing user {dto.Email}", email = dto.Email });
                }
                return BadRequest(new { errors = roleResult.Errors });
            }
            return Ok(new { message = $"User {dto.Email} already has Admin role", email = dto.Email });
        }

        // Create new user
        var user = new AppUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            FirstName = dto.FirstName ?? "",
            LastName = dto.LastName ?? ""
        };

        var createResult = await signInManager.UserManager.CreateAsync(user, dto.Password);
        
        if (!createResult.Succeeded)
        {
            return BadRequest(new { errors = createResult.Errors });
        }

        // Assign Admin role
        var addRoleResult = await signInManager.UserManager.AddToRoleAsync(user, "Admin");
        
        if (!addRoleResult.Succeeded)
        {
            return BadRequest(new { errors = addRoleResult.Errors });
        }

        return Ok(new { 
            message = $"Admin user created successfully: {dto.Email}", 
            email = dto.Email 
        });
    }
}

public class CreateAdminDto
{
    public required string Email { get; set; }
    public required string Password { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}
