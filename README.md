# Anime Alley

Anime Alley is a full-stack MERN e-commerce app for anime fans, with a customer storefront and an admin dashboard.

## Features

### Customer Experience

- Email/password sign-up with OTP verification and Google login
- Product browsing with search, category, type and price filters
- Stock held for you while it's in your cart, with coupon support at checkout
- Cash on Delivery and Stripe Checkout payment options
- Order history with each order's items, sizes and status
- Responsive design for desktop and mobile, with motion that respects "reduce motion"

### Admin Tools

- Manage users, products, coupons, and orders
- Update order status from the dashboard
- Export data to Excel and PDF
- One-click read-only demo admin, with customer details masked

## Screenshots

### Home Page

![Home Page](client/src/assets/img/readme/home.png)

### Shop Page

![Shop Page](client/src/assets/img/readme/shop.png)

### Product Page

![Product Page](client/src/assets/img/readme/checkout.png)

### Cart and Checkout

![Cart and Checkout](client/src/assets/img/readme/cart.png)

### Order History

![Order History](client/src/assets/img/readme/history.png)

### Admin Dashboard - Products

![Admin Dashboard - Products](client/src/assets/img/readme/dashboard-products.png)

### Admin Dashboard - Orders

![Admin Dashboard - Orders](client/src/assets/img/readme/dashboard-orders.png)

### Admin Dashboard - Users

![Admin Dashboard - Users](client/src/assets/img/readme/dashboard-users.png)

### Admin Dashboard - Coupons

![Admin Dashboard - Coupons](client/src/assets/img/readme/dashboard-coupons.png)

## Tech Stack:

- **Frontend:** React 19, Redux Toolkit, Tailwind CSS 4, Motion, React Hook Form, React Router, Lucide icons, Geist font
- **Backend:** Node.js, Express 5, MongoDB with Mongoose, Passport.js, Stripe SDK, Nodemailer, Cloudinary, ExcelJS, PDFKit
- **Deployment:** Vercel
