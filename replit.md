# Matrix Delivery Platform

## Overview

Matrix Delivery (also known as Matrix Heroes) is a full-stack delivery and ride-hailing platform that connects drivers with customers for package delivery and passenger transport. The platform emphasizes fair pricing, transparent commissions, and driver empowerment through an open bidding system.

The application provides dual-service capabilities (delivery + ride-hailing), real-time tracking via WebSockets, cryptocurrency payment support, and a comprehensive escrow-based balance system for secure transactions.

**Note**: The codebase is undergoing active refactoring to break apart monolithic files (`backend/server.js` at 6,009 lines and `frontend/src/App.js` at 2,921 lines) into modular components following MVC patterns.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React (JavaScript)
- **Routing**: React Router DOM
- **State Management**: Component-level state with context patterns
- **Real-time Updates**: Socket.IO client for live order and driver location tracking
- **Mobile Support**: Capacitor configured for Android builds
- **Hosting**: Firebase static hosting

### Backend Architecture
- **Framework**: Node.js with Express
- **Pattern**: Model-View-Controller (MVC) with services layer
- **Entry Point**: `backend/server.js` (main) and `backend/app.js` (Express configuration)
- **Authentication**: JWT tokens stored in httpOnly cookies
- **Password Hashing**: bcryptjs
- **Real-time**: Socket.IO with Redis adapter for cluster mode scaling
- **Process Management**: PM2 with cluster mode (2 instances)
- **Rate Limiting**: Express rate limiter with Redis store

### Database Layer
- **Primary Database**: PostgreSQL (Neon serverless in production)
- **ORM/Query**: Raw SQL via `pg` driver
- **Migrations**: Custom migration runner (`backend/migrationRunner.ts`) with checksum tracking
- **Spatial Queries**: PostGIS for distance calculations and location-based filtering
- **Caching**: Redis for session sharing, rate limiting, and route caching

### Key Design Decisions

1. **Escrow-based Payments**: Customer funds are held in escrow until delivery confirmation, protecting both parties
2. **7km Distance Filter**: Orders only visible to drivers within 7km of pickup location using PostGIS
3. **Open Bidding System**: Drivers bid on orders, customers choose their preferred driver/price
4. **Multi-role Users**: Users can have multiple roles (customer, driver, admin) via `granted_roles` array
5. **Security-First Approach**: Input sanitization, parameterized queries, CORS restrictions, and comprehensive validation

### Testing Strategy
- **Unit Tests**: Jest for backend services and utilities
- **BDD Tests**: Cucumber.js for behavior-driven testing
- **E2E Tests**: Playwright for browser automation
- **Test Database**: Separate `matrix_delivery_test` database for isolated testing

## External Dependencies

### Database Services
- **PostgreSQL**: Primary data store (Neon serverless for production)
- **Redis**: Session sharing, caching, rate limiting, and Socket.IO adapter

### Payment Integrations
- **Stripe**: Card payment processing
- **PayPal**: Alternative payment method via `@paypal/checkout-server-sdk`
- **Cryptocurrency**: Ethereum/Polygon support via ethers.js with custom smart contracts

### Cloud Services
- **Firebase**: Frontend static hosting and potential future auth integration
- **Email**: Nodemailer for transactional emails

### Third-Party APIs
- **Geolocation**: OpenStreetMap/Nominatim for address geocoding
- **Distance Calculation**: PostGIS ST_Distance for accurate distance filtering

### Development Tools
- **PM2**: Production process management with cluster mode
- **Winston**: Structured logging with daily rotation
- **Hardhat**: Smart contract development and deployment
- **Husky**: Git hooks for pre-commit testing and linting