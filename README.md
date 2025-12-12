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
- **Data Export**: Export Users, Products, Orders, and Coupons to Excel (.xlsx) and PDF (.pdf).

## Tech Stack

### Frontend

- React
- Redux Toolkit
- React Router
- Tailwind CSS
- Vite
- Axios
- React Hook Form

### Backend

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

This project utilizes a full-stack Model-View-Controller (MVC) architecture to create a clear separation between the data, user interface, and control logic.

- **Model & Controller (Backend)**: The Node.js/Express server manages the application's data (Mongoose schemas) and business logic (Express controllers and services). It acts as the Model and Controller.
- **View (Frontend)**: The React application is responsible for presenting the data to the user. It serves as the View, rendering the UI dynamically based on the state it receives from the backend.

This structure is implemented within a monorepo containing separate `client` and `server` directories.

### Backend Structure (`/server`)

The backend follows an MVC-like pattern to ensure a clean and scalable architecture.

```
/server
├── app.js                 # Main server entry point
├── config/                # Configuration files (DB, Passport.js, Cloudinary)
├── controllers/           # Handles request logic, calls services
├── middlewares/           # Express middleware (auth, error handling, rate limiting)
│   ├── custom/            # Custom middleware for auth and cron jobs
│   └── modules/           # Module-specific middleware (cors, parsers, etc.)
├── models/                # Mongoose schemas for DB collections
├── routes/                # API endpoint definitions
│   └── modules/           # Routes broken down by feature
├── services/              # Core business logic (Stripe, export, Google Auth, etc.)
├── utils/                 # Utility functions (OTP sending, etc.)
├── hooks/                 # Stripe webhook handlers
└── cron jobs/             # Scheduled tasks for cleanup
```

### Frontend Structure (`/client`)

The frontend is a React-based Single Page Application (SPA) built with Vite, featuring a clear, component-based structure.

```
/client
├── index.html             # HTML entry point
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── public/                # Static assets served directly
│   └── img/               # Product images and media
└── src/
    ├── main.jsx           # Application entry point
    ├── App.jsx            # Root component with routing setup
    ├── index.css          # Global styles
    ├── App.css            # App-specific styles
    ├── api/               # Centralized Axios instance and API calls
    ├── assets/            # Images, fonts, and other static assets
    │   └── img/           # Images organized by page/feature
    ├── components/        # Reusable UI components
    │   ├── Cart/          # Components for the shopping cart page
    │   ├── Dashboard/     # Components for the admin dashboard
    │   ├── Global/        # App-wide components (Navbar, Footer)
    │   ├── Home/          # Components for the homepage sections
    │   ├── Shop/          # Components for the product grid and filters
    │   ├── GoogleAuthSuccess.jsx  # Google authentication handler
    │   └── ProtectedRoute.jsx     # HOC for route protection
    ├── context/           # React Context providers (e.g., AuthProvider)
    ├── Hooks/             # Custom React hooks (e.g., useAuth)
    ├── pages/             # Top-level page components
    │   ├── Home.jsx
    │   ├── Shop.jsx
    │   ├── ProductDes.jsx
    │   ├── Cart.jsx
    │   ├── Checkout.jsx
    │   ├── Login.jsx
    │   ├── SignUp.jsx
    │   ├── Dashboard.jsx
    │   ├── UserHistory.jsx
    │   ├── AboutUs.jsx
    │   ├── Success.jsx
    │   └── RecruiterByPass.jsx
    ├── redux/             # Redux Toolkit state management
    │   ├── store.js       # Main Redux store configuration
    │   ├── Slice/         # Individual state slices for features
    │   └── Thunk/         # Redux Thunk async actions
    └── utils/             # Utility functions (Stripe payment, session management)
```
