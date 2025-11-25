using Core.Entities.OrderAggregate;

namespace Core.Interfaces;

public interface IEmailService
{
    Task SendOrderConfirmationEmailAsync(Order order);
}

