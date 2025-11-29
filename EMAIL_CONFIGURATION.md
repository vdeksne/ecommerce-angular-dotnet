# Email Configuration Guide

## Problem: Order confirmation emails are not being sent

If you're not receiving order confirmation emails, it's likely because the email settings in `API/appsettings.Development.json` are not configured.

## Quick Fix

1. Open `API/appsettings.Development.json`
2. Configure the email settings in the `EmailSettings` section:

```json
{
  "EmailSettings": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": 587,
    "SmtpUsername": "viktorijadeksne@gmail.com",
    "SmtpPassword": "pgpi xrun tevh gbwt",
    "FromEmail": "noreply@victoriadexne.com",
    "FromName": "Victoria Dexne"
  }
}
```

## For Gmail Users

If you're using Gmail, you need to:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:

   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Navigate to Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this 16-character password (not your regular Gmail password) in `SmtpPassword`

3. Update your `appsettings.Development.json`:
   ```json
   "SmtpUsername": "your-email@gmail.com",
   "SmtpPassword": "your-16-character-app-password"
   ```

## For Other Email Providers

- **Outlook/Hotmail**: Use `smtp-mail.outlook.com` on port 587
- **Yahoo**: Use `smtp.mail.yahoo.com` on port 587
- **Custom SMTP**: Configure according to your provider's settings

## Testing Email Configuration

After configuring your email settings:

1. Restart your backend server
2. Place a test order
3. Check your server logs for email-related messages:
   - Success: "Order confirmation email sent successfully..."
   - Warning: "Email settings not configured. Skipping email send..."
   - Error: "Failed to send order confirmation email..."

## Important Notes

- **Emails are sent asynchronously** - they won't block order creation
- **Email failures don't prevent orders** - orders will still be created even if email fails
- **Check spam folder** - confirmation emails might end up in spam
- **Development vs Production** - Make sure to configure email settings for both environments

## Troubleshooting

If emails still aren't being sent:

1. Check server logs for error messages
2. Verify SMTP credentials are correct
3. Test SMTP connection using a tool like Telnet or online SMTP testers
4. Ensure firewall/network allows SMTP connections (port 587)
5. For Gmail, make sure "Less secure app access" is enabled OR use App Password

## Security Note

**Never commit email passwords to git!** Consider using:

- Environment variables
- User Secrets (for development)
- Azure Key Vault (for production)
- Environment-specific configuration files that are gitignored
