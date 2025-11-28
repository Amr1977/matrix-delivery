## PayPal Integration

PayPal has been added as an alternative payment provider alongside Stripe.

### Environment Variables

Add the following to your `.env` file:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox  # or 'live' for production
FRONTEND_URL=http://localhost:3000
```

### Installation

Install the PayPal SDK:

```bash
npm install @paypal/checkout-server-sdk
```

### API Endpoints

#### Create PayPal Order
```http
POST /api/payments/paypal/create-order
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order-123",
  "amount": 50.00,
  "currency": "USD"
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "payment-123",
  "paypalOrderId": "paypal-order-456",
  "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=...",
  "amount": 50.00,
  "currency": "USD"
}
```

#### Capture PayPal Payment
```http
POST /api/payments/paypal/capture
Authorization: Bearer <token>
Content-Type: application/json

{
  "paypalOrderId": "paypal-order-456"
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "payment-123",
  "orderId": "order-123",
  "status": "completed",
  "amount": "50.00",
  "currency": "USD"
}
```

#### Process PayPal Refund
```http
POST /api/payments/paypal/refund/:paymentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 50.00,
  "reason": "Customer requested refund"
}
```

**Response:**
```json
{
  "success": true,
  "refundId": "refund-789",
  "amount": 50.00,
  "currency": "USD",
  "status": "COMPLETED"
}
```

### Database Schema

The `payments` table now includes PayPal-specific columns:

- `paypal_order_id` - PayPal order ID
- `paypal_capture_id` - PayPal capture ID (after payment is captured)

### Service Methods

**PaymentService** now includes:

- `createPayPalOrder(orderId, userId, amount, currency)` - Create a PayPal order
- `capturePayPalPayment(paypalOrderId)` - Capture payment after user approval
- `processPayPalRefund(paymentId, userId, amount, reason)` - Process refund for PayPal payment

### Frontend Integration

1. User selects PayPal as payment method
2. Call `POST /api/payments/paypal/create-order` to get approval URL
3. Redirect user to PayPal approval URL
4. After approval, PayPal redirects back to your success URL
5. Call `POST /api/payments/paypal/capture` with the PayPal order ID
6. Payment is completed

### Testing

Use PayPal sandbox credentials for testing:
- Create sandbox accounts at https://developer.paypal.com
- Use sandbox client ID and secret in `.env`
- Set `PAYPAL_MODE=sandbox`
