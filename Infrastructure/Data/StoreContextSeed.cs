using System.Reflection;
using System.Text.Json;
using Core.Entities;
using Microsoft.AspNetCore.Identity;

namespace Infrastructure.Data;

public class StoreContextSeed
{
    public static async Task SeedAsync(StoreContext context, UserManager<AppUser> userManager)
    {
        // Ensure admin user exists and has Admin role
        var adminUser = await userManager.FindByEmailAsync("admin@test.com");
        
        if (adminUser == null)
        {
            adminUser = new AppUser
            {
                UserName = "admin@test.com",
                Email = "admin@test.com",
            };

            await userManager.CreateAsync(adminUser, "Pa$$w0rd");
        }

        // Ensure admin user has Admin role (assign even if user already exists)
        var isInAdminRole = await userManager.IsInRoleAsync(adminUser, "Admin");
        if (!isInAdminRole)
        {
            await userManager.AddToRoleAsync(adminUser, "Admin");
        }

        var path = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);

        if (!context.Products.Any())
        {
            var productsData = await File
                .ReadAllTextAsync(path + @"/Data/SeedData/products.json");

            var products = JsonSerializer.Deserialize<List<Product>>(productsData);

            if (products == null) return;

            context.Products.AddRange(products);

            await context.SaveChangesAsync();
        }

        if (!context.DeliveryMethods.Any())
        {
            var dmData = await File
                .ReadAllTextAsync(path + @"/Data/SeedData/delivery.json");

            var methods = JsonSerializer.Deserialize<List<DeliveryMethod>>(dmData);

            if (methods == null) return;

            context.DeliveryMethods.AddRange(methods);

            await context.SaveChangesAsync();
        }

        if (!context.ArchiveImages.Any())
        {
            var archiveData = await File
                .ReadAllTextAsync(path + @"/Data/SeedData/archive-images.json");

            var archiveImages = JsonSerializer.Deserialize<List<ArchiveImage>>(archiveData);

            if (archiveImages == null) return;

            context.ArchiveImages.AddRange(archiveImages);

            await context.SaveChangesAsync();
        }
    }
}
