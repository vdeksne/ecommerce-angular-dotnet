using Core.Entities.OrderAggregate;
using Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Mail;

namespace Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendOrderConfirmationEmailAsync(Order order)
    {
        try
        {
            var smtpHost = _configuration["EmailSettings:SmtpHost"];
            var smtpUsername = _configuration["EmailSettings:SmtpUsername"];

            // If email settings are not configured, log and skip sending
            if (string.IsNullOrEmpty(smtpHost) || string.IsNullOrEmpty(smtpUsername))
            {
                _logger.LogWarning("Email settings not configured. Skipping email send for order #{OrderId}", order.Id);
                return;
            }

            var toEmail = order.BuyerEmail;
            if (string.IsNullOrEmpty(toEmail))
            {
                _logger.LogWarning("No buyer email found for order #{OrderId}. Skipping email send.", order.Id);
                return;
            }

            var smtpPort = _configuration.GetValue<int>("EmailSettings:SmtpPort", 587);
            var smtpPassword = _configuration["EmailSettings:SmtpPassword"];
            var fromEmail = _configuration["EmailSettings:FromEmail"] ?? "noreply@victoriadexne.com";
            var fromName = _configuration["EmailSettings:FromName"] ?? "Victoria Dexne";

            var subject = $"Order Confirmation - Order #{order.Id}";
            var body = GenerateOrderConfirmationEmailBody(order);

            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(smtpUsername, smtpPassword),
                EnableSsl = true
            };

            using var message = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };

            message.To.Add(toEmail);

            await client.SendMailAsync(message);
            _logger.LogInformation("Order confirmation email sent successfully to {Email} for order #{OrderId}", toEmail, order.Id);
        }
        catch (Exception ex)
        {
            // Log error but don't fail the order creation
            _logger.LogError(ex, "Failed to send order confirmation email for order #{OrderId}", order.Id);
        }
    }

    private string GenerateOrderConfirmationEmailBody(Order order)
    {
        var itemsHtml = string.Join("", order.OrderItems.Select(item => $@"
            <tr>
                <td style=""padding: 10px; border-bottom: 1px solid #ddd;"">{item.ItemOrdered.ProductName}</td>
                <td style=""padding: 10px; border-bottom: 1px solid #ddd; text-align: center;"">{item.Quantity}</td>
                <td style=""padding: 10px; border-bottom: 1px solid #ddd; text-align: right;"">{item.Price:C}</td>
            </tr>"));

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <style>
        body {{ font-family: 'Nunito Sans', Arial, sans-serif; color: #000; background-color: #fff; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        h1 {{ color: #000; font-size: 24px; margin-bottom: 20px; }}
        p {{ color: #000; line-height: 1.6; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th {{ background-color: #000; color: #fff; padding: 10px; text-align: left; }}
        .total {{ font-weight: bold; font-size: 18px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <h1>Thank you for your order!</h1>
        <p>Dear Customer,</p>
        <p>We're excited to confirm that your order has been received and is being processed.</p>
        
        <h2>Order Details</h2>
        <p><strong>Order Number:</strong> #{order.Id}</p>
        <p><strong>Order Date:</strong> {order.OrderDate:MMMM dd, yyyy 'at' hh:mm tt}</p>
        
        <h3>Order Items</h3>
        <table>
            <thead>
                <tr>
                    <th>Product</th>
                    <th style=""text-align: center;"">Quantity</th>
                    <th style=""text-align: right;"">Price</th>
                </tr>
            </thead>
            <tbody>
                {itemsHtml}
            </tbody>
        </table>
        
        <div class=""total"">
            <p><strong>Subtotal:</strong> {order.Subtotal:C}</p>
            <p><strong>Shipping:</strong> {order.DeliveryMethod.Price:C}</p>
            <p><strong>Total:</strong> {order.GetTotal():C}</p>
        </div>
        
        <h3>Shipping Address</h3>
        <p>
            {order.ShippingAddress.Name}<br>
            {order.ShippingAddress.Line1}<br>
            {(!string.IsNullOrEmpty(order.ShippingAddress.Line2) ? order.ShippingAddress.Line2 + "<br>" : "")}
            {order.ShippingAddress.City}, {order.ShippingAddress.State} {order.ShippingAddress.PostalCode}<br>
            {order.ShippingAddress.Country}
        </p>
        
        <h3>Shipping Method</h3>
        <p>{order.DeliveryMethod.ShortName} - {order.DeliveryMethod.Description}</p>
        
        <p>We'll send you another email when your order ships.</p>
        
        <p>Thank you for your purchase!</p>
        <p>Best regards,<br>Victoria Dexne</p>
    </div>
</body>
</html>";
    }
}

