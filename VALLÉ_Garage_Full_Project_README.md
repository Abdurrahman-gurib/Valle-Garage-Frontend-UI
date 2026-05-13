# VALLÉ GARAGE OPERATIONS SYSTEM
## Full Frontend Project Documentation

---

# 1. Project Overview

The **VALLÉ Garage Operations System** is a modern garage, inventory, assessment, and workshop management platform designed for quad bikes, buggy vehicles, utility terrain vehicles (UTVs), and garage operations.

The platform was designed for:

- Garage Mechanics
- Store Keepers
- System Administrators
- Guest Vehicle Drop-offs

The system centralizes:

- Vehicle registration
- Guest ticket creation
- Assessments
- Spare parts issuance
- Garage work tracking
- Vehicle history
- Interactive inspection mapping
- Audit reports
- Notifications
- Inventory tracking
- Analytics dashboards

---

# 2. Technology Stack

## Frontend
- React.js
- Vite
- Tailwind CSS
- React Router
- Axios
- Recharts
- Lucide Icons

## Backend API
- Node.js
- Express.js
- JWT Authentication
- REST API Architecture

## Database
- PostgreSQL

## Optional
- Docker
- Swagger API
- Prisma ORM

---

# 3. System Modules

## 3.1 Authentication Module

Supports:

- Admin Login
- Mechanic Login
- Store Keeper Login
- Guest Access

### Features
- Password eye toggle
- JWT login
- Role-based navigation
- Secure route protection
- Responsive login UI

---

## 3.2 Vehicle Management

### Features

- Add vehicles
- Edit vehicles
- Vehicle auto-population
- Vehicle history
- Vehicle inspection map
- Vehicle search suggestions
- Vehicle image rendering
- VIN / Chassis tracking
- Internal / External classification

### Vehicle Information Stored

- Plate Number
- VIN / Chassis Number
- Manufacturer
- Model
- CC Rating
- Vehicle Type
- Ownership
- Status
- Mileage / Hour Meter
- Assessment History
- Repair History
- Parts Used
- Assigned Mechanics

---

# 4. Interactive Vehicle Inspection Map

The system includes a smart inspection map.

### Features

- Clickable inspection points
- Hover details
- Safety warnings
- Mechanical inspection guidance
- Component risk categorization

### Inspection Areas

- Front Suspension
- Engine Bay
- Brake System
- Tyres
- Steering
- Lighting
- Cabin / Roll Cage
- Rear Cargo Bed
- Electrical Components

### Safety Equipment Checklist

- Helmet
- Gloves
- Safety Boots
- Reflective Vest
- Eye Protection
- Seat Belt
- Emergency Toolkit

---

# 5. Guest Ticket Workflow

## Flow

Guest → Mechanic → Assessment → Store Keeper → Garage Work → Completed

### Guest Features

- Emergency ticket creation
- Vehicle auto-fill
- Manual entry support
- Back button support
- Ticket submission

### Mechanic Features

- View guest pending tickets
- Take ticket
- Add vehicle
- Start assessment
- Start garage work
- Re-open work tickets
- Close work tickets

### Store Keeper Features

- View assessments
- Issue parts
- Deduct inventory automatically
- Re-open tickets
- Return unused parts
- Track stock levels

---

# 6. Assessment System

### Assessment Features

- Create assessments
- Add issue descriptions
- Add recommended repairs
- Add urgency levels
- Add repair status
- Attach notes
- Generate assessment reports

### Workflow

1. Mechanic creates assessment
2. Assessment appears in Store Keeper
3. Parts issued
4. Ticket closed
5. Mechanic starts repair process

---

# 7. Inventory & Spare Parts

### Features

- Parts database
- Quantity management
- Auto deduction
- Barcode support
- Low stock alerts
- Part issuance tracking
- Inventory reports

### Stored Information

- Part Name
- Part Number
- Quantity
- Cost
- Supplier
- Category
- Issue History

---

# 8. Garage Work Management

### Features

- Start repair process
- Add repair notes
- Assign mechanics
- Track work duration
- Re-open tickets
- Close completed work

### Repair History Tracking

Every repair stores:

- Mechanic
- Vehicle
- Parts used
- Work done
- Date/time
- Repair status

---

# 9. Reports & Analytics

### Dashboard Features

- Interactive charts
- Vehicle frequency
- Most repaired vehicles
- Inventory analytics
- Assessment statistics
- Monthly garage workload
- Mechanic productivity

### Export Options

- CSV
- Excel
- PDF

### Filtering

- By Week
- By Month
- By Year
- Custom Date Range

---

# 10. Database Structure

## Core Tables

### users
Stores all system users.

### vehicles
Stores all vehicle details.

### guest_tickets
Stores guest-created tickets.

### assessments
Stores assessment records.

### inventory
Stores spare parts.

### issued_parts
Tracks issued parts.

### garage_work
Tracks garage work lifecycle.

### notifications
Stores system alerts.

### audit_logs
Stores all actions.

---

# 11. API Endpoints

## Authentication

POST /api/auth/login

## Vehicles

GET /api/vehicles

POST /api/vehicles

PUT /api/vehicles/:id

DELETE /api/vehicles/:id

## Assessments

GET /api/assessments

POST /api/assessments

## Inventory

GET /api/inventory

POST /api/inventory

POST /api/inventory/issue

## Guest Tickets

GET /api/guest-tickets

POST /api/guest-tickets

## Garage Work

GET /api/garage-work

POST /api/garage-work/start

POST /api/garage-work/close

---

# 12. PostgreSQL Integration

All frontend activities connect through backend APIs and are stored inside PostgreSQL.

### Stored Activities

- Ticket creation
- Vehicle creation
- Assessment creation
- Inventory issuance
- Garage work updates
- User creation
- Ticket closure
- Notifications

---

# 13. Audit Logging

Every action is tracked.

### Logged Activities

- User login
- Ticket actions
- Vehicle updates
- Assessment edits
- Inventory deduction
- Ticket re-open
- Garage work updates

---

# 14. Notifications System

### Examples

- Guest ticket created
- Low stock alert
- Ticket completed
- Vehicle over-serviced
- Assessment pending
- Garage work overdue

---

# 15. Responsive Design

The frontend is fully responsive.

### Supported Devices

- Desktop
- Laptop
- Tablet
- Mobile

---

# 16. Installation Guide

## Frontend

```bash
npm install
npm run dev
```

Frontend URL:

```bash
http://localhost:5173
```

---

## Backend

```bash
npm install
npm run start:dev
```

Backend URL:

```bash
http://localhost:3000
```

---

## PostgreSQL

Create database:

```sql
CREATE DATABASE valle_garage;
```

---

# 17. Environment Variables

## Frontend

```env
VITE_API_URL=http://localhost:3000/api
```

## Backend

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/valle_garage
JWT_SECRET=your_secret
PORT=3000
```

---

# 18. Future Improvements

- AI predictive maintenance
- Real-time notifications
- QR code scanning
- Mobile application
- Voice-assisted assessments
- 3D vehicle diagnostics
- IoT integration

---

# 19. Security Features

- JWT Authentication
- Role-based access control
- Protected routes
- Secure API handling
- PostgreSQL validation
- Backend validation

---

# 20. Project Workflow Diagram

```text
Guest Ticket
      ↓
Mechanic Takes Ticket
      ↓
Vehicle Added
      ↓
Assessment Created
      ↓
Store Keeper Issues Parts
      ↓
Garage Work Started
      ↓
Repair Updates Added
      ↓
Ticket Closed
      ↓
Stored in Database
      ↓
Reports & Analytics
```

---

# 21. Main Features Summary

## Admin
- User management
- Dashboard analytics
- Reports
- Vehicle management

## Mechanic
- Guest tickets
- Assessments
- Garage work
- Vehicle repairs

## Store Keeper
- Inventory
- Parts issuance
- Ticket control
- Stock management

## Guest
- Emergency garage drop-off
- Ticket creation

---

# 22. Conclusion

The VALLÉ Garage Operations System provides a complete digital workflow for garage management operations.

The system improves:

- Operational efficiency
- Repair tracking
- Spare part management
- Vehicle history visibility
- Audit transparency
- Reporting accuracy

The platform was designed with scalability, usability, and modern UI/UX principles in mind.

---

# END OF DOCUMENTATION
