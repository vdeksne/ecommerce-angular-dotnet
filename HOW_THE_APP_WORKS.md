# How This Ecommerce Application Works

## 🏗️ Architecture Overview

This is a **full-stack ecommerce application** built with:

- **Frontend**: Angular 21 (TypeScript) - Single Page Application (SPA)
- **Backend**: .NET 9 Web API (C#)
- **Database**: SQL Server with Entity Framework Core
- **Caching**: Redis (for shopping cart and response caching)
- **Payment Processing**: Stripe
- **Authentication**: ASP.NET Core Identity with cookie-based auth
- **Real-time Communication**: SignalR
- **Email**: SMTP (Gmail) for order confirmations
- **UI Framework**: Angular Material + TailwindCSS

---

## 📁 Project Structure

```
ecommerce-angular-dotnet/
├── API/                    # .NET Backend
│   ├── Controllers/        # API endpoints
│   ├── DTOs/              # Data Transfer Objects
│   ├── Middleware/        # Custom middleware
│   └── Program.cs         # Application entry point
├── Core/                  # Domain entities and interfaces
│   ├── Entities/          # Database models
│   └── Interfaces/        # Service contracts
├── Infrastructure/        # External services & data access
│   ├── Data/             # Entity Framework context & repositories
│   └── Services/         # PaymentService, EmailService, etc.
└── client/               # Angular frontend
    └── src/app/
        ├── features/     # Feature modules (shop, cart, checkout, etc.)
        ├── core/         # Core services, guards, interceptors
        └── shared/       # Shared components
```

---

## 🔄 Application Flow

### 1. **User Authentication Flow**

**Login Process:**

1. User enters email/password on login page
2. Frontend sends POST request to `/api/login` (Identity API endpoint)
3. Backend validates credentials using ASP.NET Core Identity
4. On success, backend sets authentication cookie
5. Frontend calls `/api/account/user-info` to get user details and roles
6. User information stored in Angular signal (`AccountService.currentUser`)
7. Navigation guards check authentication status for protected routes

**Key Files:**

- `client/src/app/core/services/account.service.ts` - Frontend auth service
- `API/Controllers/AccountController.cs` - Backend auth endpoints
- `client/src/app/core/guards/auth.guard.ts` - Route protection

**Default Admin Account:**

- Email: `admin@test.com`
- Password: `Pa$$w0rd`
- Automatically created with "Admin" role during database seeding

---

### 2. **Shopping Experience Flow**

**Browse Products:**

1. User visits `/shop` page
2. Frontend requests products from `/api/products`
3. Backend queries SQL Server database (with optional Redis caching)
4. Products displayed with pagination, filtering, and sorting
5. User clicks product to see details on `/shop/:id`

**Add to Cart:**

1. User selects quantity and clicks "Add to Cart"
2. Frontend generates/retrieves cart ID (stored in localStorage)
3. Cart data stored in **Redis** (not database) for fast access
4. Cart contents sent to `/api/cart` endpoint
5. Cart count badge updates in header automatically

**Cart Storage:**

- Shopping cart stored in Redis (in-memory, fast)
- Cart ID stored in browser localStorage
- Cart expires automatically after inactivity
- No database storage until checkout completes

---

### 3. **Checkout & Payment Flow**

**Step 1: Address Collection**

- User enters shipping address using Stripe Address Element
- Address validated and stored in browser memory
- No payment required yet

**Step 2: Delivery Method**

- User selects shipping option (Standard, Express, etc.)
- Shipping cost added to order total
- Delivery methods stored in SQL Server database

**Step 3: Payment**

1. Frontend calls `/api/payments/create-payment-intent` (or `/api/payments/create-or-update-payment-intent`)
2. Backend calculates order total (subtotal + shipping - coupon discount)
3. Backend creates Stripe Payment Intent with amount
4. Stripe returns `clientSecret` to frontend
5. Frontend loads Stripe.js library
6. Stripe Payment Element mounted in Angular component
7. User enters card details (Stripe handles all PCI compliance)
8. Stripe validates card in real-time
9. Frontend creates confirmation token (collects payment + address data)
10. Confirmation token saved for order creation

**Step 4: Review & Confirm**

1. User reviews order details (items, address, total)
2. User clicks "Place Order"
3. Frontend calls `stripe.confirmPayment()` with confirmation token
4. Stripe processes payment (charges card)
5. On success, frontend calls `/api/orders` to create order in database
6. Backend:
   - Creates `Order` entity in SQL Server
   - Creates `OrderItem` entities for each cart item
   - Sets order status to "Pending"
   - Sends order confirmation email (if configured)
7. Cart deleted from Redis
8. User redirected to `/checkout/success` page

**Payment Integration:**

- Uses Stripe Payment Element (modern, PCI-compliant)
- Supports credit/debit cards
- Apple Pay & Google Pay disabled (can be enabled)
- Handles free orders (< $0.50) without Stripe
- Supports coupon codes for discounts

**Key Files:**

- `client/src/app/core/services/stripe.service.ts` - Stripe integration
- `client/src/app/features/checkout/checkout.component.ts` - Checkout logic
- `Infrastructure/Services/PaymentService.cs` - Backend payment service
- `API/Controllers/PaymentsController.cs` - Payment API endpoints

---

### 4. **Order Management**

**Customer View:**

- Users can view their order history at `/orders`
- Shows order status, date, total, items
- Protected route (requires authentication)

**Admin View:**

- Admins access `/admin` page
- View all orders across all customers
- Filter by status, date range
- Issue refunds through Stripe
- Update order status

**Order Status Flow:**

1. **Pending** - Order created, payment received
2. **PaymentReceived** - Payment confirmed via Stripe webhook
3. **PaymentMismatch** - Payment amount doesn't match order total
4. **Refunded** - Admin issued refund

---

### 5. **Admin Features**

**Product Management:**

- Add/edit/delete products
- Upload product images
- Set prices, stock quantities
- Configure product details

**Order Management:**

- View all orders
- Filter and search orders
- Issue refunds
- Update order status

**Content Management:**

- Upload homepage image
- Configure context page content
- Manage archive images

**Access Control:**

- Admin routes protected by `adminGuard`
- Backend endpoints require `[Authorize(Roles = "Admin")]`
- Non-admin users see notification: "Admin role required"

**Key Files:**

- `client/src/app/features/admin/admin.component.ts` - Admin dashboard
- `API/Controllers/AdminController.cs` - Admin API endpoints
- `API/Controllers/UploadController.cs` - Image upload endpoint

---

### 6. **Email Notifications**

**Order Confirmation:**

- Email sent after successful order creation
- Contains order details, items, total
- Sent using SMTP (Gmail configured)
- Optional feature (orders still created if email fails)

**Configuration:**

- SMTP settings in `API/appsettings.Development.json`
- Requires Gmail App Password (not regular password)
- Email service logs warnings if not configured

**Key Files:**

- `Infrastructure/Services/EmailService.cs` - Email sending logic
- `API/Controllers/OrdersController.cs` - Calls email service after order creation

---

## 🔌 API Endpoints

### Public Endpoints (No Auth Required):

- `GET /api/products` - List products
- `GET /api/products/:id` - Product details
- `GET /api/deliverymethods` - Shipping options
- `POST /api/cart` - Update cart
- `POST /api/login` - User login
- `POST /api/account/register` - User registration
- `POST /api/orders` - Create order (guest checkout allowed)

### Protected Endpoints (Auth Required):

- `GET /api/account/user-info` - Current user info
- `POST /api/account/logout` - Logout
- `GET /api/orders` - User's order history
- `GET /api/orders/:id` - Order details

### Admin Only Endpoints:

- `GET /api/admin/orders` - All orders
- `POST /api/admin/refund` - Issue refund
- `GET /api/admin/products` - All products (with admin data)
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `POST /api/upload/product-image` - Upload image

### Payment Endpoints:

- `POST /api/payments/create-or-update-payment-intent` - Create/update payment intent
- `POST /api/payments/webhook` - Stripe webhook handler (payment confirmation)

---

## 🗄️ Database Schema

**Main Entities:**

1. **Product** - Product catalog

   - Id, Name, Description, Price, PictureUrl, etc.

2. **ShoppingCart** - Stored in Redis (not SQL Server)

   - CartId, Items (List<CartItem>), ClientSecret, PaymentIntentId

3. **Order** - Completed orders

   - Id, BuyerEmail, OrderDate, Status, ShippingAddress, etc.
   - Contains OrderItems (one-to-many)

4. **OrderItem** - Items within an order

   - ProductItemOrdered (snapshot), Price, Quantity

5. **AppUser** - User accounts (Identity)

   - Email, FirstName, LastName, Address, Roles

6. **DeliveryMethod** - Shipping options

   - Id, ShortName, DeliveryTime, Description, Price

7. **AppCoupon** - Discount codes
   - Code, AmountOff, PercentOff, Duration

---

## 🔐 Authentication & Authorization

**Authentication:**

- Cookie-based authentication (HTTP-only cookies)
- ASP.NET Core Identity for user management
- JWT tokens not used (cookies preferred for security)

**Authorization:**

- Role-based access control (RBAC)
- Roles: `Admin`, `Member` (default)
- Frontend checks `AccountService.isAdmin` computed signal
- Backend uses `[Authorize(Roles = "Admin")]` attributes

**How Roles Work:**

1. User logs in → Identity validates credentials
2. Backend returns user info with roles array
3. Frontend stores in `currentUser` signal
4. `isAdmin` computed signal checks if roles include "Admin"
5. Guards and components use `isAdmin()` to show/hide features

---

## 💳 Payment Processing

**Stripe Integration:**

1. **Payment Intent Creation:**

   - Backend creates Stripe Payment Intent with order total
   - Returns `clientSecret` to frontend

2. **Payment Element:**

   - Stripe.js library loaded in browser
   - Payment Element mounted (handles card input)
   - User enters card details
   - Stripe validates in real-time

3. **Confirmation Token:**

   - Frontend creates confirmation token (collects payment + address)
   - Token ID stored for order creation

4. **Payment Confirmation:**

   - Frontend calls `stripe.confirmPayment()`
   - Stripe charges the card
   - Payment status returned

5. **Webhook Handler:**
   - Stripe sends webhook event to `/api/payments/webhook`
   - Backend updates order status to "PaymentReceived"
   - Validates payment amount matches order total

**Free Orders:**

- Orders under $0.50 skip Stripe (minimum charge requirement)
- Uses Setup Intent to save payment method for future
- Order created directly without payment processing

---

## 🛒 Shopping Cart Architecture

**Redis Storage:**

- Cart stored in Redis for fast access
- Key format: `cart:{cartId}`
- Cart expires after inactivity
- Contains: Items, DeliveryMethodId, ClientSecret, PaymentIntentId, Coupon

**Cart ID Management:**

- Generated using `nanoid()` library
- Stored in browser localStorage
- Persists across page refreshes
- New cart created if ID not found

**Cart Service:**

- Angular service manages cart state
- Uses signals for reactive updates
- Computed signals for item count and totals
- Automatically syncs with Redis via API

---

## 🚀 Real-time Features

**SignalR:**

- WebSocket connection for real-time updates
- Notification hub at `/hub/notifications`
- Currently used for connection status
- Can be extended for live order updates

---

## 📧 Email System

**Order Confirmation Emails:**

- Sent via SMTP (Gmail configured)
- HTML email template
- Contains order summary, items, total, shipping address
- Sent asynchronously (doesn't block order creation)
- Logs warnings if SMTP not configured

**Configuration:**

```json
{
  "EmailSettings": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": 587,
    "SmtpUsername": "your-email@gmail.com",
    "SmtpPassword": "your-app-password",
    "FromEmail": "noreply@victoriadexne.com",
    "FromName": "Victoria Dexne"
  }
}
```

---

## 🎨 Frontend Architecture

**Angular Features:**

- **Standalone Components** - No NgModules
- **Signals** - Reactive state management (Angular 21)
- **Computed Signals** - Derived state (cart totals, admin check)
- **RxJS** - Observable streams for HTTP requests
- **Material Design** - UI components
- **TailwindCSS** - Utility-first styling

**Key Services:**

- `AccountService` - User authentication & info
- `CartService` - Shopping cart management
- `StripeService` - Payment processing
- `ProductService` - Product data
- `OrderService` - Order management

**Interceptors:**

- `apiUrlInterceptor` - Rewrites API URLs
- `authInterceptor` - Adds auth headers (if needed)
- `errorInterceptor` - Global error handling & notifications
- `loadingInterceptor` - Shows loading spinner

**Guards:**

- `authGuard` - Requires authentication
- `adminGuard` - Requires Admin role

---

## 🔄 Data Flow Example: Creating an Order

```
1. User clicks "Place Order"
   ↓
2. Frontend: checkout.component.ts → confirmPayment()
   ↓
3. Frontend: stripeService.confirmPayment(confirmationToken)
   ↓
4. Stripe.js: Processes payment in browser
   ↓
5. Frontend: Receives payment result (status: "succeeded")
   ↓
6. Frontend: orderService.createOrder(orderData)
   ↓
7. HTTP POST: /api/orders
   ↓
8. Backend: OrdersController.CreateOrder()
   ↓
9. Backend: Validates cart, creates Order entity
   ↓
10. Backend: Creates OrderItem entities for each cart item
    ↓
11. Backend: Saves to SQL Server (Database)
    ↓
12. Backend: emailService.SendOrderConfirmationEmailAsync() (async)
    ↓
13. Backend: Returns OrderDto to frontend
    ↓
14. Frontend: Deletes cart from localStorage
    ↓
15. Frontend: cartService.deleteCart() → Clears Redis
    ↓
16. Frontend: Navigate to /checkout/success
```

---

## 🛠️ Development Setup

**Prerequisites:**

- .NET SDK 9
- Node.js 22.14+
- Docker (for SQL Server & Redis)
- Stripe account (for payments)
- Gmail account (for emails)

**Running the App:**

1. Start Docker containers: `docker compose up -d`
2. Run backend: `cd API && dotnet run`
3. Run frontend: `cd client && npm start`
4. Access: `https://localhost:4200`

**Environment:**

- Backend: `https://localhost:5001`
- Frontend: `https://localhost:4200`
- SQL Server: `localhost:1433`
- Redis: `localhost:6379`

---

## 📝 Key Configuration Files

- `API/appsettings.Development.json` - Backend config (Stripe, Email, Database)
- `client/src/environments/environment.ts` - Frontend API URL
- `docker-compose.yml` - SQL Server & Redis containers
- `.gitignore` - Excludes sensitive files (appsettings.json)

---

## 🔍 Common User Flows

### **New User Registration:**

1. User clicks "Register"
2. Fills form (email, password, name)
3. POST `/api/account/register`
4. Account created in Identity
5. User redirected to login
6. User logs in → authenticated

### **Adding Product to Cart:**

1. User browses shop
2. Clicks product
3. Selects quantity
4. Clicks "Add to Cart"
5. Cart ID retrieved/created
6. POST `/api/cart` with item
7. Redis updated
8. Cart badge updates

### **Checkout Process:**

1. User clicks cart → views cart
2. Clicks "Secure Checkout"
3. Enters shipping address
4. Selects delivery method
5. Enters payment details
6. Reviews order
7. Clicks "Place Order"
8. Payment processed
9. Order created
10. Email sent (optional)
11. Success page shown

---

## 🎯 Summary

This is a **modern, full-stack ecommerce platform** with:

- ✅ User authentication & role-based authorization
- ✅ Product catalog with search/filter
- ✅ Shopping cart (Redis-based)
- ✅ Stripe payment processing
- ✅ Order management
- ✅ Admin dashboard
- ✅ Email notifications
- ✅ Real-time capabilities (SignalR)

The architecture follows **separation of concerns**:

- Frontend handles UI/UX and user interactions
- Backend handles business logic, data persistence, and external services
- Database stores permanent data (products, orders, users)
- Redis stores temporary data (carts, cache)

All components work together to provide a seamless shopping experience from browsing products to receiving order confirmations.
