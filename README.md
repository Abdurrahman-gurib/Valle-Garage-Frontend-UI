
# Vallé Garage Ops
## Garage & Spare Parts Management System

---

# Overview

Vallé Garage Ops is a modern Garage & Spare Parts Management System designed to streamline workshop operations, vehicle assessments, inventory management, and reporting workflows.

The system provides dedicated access levels for:
- Administrators
- Mechanics
- Store Keepers

Built with a responsive modern UI inspired by the Vallé visual identity, the platform focuses on simplicity, speed, and operational efficiency.

---

# Key Features

## Authentication & Role Management
- Secure login system
- Role-based access control
- Dedicated dashboards for each user type
- Protected routes and permissions

## Admin Module
- Manage users and permissions
- Monitor workshop activity
- Generate reports
- Manage inventory and garage operations
- Track assessments and servicing logs

## Mechanic Module
- Vehicle assessments
- Repair tracking
- Service history logging
- Maintenance workflow management
- Workshop queue management

## Store Keeper Module
- Spare parts inventory management
- Barcode lookup
- Low stock alerts
- Parts issuance tracking
- Stock movement monitoring

---

# System UI Design

The system uses a Vallé-inspired modern interface with:
- Purple primary branding
- Neon green accent highlights
- Minimalistic light layouts
- Responsive card-based structure
- Modern typography
- Soft shadows and rounded cards

---

# Login Screen

## Description
The login page provides a modern role-selection interface allowing users to quickly access their workspace.

### Features
- Responsive layout
- Modern Vallé branding
- Role selection cards
- Clean visual hierarchy
- Lightweight animations
- Mobile-friendly design

### Flow
1. User opens the system
2. User selects their role
3. Authentication screen appears
4. User logs in
5. Dashboard loads based on role permissions

---

# Dashboard Overview

## Admin Dashboard
The Admin Dashboard provides:
- System statistics
- Vehicle tracking
- Assessment monitoring
- Workshop activity
- Reports overview
- Inventory visibility

## Mechanic Dashboard
Mechanics can:
- View assigned jobs
- Update repairs
- Create assessments
- Track service history

## Store Keeper Dashboard
Store Keepers can:
- Monitor inventory
- Search spare parts
- Manage stock issuance
- View low-stock alerts

---

# Responsive Design

The application is fully responsive and optimized for:
- Desktop
- Laptop
- Tablet
- Mobile devices

---

# Technology Stack

## Frontend
- React
- Vite
- Tailwind CSS

## Backend
- Node.js / Express

## Database
- PostgreSQL / MySQL

## Authentication
- JWT Authentication
- Role-based Access Control

---

# Project Structure

```bash
src/
├── components/
├── pages/
├── layouts/
├── assets/
├── routes/
├── services/
├── hooks/
├── styles/
└── utils/
```

---

# Installation Guide

## Clone Repository

```bash
git clone <repository-url>
```

## Navigate Into Project

```bash
cd valle-garage-ops
```

## Install Dependencies

```bash
npm install
```

## Start Development Server

```bash
npm run dev
```

## Open Browser

```bash
http://localhost:5173
```

---

# Build for Production

```bash
npm run build
```

---

# Future Improvements

- QR Code Vehicle Tracking
- AI Maintenance Predictions
- Real-time Notifications
- Mobile App Integration
- Analytics Dashboard
- Multi-Branch Support

---

# Security Features

- Protected routes
- Role-based authorization
- Session validation
- Secure authentication

---

# Example Workflow

## Vehicle Service Process

1. Vehicle arrives
2. Mechanic creates assessment
3. Spare parts requested
4. Store keeper issues parts
5. Repair completed
6. Admin reviews reports

---

# Recommended Screenshots

- Login Screen
- Role Selection
- Admin Dashboard
- Mechanic Dashboard
- Inventory Screen
- Reports Module

---

# Conclusion

Vallé Garage Ops modernizes garage and workshop management through a clean, responsive, and efficient platform. The system improves operational tracking, inventory visibility, and maintenance workflows while maintaining a strong Vallé-inspired visual identity.

---

# Author

Developed for Vallé Garage Operations System Prototype.


# Vallé GMS - Garage & Spare Parts Management

Production-ready React/Vite frontend prototype for the internal Vallé Garage & CFMOTO spare parts system.

## Demo logins

| Role | Email | Password |
|---|---|---|
| Admin | admin@valle.com | admin123 |
| Mechanic | mechanic@valle.com | mech123 |
| Store Keeper | store@valle.com | store123 |

## Install and run

```powershell
npm config set registry https://registry.npmjs.org/
npm install
npm run dev
```

Open: `http://localhost:5173`

## Build

```powershell
npm run build
npm run preview
```

## Included features

- Role-based login: Admin, Mechanic, Store Keeper.
- Admin has all pages.
- Mechanic has dashboard, vehicles, assessments, garage work.
- Store Keeper has dashboard, vehicles, assessments, inventory, transactions, reports.
- Vehicle registration form with internal/external dropdown.
- Assessment creation, detail view, update, re-open with reason/accountability.
- Store keeper can complete assessments after parts issuance.
- Garage work creation and details view.
- Vehicle history includes assessments and garage operations, with parts used inside each entry.
- Inventory re-order using Purchase Order form.
- PO save, download, print, and email compose flow.
- Transactions with PO, invoice upload, status update, GRN on completion.
- Customer/vehicle order transaction statuses: Pending, Build in Progress, Built and Testing, Delivered, Paid, Completed.
- Search suggestions across vehicles, assessments, parts, garage work, and transactions.
- Notifications per user.
- Responsive internal-friendly Vallé theme.

## Backend compatibility

This frontend is ready to connect to any REST API. Recommended backend stack:

- NestJS or Express.js
- PostgreSQL
- Prisma ORM
- JWT authentication
- Role-based access control

Replace state actions in `src/context/AppContext.jsx` with API calls when backend is ready.
