# Smoke Test Guide

This guide walks through testing the complete workflow end-to-end.

## Prerequisites

1. All services running:
   ```bash
   docker compose ps
   ```
   Should show: `postgres`, `redis`, `minio`, `api`, `worker`, `admin_web`, `shop_web` all running

2. API health check:
   ```bash
   curl http://127.0.0.1:3004/health
   ```
   Should return: `{"status":"ok","database":"connected"}`

3. Admin UI: http://localhost:3005
4. Shop UI: http://localhost:3000

## Test Steps

### 1. Admin Login
- Navigate to http://localhost:3005/login
- Login with admin credentials
- Should redirect to dashboard

### 2. Create a Client
- Click "Clients" on dashboard
- Click "Add Client"
- Enter client name (e.g., "Test Client")
- Click "Create"
- Verify client appears in list

### 3. Connect Social Platform
- Click "Connect accounts" for the client
- Or navigate to Settings page
- Connect at least one platform (Facebook, Instagram, or TikTok)
- Verify integration appears in list
- Verify destinations are refreshed and appear

### 4. Create a Supplier
- Navigate to `/suppliers` (or create via API)
- Create a supplier with name, phone, email, address
- Verify supplier appears in list

### 5. Create a Product
- Navigate to Products page
- Create a product with:
  - Supplier (select the one created above)
  - Title, description, slug
  - Pricing: supplyPrice, minSellPrice, listPrice
  - Price disclaimer (optional)
  - Status: "published"
- Verify product appears in list

### 6. Verify Product in Shop
- Navigate to http://localhost:3000
- Verify product appears on homepage
- Click product to view details
- Verify listPrice and priceDisclaimer are displayed
- Verify supplier information is available

### 7. Create a Post for Client
- Navigate to `/compose`
- **Step 0**: Select the client created above
- **Step 1**: Select media (at least one)
- **Step 2**: Select destinations (filtered by client)
- **Step 3**: Write captions for selected platforms
- **Step 4**: Optionally link products (filtered by client)
- Click "Save Post"
- Verify post appears in dashboard/posts list

### 8. Publish Post
- Find the created post
- Click "Publish" or use API endpoint
- Verify post status changes to "publishing" then "published"
- Check worker logs for processing
- Verify UsageEvent is created for billing

### 9. Generate Invoice
- Navigate to `/billing`
- Select the client
- Set periodStart and periodEnd dates (covering the post publish date)
- Click "Generate Invoice"
- Verify invoice is created with line items
- Verify invoice shows correct total

### 10. Mark Invoice as Paid
- On the invoice list, click "Mark Paid" for the generated invoice
- Verify invoice status changes to "paid"
- Verify paidAt date is set

### 11. Test Order Flow (Optional)
- Add product to cart in shop
- Checkout with customer details
- Verify order is created with quotedTotal
- Test price override (admin only):
  - Use API: `PUT /orders/:id/override-price`
  - Set finalTotal, reason
- Create payment (uses finalTotal if set)
- Verify receipt is generated after payment

## API Endpoints Reference

### Clients
- `GET /clients` - List clients
- `POST /clients` - Create client
- `GET /clients/:id/social/summary` - Check social connections

### Suppliers
- `GET /suppliers` - List suppliers
- `POST /suppliers` - Create supplier

### Products
- `GET /products?clientId=xxx` - List products (filtered by client)
- `POST /products` - Create product (requires supplierId, pricing fields)

### Posts
- `POST /posts` - Create post (requires clientId)
- `GET /posts?clientId=xxx` - List posts
- `POST /posts/:id/publish` - Publish post

### Billing
- `GET /billing/clients/:clientId/invoices` - List invoices
- `POST /billing/clients/:clientId/invoices/generate?periodStart=...&periodEnd=...` - Generate invoice
- `POST /billing/invoices/:id/mark-paid` - Mark invoice as paid

### Orders
- `POST /orders` - Create order (sets quotedTotal)
- `PUT /orders/:id/override-price` - Override price (admin only)
- `GET /orders/:publicId` - Get order details

## Verification Checklist

- [ ] Admin can login
- [ ] Client can be created
- [ ] Social platform can be connected
- [ ] Supplier can be created
- [ ] Product can be created with supplier and pricing
- [ ] Product appears in shop with correct pricing
- [ ] Post composer requires client selection
- [ ] Destinations and products are filtered by client
- [ ] Post can be created and published
- [ ] UsageEvent is created when post is published
- [ ] Invoice can be generated for client
- [ ] Invoice can be marked as paid
- [ ] Order can be created with quotedTotal
- [ ] Price override works (admin only)
- [ ] Receipt is generated after payment

## Troubleshooting

### API not responding
- Check: `docker compose logs api`
- Verify: `curl http://127.0.0.1:3004/health`

### Database errors
- Check: `docker compose logs postgres`
- Run migrations: `docker compose exec api pnpm exec prisma migrate deploy`

### Frontend not loading
- Check: `docker compose logs admin_web` or `docker compose logs shop_web`
- Verify ports: Admin (3005), Shop (3000)

### Worker not processing
- Check: `docker compose logs worker`
- Verify Redis connection
- Check queue status
