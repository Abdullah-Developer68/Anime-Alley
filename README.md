# Anime Alley

A full-stack MERN e-commerce app for anime fans. Features a storefront for customers and a powerful admin dashboard for business management.

## Features

### For Customers

- **Secure Auth**: Sign up with Email/Password (OTP verified) or Google.
- **Dynamic Shopping**: Browse products, filter by category, and search with ease.
- **Advanced Cart**: A persistent cart that reserves your items during your session.
- **Coupon System**: Apply valid coupon codes at checkout for discounts.
- **Dual Payments**: Choose between Cash on Delivery (COD) or secure online payment with Stripe.
- **Order History**: View your complete purchase history and track order status.
- **Responsive UI**: A clean, modern design that works perfectly on desktop and mobile.

### For Admins

A secure, role-based dashboard to manage the entire platform.

- **User Management**: View, search, and manage all registered users.
- **Product Management**: Full CRUD (Create, Read, Update, Delete) for all products.
- **Coupon Management**: Create new coupons, view stats, and track performance.
- **Order Management**: View all orders and update their status (e.g., Processing, Shipped).
- **Data Export**: Export Users, Products, Orders, and Coupons to **Excel (.xlsx)** & **PDF (.pdf)**.

## Tech Stack

- **Frontend**

  - React
  - Redux Toolkit
  - React Router
  - Tailwind CSS
  - Vite
  - Axios
  - React Hook Form

- **Backend**
  - Node.js
  - Express.js
  - MongoDB
  - Mongoose
  - Passport.js (Google OAuth)
  - JSON Web Tokens (JWT)
  - Bcrypt
  - Stripe API
  - Multer
  - Node-Cron

## Architecture

This project utilizes a full-stack **Model-View-Controller (MVC)** architecture to create a clear separation between the data, user interface, and control logic.

- **Model & Controller (Backend)**: The Node.js/Express server manages the application's data (Mongoose schemas) and business logic (Express controllers and services). It acts as the **Model** and **Controller**.
- **View (Frontend)**: The React application is responsible for presenting the data to the user. It serves as the **View**, rendering the UI dynamically based on the state it receives from the backend.

This structure is implemented within a monorepo containing separate `client` and `server` directories.

### Backend Structure (`/server`)

The backend follows an MVC-like pattern to ensure a clean and scalable architecture.

```
/server
├── config/           # Configuration files (DB, Passport.js)
├── controllers/      # Handles request logic, calls services
├── middlewares/      # Express middleware (auth, error handling)
├── models/           # Mongoose schemas for DB collections
├── routes/           # API endpoint definitions
│   └── modules/      # Routes broken down by feature
├── services/         # Core business logic (Stripe, export, etc.)
├── utils/            # Utility functions (email, OTP generation)
└── server.js         # Main server entry point
```

### Frontend Structure (`/client`)

The frontend is a React-based Single Page Application (SPA) built with Vite, featuring a clear, component-based structure.

```
/client
├── public/           # Static assets served directly
└── src/
    ├── api/          # Centralized Axios instance and API calls
    ├── assets/       # Images, fonts, and other static assets
    ├── components/   # Reusable UI components
    │   ├── Cart/     # Components for the shopping cart page
    │   ├── Dashboard/# Components for the admin dashboard
    │   ├── Global/   # App-wide components (Navbar, Footer)
    │   ├── Home/     # Components for the homepage sections
    │   ├── Shop/     # Components for the product grid and filters
    │   └── ProtectedRoute.jsx # HOC for route protection
    ├── config/       # Application configuration (e.g., API URLs)
    ├── context/      # React Context providers (e.g., AuthProvider)
    ├── Hooks/        # Custom React hooks (e.g., useAuth)
    ├── pages/        # Top-level page components (Home, Login, etc.)
    ├── redux/        # Redux Toolkit state management
    │   ├── Slice/    # Individual state slices for features
    │   └── store.js  # Main Redux store configuration
    ├── utils/        # Utility functions (e.g., cartId generator)
    ├── App.jsx       # Root component with routing setup
    └── main.jsx      # Application entry point
```
