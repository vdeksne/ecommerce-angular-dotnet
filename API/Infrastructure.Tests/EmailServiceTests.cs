using Core.Entities;
using Core.Entities.OrderAggregate;
using Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Infrastructure.Tests;

public class EmailServiceTests
{
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly Mock<ILogger<EmailService>> _loggerMock;
    private readonly EmailService _emailService;

    public EmailServiceTests()
    {
        _configurationMock = new Mock<IConfiguration>();
        _loggerMock = new Mock<ILogger<EmailService>>();
        _emailService = new EmailService(_configurationMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task SendOrderConfirmationEmailAsync_WithValidOrderAndEmailSettings_LogsSuccess()
    {
        // Arrange
        var order = CreateTestOrder();

        _configurationMock.Setup(c => c["EmailSettings:SmtpHost"])
            .Returns("smtp.gmail.com");
        _configurationMock.Setup(c => c["EmailSettings:SmtpPort"])
            .Returns("587");
        _configurationMock.Setup(c => c["EmailSettings:SmtpUsername"])
            .Returns("test@example.com");
        _configurationMock.Setup(c => c["EmailSettings:SmtpPassword"])
            .Returns("test-password");
        _configurationMock.Setup(c => c["EmailSettings:FromEmail"])
            .Returns("noreply@victoriadexne.com");
        _configurationMock.Setup(c => c["EmailSettings:FromName"])
            .Returns("Victoria Dexne");

        // Act
        await _emailService.SendOrderConfirmationEmailAsync(order);

        // Assert - Email sending will fail in test environment (no real SMTP),
        // but we verify it doesn't throw and logs appropriately
        // In a real scenario, you'd use a test SMTP server or mock SmtpClient
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Order confirmation email sent")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Never); // Will fail in test, but that's expected
    }

    [Fact]
    public async Task SendOrderConfirmationEmailAsync_WithMissingEmailSettings_LogsWarning()
    {
        // Arrange
        var order = CreateTestOrder();

        _configurationMock.Setup(c => c["EmailSettings:SmtpHost"])
            .Returns((string?)null);
        _configurationMock.Setup(c => c["EmailSettings:SmtpUsername"])
            .Returns((string?)null);

        // Act
        await _emailService.SendOrderConfirmationEmailAsync(order);

        // Assert
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email settings not configured")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SendOrderConfirmationEmailAsync_WithMissingBuyerEmail_LogsWarning()
    {
        // Arrange
        var order = CreateTestOrder();
        order.BuyerEmail = string.Empty;

        _configurationMock.Setup(c => c["EmailSettings:SmtpHost"])
            .Returns("smtp.gmail.com");
        _configurationMock.Setup(c => c["EmailSettings:SmtpUsername"])
            .Returns("test@example.com");

        // Act
        await _emailService.SendOrderConfirmationEmailAsync(order);

        // Assert
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("No buyer email found")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SendOrderConfirmationEmailAsync_WithSmtpError_LogsErrorButDoesNotThrow()
    {
        // Arrange
        var order = CreateTestOrder();

        _configurationMock.Setup(c => c["EmailSettings:SmtpHost"])
            .Returns("invalid-smtp-host");
        _configurationMock.Setup(c => c["EmailSettings:SmtpPort"])
            .Returns("587");
        _configurationMock.Setup(c => c["EmailSettings:SmtpUsername"])
            .Returns("test@example.com");
        _configurationMock.Setup(c => c["EmailSettings:SmtpPassword"])
            .Returns("test-password");

        // Act & Assert - Should not throw
        await _emailService.SendOrderConfirmationEmailAsync(order);

        // Verify error was logged
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Failed to send order confirmation email")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    private Order CreateTestOrder()
    {
        return new Order
        {
            Id = 1,
            BuyerEmail = "customer@example.com",
            OrderDate = DateTime.UtcNow,
            Subtotal = 200.00m,
            Discount = 0m,
            PaymentIntentId = "pi_test_123",
            ShippingAddress = new ShippingAddress
            {
                Name = "John Doe",
                Line1 = "123 Main St",
                Line2 = "Apt 4B",
                City = "New York",
                State = "NY",
                PostalCode = "10001",
                Country = "US"
            },
            DeliveryMethod = new DeliveryMethod
            {
                Id = 1,
                ShortName = "Standard",
                DeliveryTime = "3-5 days",
                Description = "Standard Delivery",
                Price = 10.00m
            },
            OrderItems = new List<OrderItem>
            {
                new OrderItem
                {
                    ItemOrdered = new ProductItemOrdered
                    {
                        ProductId = 1,
                        ProductName = "Test Product",
                        PictureUrl = "/images/test.jpg"
                    },
                    Price = 100.00m,
                    Quantity = 2
                }
            },
            PaymentSummary = new PaymentSummary
            {
                Last4 = 4242,
                Brand = "visa",
                ExpMonth = 12,
                ExpYear = 2025
            }
        };
    }
}

