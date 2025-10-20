# SendGrid Email Configuration

This document explains how to configure SendGrid for transactional emails in the CrowdVine application.

## Environment Variables

Add these environment variables to your Vercel project:

### Required Variables

```env
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@pactwines.com
SENDGRID_FROM_NAME=CrowdVine
```

### Optional Variables

```env
SENDGRID_REPLY_TO=support@pactwines.com
```

## SendGrid Setup

### 1. Create SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/)
2. Sign up for a free account (100 emails/day free)
3. Verify your account via email

### 2. Create API Key

1. Go to Settings → API Keys
2. Click "Create API Key"
3. Choose "Restricted Access"
4. Give it a name: "CrowdVine Production"
5. Select permissions:
   - Mail Send: Full Access
6. Copy the API key (you won't see it again!)

### 3. Verify Sender Identity

1. Go to Settings → Sender Authentication
2. Choose "Single Sender Verification"
3. Add your email: `noreply@pactwines.com`
4. Verify the email address

### 4. Domain Authentication (Recommended for Production)

1. Go to Settings → Sender Authentication
2. Choose "Domain Authentication"
3. Add your domain: `pactwines.com`
4. Follow DNS setup instructions
5. This improves deliverability and allows custom "from" addresses

## Email Templates

The application includes two main email templates:

### 1. Order Confirmation Email

- Sent when a customer completes a purchase
- Includes order details, items, pricing, and shipping info
- Professional design with CrowdVine branding

### 2. Welcome Email

- Sent when a new user creates an account
- Introduces CrowdVine features and benefits
- Includes call-to-action to start shopping

## API Endpoints

### Send Order Confirmation

```
POST /api/email/order-confirmation
```

**Request Body:**

```json
{
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "orderId": "ORD-123456",
  "orderDate": "2024-01-15",
  "items": [
    {
      "name": "Château Margaux 2015",
      "quantity": 2,
      "price": 1500.0,
      "image": "https://example.com/wine.jpg"
    }
  ],
  "subtotal": 3000.0,
  "tax": 750.0,
  "shipping": 100.0,
  "total": 3850.0,
  "shippingAddress": {
    "name": "John Doe",
    "street": "123 Main St",
    "city": "Stockholm",
    "postalCode": "12345",
    "country": "Sweden"
  }
}
```

### Send Welcome Email

```
POST /api/email/welcome
```

**Request Body:**

```json
{
  "customerEmail": "customer@example.com",
  "customerName": "John Doe"
}
```

## Testing

### Test Locally

1. Set up environment variables in `.env.local`
2. Use SendGrid's test mode or sandbox
3. Test with your own email address first

### Test in Production

1. Deploy to Vercel with environment variables
2. Test order confirmation flow
3. Test signup welcome email
4. Check SendGrid dashboard for delivery stats

## Monitoring

### SendGrid Dashboard

1. Go to Activity → Email Activity
2. Monitor delivery rates, bounces, and spam reports
3. Check for any delivery issues

### Application Logs

Check Vercel logs for email sending errors:

```bash
vercel logs --follow
```

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Check if API key is correctly set in environment variables
   - Verify API key has Mail Send permissions

2. **Sender Not Verified**
   - Verify sender email in SendGrid dashboard
   - Use verified domain for better deliverability

3. **Emails Not Delivered**
   - Check spam folder
   - Verify recipient email addresses
   - Check SendGrid activity dashboard

4. **Rate Limits**
   - Free tier: 100 emails/day
   - Upgrade plan for higher limits

### Error Codes

- `401`: Invalid API key
- `403`: Insufficient permissions
- `413`: Email too large
- `429`: Rate limit exceeded

## Security Best Practices

1. **Never commit API keys to git**
2. **Use environment variables only**
3. **Rotate API keys regularly**
4. **Monitor usage and costs**
5. **Use domain authentication for production**

## Cost Optimization

1. **Start with free tier** (100 emails/day)
2. **Monitor usage** in SendGrid dashboard
3. **Upgrade only when needed**
4. **Use templates** to reduce API calls
5. **Implement email preferences** for users

## Support

- SendGrid Documentation: https://docs.sendgrid.com/
- SendGrid Support: Available in dashboard
- Vercel Support: For deployment issues
