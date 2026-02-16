# Plan: Variant Pricing + Bulk Uploads

Single plan covering **price per storage (variant pricing)** and **bulk uploads** for Categories, Products, and Clients. Updates applied: storage = variant options with price per variant; bulk at three levels; per-row fallbacks for failed uploads; custom popups only (no `alert()`).

---

## A. Price per Storage (Variant-Level Pricing)

### A1. Database & API

| # | Task | Details |
|---|------|--------|
| 1 | **Schema** | Add optional `price` (Decimal) and optionally `currency` to `ProductVariant`. Keep `Product.listPrice` as fallback. Migration + update Prisma client. |
| 2 | **Product/Variant APIs** | Create/update product and variant endpoints accept and return variant `price`. Store APIs (shop) return variant price in product/variant payloads. |
| 3 | **Cart & checkout** | Cart line and order line use **variant price** when `variantId` is set; otherwise fall back to product `listPrice`. Recalculate totals from variant/product prices. |

### A2. Admin

| # | Task | Details |
|---|------|--------|
| 4 | **Product form – variants** | On create/edit product, allow managing variants (e.g. storage: 64GB, 128GB, 256GB) with **price** and stock per variant. Validation: at least one variant if "has variants", price ≥ 0. |
| 5 | **Product list/detail** | Show that product has variants and/or display variant count; ensure variant prices are visible where variants are shown. |

### A3. Shop

| # | Task | Details |
|---|------|--------|
| 6 | **Product page (PDP)** | Show storage options (variants); when user selects e.g. 128GB, display that **variant's price** (and add to cart with that variant). |
| 7 | **Cart & checkout** | Cart and checkout show line price from **variant price** when present; totals computed from variant/product prices. |

---

## B. Bulk Uploads (Categories, Products, Clients)

### B1. Backend – Shared Behaviour

| # | Task | Details |
|---|------|--------|
| 8 | **Bulk processing pattern** | For each bulk endpoint: parse file (CSV/Excel), validate and process **row by row**, collect `{ rowIndex, success, id?, error? }`. Return full list of results + summary (total, succeeded, failed). **Fallback:** one bad row does not stop the batch; all rows are attempted; failures reported. |
| 9 | **Error reporting** | Define response shape: e.g. `{ summary: { total, succeeded, failed }, results: [{ rowIndex, success, id?, error? }] }`. Optional: endpoint or same response to support "download error report" (failed rows + messages). |

### B2. Bulk Upload: Categories

| # | Task | Details |
|---|------|--------|
| 10 | **Categories bulk API** | POST bulk endpoint (e.g. `/categories/bulk` or `/categories/import`): accept file; columns e.g. name, slug (optional), order; validate per row; create/update categories; return results per row + summary. |
| 11 | **Categories bulk UI** | Admin: "Bulk upload" for categories (e.g. from Categories page or shared Import). File picker, upload, then show result in **custom modal** (no `alert()`): summary + list of failed rows (row #, error). Optional: "Download error report" (CSV). |

### B3. Bulk Upload: Products

| # | Task | Details |
|---|------|--------|
| 12 | **Products bulk API** | POST bulk endpoint for products (and variants): accept file; support multiple rows per product for variants (e.g. same product key, each row = storage option with price + stock). Validate; create product + variants with **variant price**; return per-row/per-product results + summary. |
| 13 | **Products bulk UI** | Admin: "Bulk upload" for products. Same pattern: file upload, then **custom modal** with summary and failed rows; optional "Download error report". No `alert()`. |

### B4. Bulk Upload: Clients

| # | Task | Details |
|---|------|--------|
| 14 | **Clients bulk API** | POST bulk endpoint for clients: accept file; columns e.g. name, email, phone; validate per row; create clients; return per-row results + summary. |
| 15 | **Clients bulk UI** | Admin: "Bulk upload" for clients. Same pattern: **custom modal** for summary + failed rows; optional "Download error report". No `alert()`. |

### B5. UI – No `alert()`

| # | Task | Details |
|---|------|--------|
| 16 | **Result modal component** | Reusable modal for bulk results: title, summary line (X succeeded, Y failed), list/table of **failed rows** (row #, identifier, error message), "Download error report" button, "Close". Use for Categories, Products, and Clients. |
| 17 | **Toasts for progress** | Use existing toast/snackbar for "Uploading…", "Processing…", "Upload complete" (no `alert()`). Optional: progress (e.g. "Processing row 50/200") for large files. |
| 18 | **No alert()** | Ensure no `alert()` or `confirm()` is used for bulk upload results or errors anywhere in admin. |

---

## C. Implementation Order (Suggested)

1. **A1** – Schema + product/variant APIs + cart/checkout logic (variant price).
2. **A2** – Admin product form and list/detail (variants with price per storage).
3. **A3** – Shop PDP and cart/checkout (show and charge by variant price).
4. **B1** – Bulk processing pattern and error response shape.
5. **B5 (16–18)** – Result modal + toasts; confirm no `alert()`.
6. **B2** – Categories bulk API + UI (using shared modal).
7. **B4** – Clients bulk API + UI (same modal).
8. **B3** – Products bulk API + UI (with variant rows and variant price).

---

## D. Checklist Summary

| Area | Items |
|------|--------|
| **Variant pricing** | Schema (1), Product/variant APIs (2), Cart/checkout backend (3), Admin product form (4), Admin list/detail (5), Shop PDP (6), Shop cart/checkout (7). |
| **Bulk – backend** | Bulk pattern + error shape (8–9), Categories API (10), Products API (12), Clients API (14). |
| **Bulk – UI** | Result modal + toasts + no alert (16–18), Categories bulk UI (11), Products bulk UI (13), Clients bulk UI (15). |

---

## E. Technical Touchpoints

- **Schema:** `services/api/prisma/schema.prisma` — `Product`, `ProductVariant`, `ProductCategory`, `Client`.
- **Admin:** `apps/admin/` — product/category/client pages; shared "Bulk import" area; reuse or add ToastContext/ConfirmContext; dedicated result modal; no `alert()`.
- **API:** `services/api/src/` — products, categories, clients; bulk-import endpoints returning `{ successCount, failureCount, results[], errors[] }` with row index and message.
- **Shop:** `apps/shop/` — product page, cart, checkout; variant selection uses variant price when present.
