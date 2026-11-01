# Shreem — Luxury Couture & Apparel E-Commerce

**Shreem** is an enterprise-grade E-Commerce Web Application focused primarily on contemporary and ethnic clothing (Women, Men, Kids, and Artisanal Weaves). Built with **Angular (Standalone Architecture)** and powered by **Google Firebase Firestore** for real-time cloud data management.

---

## 🌟 Key Architecture & Highlights

### 1. Separate User & Admin Panels
- **User Panel (`/`)**:
  - **Category Showcase**: Seamless navigation across Men, Women, Kids, and Ethnic Silks.
  - **Live Filters & Sorting**: Category pills, size filter, price sort (low-to-high, high-to-low), rating sort, and live search.
  - **Product Quick View & Details**: Detailed modal with image gallery, fabric specifications, size selection chips, color swatches, stock indicator, and instant Add to Bag.
  - **Slide-out Cart Drawer**: Free luxury shipping progress bar, quantity increment/decrement, promo code engine (`SHREEM10`, `ROYAL20`), price breakdown.
  - **Slide-out Wishlist Drawer**: Save favourite garments with 1-click move to bag.
  - **Checkout Flow**: Complete shipping address entry, payment method picker (UPI, COD, Card), and real-time order placement saved directly into Firestore.

- **Admin Panel (`/admin`)**:
  - **Category-Wise Product Management (`/admin/products`)**:
    - Add new clothing products with image presets or custom URLs, sizes (XS, S, M, L, XL, XXL), fabric, colors, and stock.
    - Edit existing products with immediate Firestore synchronization.
    - Delete products with confirmation modal.
    - Quick +/- stock increment/decrement directly from the table.
    - Filter products category-wise (Women, Men, Kids, Ethnic) or by stock status (In stock, Low stock, Out of stock).
  - **Category Management (`/admin/categories`)**:
    - Add, edit, and delete clothing categories.
  - **Order Management & Fulfillment (`/admin/orders`)**:
    - Real-time customer orders table.
    - Change order status (`Pending` ➔ `Processing` ➔ `Shipped` ➔ `Delivered` ➔ `Cancelled`) updating live in Firestore.
    - View full customer delivery information, address, and items ordered.
  - **Firebase Firestore Settings (`/admin/settings`)**:
    - Real-time Firestore connection status monitor.
    - Interactive Firebase project credentials manager.
    - One-click **"Seed Catalog to Cloud Firestore"** button to populate categories and clothing pieces into your live Firestore collections (`products` and `categories`).
    - Reset local demo storage anytime.

---

## 🗄️ Firestore Database Schema

The application uses three primary collections:

1. **`products`**:
   - `id`: string (e.g. `shreem-w-001`)
   - `name`: string
   - `category`: `'Women' | 'Men' | 'Kids' | 'Ethnic & Festive'`
   - `subcategory`: string (e.g. `'Sarees'`, `'Kurta Sets'`, `'Sherwanis'`, `'Lehengas'`)
   - `price`: number
   - `originalPrice`: number
   - `discount`: number
   - `description`: string
   - `imageUrl`: string
   - `additionalImages`: string[]
   - `sizes`: string[]
   - `colors`: string[]
   - `fabric`: string
   - `stock`: number
   - `rating`: number
   - `reviewCount`: number
   - `isFeatured`: boolean
   - `createdAt`: string

2. **`categories`**:
   - `id`: string
   - `name`: string
   - `slug`: string
   - `description`: string
   - `imageUrl`: string
   - `isFeatured`: boolean

3. **`orders`**:
   - `id`: string (e.g. `ORD-984210`)
   - `customerName`: string
   - `email`: string
   - `phone`: string
   - `address`: string
   - `city`: string
   - `postalCode`: string
   - `items`: Array<{ productId, name, price, quantity, size, color, imageUrl }>
   - `subtotal`: number
   - `shipping`: number
   - `discount`: number
   - `totalAmount`: number
   - `status`: `'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'`
   - `paymentMethod`: string
   - `createdAt`: string

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v20+` or `v22+`
- npm `10+`

### Installation & Run

1. Clone and install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```
   or:
   ```bash
   ng serve
   ```

3. Open your browser:
   - **Customer Storefront**: `http://localhost:4200/`
   - **Admin Management Portal**: `http://localhost:4200/admin`

### Connecting Live Firebase Firestore

1. Open the Admin Panel at `http://localhost:4200/admin/settings`.
2. Enter your Firebase project credentials (`apiKey`, `projectId`, `authDomain`, etc.).
3. Click **"Save & Connect Firestore"**.
4. Click **"Seed Catalog to Cloud Firestore"** to automatically populate your Firestore database with the demo clothing catalog!
5. Ensure your Firestore Security Rules permit read/write access during development:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
