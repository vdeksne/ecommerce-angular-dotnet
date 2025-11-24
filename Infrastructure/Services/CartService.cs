using System.Text.Json;
using System.Text.Json.Serialization;
using Core.Entities;
using Core.Interfaces;
using StackExchange.Redis;

namespace Infrastructure.Services;

public class CartService(IConnectionMultiplexer redis) : ICartService
{
    private readonly IDatabase _database = redis.GetDatabase();
    // Use case-insensitive options to handle both PascalCase (existing data) and camelCase (new data)
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        ReferenceHandler = ReferenceHandler.IgnoreCycles,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public async Task<bool> DeleteCartAsync(string key)
    {
        return await _database.KeyDeleteAsync(key);
    }

    public async Task<ShoppingCart?> GetCartAsync(string key)
    {
        var data = await _database.StringGetAsync(key);

        if (data.IsNullOrEmpty) return null;
        
        return JsonSerializer.Deserialize<ShoppingCart>(data!, _jsonOptions);
    }

    public async Task<ShoppingCart?> SetCartAsync(ShoppingCart cart)
    {
        var created = await _database.StringSetAsync(cart.Id, 
            JsonSerializer.Serialize(cart, _jsonOptions), TimeSpan.FromDays(30));
    
        if (!created) return null;

        return await GetCartAsync(cart.Id);
    }
}
