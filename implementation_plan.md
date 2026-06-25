# B&S Vehicle Management System — Full Project Plan

## Overview

A full-stack **Vehicle Management System** for **B&S Transport Service** (Renting Reinvented), built with:

- **Frontend**: React (Vite) — `frontend/` folder
- **Backend**: Laravel 11 + MySQL — `backend/` folder
- **Infrastructure**: Docker Compose from root — fully containerized
- **Brand Colors**: Orange `#E8471A` / Dark Charcoal `#1E1E1E` / White `#FFFFFF`

---

## 🎨 Design System (Brand Colors)

| Token | Value | Usage |
|---|---|---|
| `--primary` | `#E8471A` | Buttons, accents, highlights |
| `--primary-light` | `#FF6B3D` | Hover states, gradients |
| `--primary-dark` | `#C73D15` | Active states |
| `--dark` | `#1E1E1E` | Sidebar, headers |
| `--dark-2` | `#2D2D2D` | Cards, panels |
| `--surface` | `#F8F8F8` | Page background |
| `--text-primary` | `#1E1E1E` | Main text |
| `--text-muted` | `#888888` | Labels, secondary text |
| `--white` | `#FFFFFF` | Cards, inputs |

**Typography**: Inter (Google Fonts)  
**Icons**: Lucide React  
**Charts**: Recharts  
**Maps**: Leaflet.js (OpenStreetMap for GPS)  
**Tables**: TanStack Table  

---

## 📁 Project Structure

```
B&S Vehicle Management/           ← Root
├── docker-compose.yml            ← Orchestrates all services
├── .env                          ← Root environment file
├── frontend/                     ← React + Vite
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css             ← Global design tokens
│       ├── assets/               ← Logo, images
│       ├── components/           ← Shared UI components
│       │   ├── layout/           ← Sidebar, Navbar, Layout
│       │   ├── ui/               ← Button, Card, Modal, Badge, Table
│       │   └── charts/           ← Chart wrappers
│       ├── pages/                ← One folder per feature module
│       │   ├── Dashboard/
│       │   ├── Vehicles/
│       │   ├── Drivers/
│       │   ├── Assignments/
│       │   ├── Fuel/
│       │   ├── Maintenance/
│       │   ├── Breakdowns/
│       │   ├── GPS/
│       │   ├── Trips/
│       │   ├── Routes/
│       │   ├── Inspections/
│       │   ├── Insurance/
│       │   ├── RevenueLicense/
│       │   ├── EmissionTests/
│       │   ├── Accidents/
│       │   ├── Tires/
│       │   ├── SpareParts/
│       │   ├── Expenses/
│       │   ├── Vendors/
│       │   ├── Departments/
│       │   ├── Notifications/
│       │   ├── Reports/
│       │   ├── Users/
│       │   ├── Requests/
│       │   ├── Documents/
│       │   └── AuditLogs/
│       ├── store/                ← Redux Toolkit (Zustand alt)
│       ├── hooks/                ← Custom React hooks
│       ├── services/             ← Axios API service layer
│       └── utils/                ← Formatters, helpers
├── backend/                      ← Laravel 11
│   ├── Dockerfile
│   ├── composer.json
│   ├── .env.example
│   └── app/
│       ├── Http/
│       │   ├── Controllers/Api/  ← One controller per module
│       │   ├── Middleware/
│       │   └── Requests/         ← Form Request validation
│       ├── Models/               ← Eloquent models
│       ├── Services/             ← Business logic layer
│       ├── Policies/             ← Role-based access control
│       ├── Events/ & Listeners/  ← Notification events
│       └── Notifications/        ← Email/SMS notifications
│   └── database/
│       ├── migrations/
│       └── seeders/
└── nginx/                        ← Nginx reverse proxy config
    └── nginx.conf
```

---

## 🐳 Docker Architecture

```
docker-compose.yml
├── frontend      (React/Vite — port 3000, served by Nginx)
├── backend       (Laravel/PHP-FPM — port 9000)
├── nginx         (Reverse proxy — port 80)
│   ├── /api/*  → backend:9000
│   └── /*      → frontend:3000
├── mysql         (MySQL 8.0 — port 3306)
└── redis         (Cache + queues — port 6379)
```

### `docker-compose.yml` Services

| Service | Image | Role |
|---|---|---|
| `frontend` | Node 20 Alpine + Nginx | React SPA |
| `backend` | PHP 8.3-FPM Alpine | Laravel API |
| `nginx` | Nginx Alpine | Reverse proxy |
| `mysql` | MySQL 8.0 | Primary database |
| `redis` | Redis 7 Alpine | Cache & queue |
| `mailpit` | axllent/mailpit | Local email testing |

---

## 🗄️ Database Schema (MySQL)

### Core Tables

#### `users`
`id, name, email, password, role (super_admin|fleet_manager|driver|mechanic|department_manager), status, photo, phone, remember_token, timestamps`

#### `vehicles`
`id, vehicle_number, registration_number, vehicle_type, vehicle_category, brand, model, manufacturing_year, chassis_number, engine_number, fuel_type, seating_capacity, color, purchase_date, purchase_cost, current_status (available|in_use|under_maintenance|out_of_service|sold), timestamps, soft_deletes`

#### `vehicle_documents`
`id, vehicle_id, document_type, file_path, expiry_date, timestamps`

#### `drivers`
`id, user_id (nullable), name, nic_number, address, contact_number, license_number, license_expiry_date, photo, emergency_contact_name, emergency_contact_phone, status (active|on_leave|suspended|retired), timestamps`

#### `vehicle_assignments`
`id, vehicle_id, driver_id, assigned_by (user_id), assignment_date, return_date, department_id, purpose, status (active|completed|cancelled), timestamps`

#### `fuel_entries`
`id, vehicle_id, driver_id, fuel_type, fuel_station, quantity_liters, cost_per_liter, total_cost, odometer_reading, date, notes, timestamps`

#### `maintenance_records`
`id, vehicle_id, service_date, next_service_date, odometer_reading, service_type, maintenance_type, mechanic_name, workshop, cost, parts_replaced (JSON), notes, status, timestamps`

#### `breakdowns`
`id, vehicle_id, driver_id, breakdown_date, location, description, repair_status, repair_cost, timestamps`

#### `gps_logs`
`id, vehicle_id, latitude, longitude, speed, ignition_status, timestamp`

#### `trips`
`id, trip_code, vehicle_id, driver_id, start_location, destination, start_time, end_time, distance_km, status (ongoing|completed|cancelled), timestamps`

#### `routes`
`id, route_name, starting_point, destination, distance_km, estimated_time_minutes, timestamps`

#### `inspections`
`id, vehicle_id, driver_id, inspection_type (pre_trip|post_trip), tires_ok, brakes_ok, lights_ok, mirrors_ok, fuel_level_ok, engine_ok, notes, timestamp`

#### `insurance_policies`
`id, vehicle_id, insurance_company, policy_number, coverage_type, start_date, expiry_date, document_path, timestamps`

#### `revenue_licenses`
`id, vehicle_id, license_number, issue_date, expiry_date, document_path, timestamps`

#### `emission_tests`
`id, vehicle_id, test_date, result, expiry_date, document_path, timestamps`

#### `accidents`
`id, vehicle_id, driver_id, accident_date, location, description, police_report_path, insurance_claim_number, repair_cost, photos (JSON), timestamps`

#### `tires`
`id, vehicle_id, tire_brand, position, installation_date, replacement_date, mileage, timestamps`

#### `spare_parts`
`id, part_name, part_number, quantity, min_stock_alert, supplier_id, purchase_cost, timestamps`

#### `expenses`
`id, vehicle_id, expense_type (fuel|service|insurance|license|repair|parking|toll|other), amount, date, description, reference_id, timestamps`

#### `vendors`
`id, vendor_type (fuel_station|workshop|insurance|spare_parts), name, contact_person, phone, email, address, timestamps`

#### `departments`
`id, name, manager_id (user_id), timestamps`

#### `vehicle_requests`
`id, requester_id (user_id), vehicle_id (nullable), request_date, purpose, approval_status (pending|approved|rejected), approved_by, timestamps`

#### `notifications`
`id, user_id, title, message, type, read_at, data (JSON), timestamps`

#### `audit_logs`
`id, user_id, action, model_type, model_id, old_values (JSON), new_values (JSON), ip_address, timestamps`

---

## 🔌 Laravel API Endpoints

### Authentication
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
PUT    /api/auth/profile
```

### Vehicles
```
GET    /api/vehicles              (list + filter + search)
POST   /api/vehicles              (create)
GET    /api/vehicles/{id}         (detail)
PUT    /api/vehicles/{id}         (update)
DELETE /api/vehicles/{id}         (soft delete)
GET    /api/vehicles/{id}/history (full history)
POST   /api/vehicles/{id}/documents (upload documents)
GET    /api/vehicles/statuses     (status counts for dashboard)
```

### Drivers
```
GET    /api/drivers
POST   /api/drivers
GET    /api/drivers/{id}
PUT    /api/drivers/{id}
DELETE /api/drivers/{id}
GET    /api/drivers/{id}/assignments
```

### (All 26 modules follow same RESTful pattern)

### Dashboard
```
GET    /api/dashboard/stats       (KPI cards)
GET    /api/dashboard/alerts      (expiry alerts)
GET    /api/dashboard/fuel-summary
GET    /api/dashboard/expense-summary
```

### Reports
```
GET    /api/reports/vehicles
GET    /api/reports/fuel
GET    /api/reports/drivers
GET    /api/reports/expenses
GET    /api/reports/gps
POST   /api/reports/export        (PDF/Excel)
```

---

## ⚛️ React Frontend Modules

### Shared Components
| Component | Description |
|---|---|
| `Sidebar` | Collapsible, grouped nav, orange active state |
| `Navbar` | Top bar with notifications bell, user avatar |
| `StatCard` | KPI dashboard cards with trend indicators |
| `DataTable` | Sortable, filterable, paginated tables |
| `Modal` | Animated modal dialogs |
| `Badge` | Status badges (color-coded) |
| `FileUpload` | Drag & drop file uploader |
| `DatePicker` | Custom styled date picker |
| `MapView` | Leaflet map for GPS/routes |
| `AlertBanner` | Expiry alerts with urgency levels |

### Page Breakdown (26 modules)

| # | Module | Key UI Elements |
|---|---|---|
| 1 | **Dashboard** | KPI cards, charts, alerts timeline, mini map |
| 2 | **Vehicle Management** | Vehicle list, registration form, status badges, document uploader |
| 3 | **Driver Management** | Driver cards, photo upload, license tracking, assignment view |
| 4 | **Assignments** | Assign form (vehicle↔driver), Gantt-style timeline |
| 5 | **Fuel Management** | Fuel log form, bar/line charts, efficiency metrics |
| 6 | **Maintenance** | Service schedule calendar, maintenance record form |
| 7 | **Breakdowns** | Incident log, repair status tracker |
| 8 | **GPS Tracking** | Leaflet live map, vehicle popups, speed/ignition status |
| 9 | **Trip Management** | Trip list, ongoing trip tracker, route map |
| 10 | **Route Management** | Route CRUD, map preview |
| 11 | **Inspections** | Checklist form (pre/post trip), inspection history |
| 12 | **Insurance** | Policy list, expiry calendar, alert badges |
| 13 | **Revenue License** | License tracking, renewal reminders |
| 14 | **Emission Tests** | Test schedule, results log |
| 15 | **Accidents** | Incident report, photo upload, police report |
| 16 | **Tire Management** | Tire position diagram, replacement schedule |
| 17 | **Spare Parts** | Inventory table, low-stock alerts |
| 18 | **Expenses** | Categorized expense log, monthly charts |
| 19 | **Vendors** | Vendor directory by type |
| 20 | **Departments** | Department list, vehicle-department assignments |
| 21 | **Notifications** | Notification center, email/SMS preferences |
| 22 | **Reports** | Filterable reports, charts, PDF/Excel export |
| 23 | **User Management** | Role-based user list, permission matrix |
| 24 | **Vehicle Requests** | Request form, manager approval workflow |
| 25 | **Documents** | Centralized document library with preview |
| 26 | **Audit Logs** | Activity timeline with user/action filters |

---

## 🔒 Role-Based Access Control (RBAC)

| Feature | Super Admin | Fleet Manager | Driver | Mechanic | Dept. Manager |
|---|---|---|---|---|---|
| Dashboard | ✅ Full | ✅ Full | ✅ Limited | ✅ Limited | ✅ Limited |
| Vehicle CRUD | ✅ | ✅ | ❌ | ❌ | ❌ |
| Driver CRUD | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assignments | ✅ | ✅ | View only | ❌ | Request only |
| Fuel Entry | ✅ | ✅ | ✅ Own | ❌ | ❌ |
| Maintenance | ✅ | ✅ | ❌ | ✅ | ❌ |
| GPS | ✅ | ✅ | Own vehicle | ❌ | ❌ |
| Reports | ✅ | ✅ | ❌ | ❌ | Limited |
| User Mgmt | ✅ | ❌ | ❌ | ❌ | ❌ |
| Audit Logs | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 📦 Technology Stack Summary

### Frontend (React)
| Package | Purpose |
|---|---|
| `vite` | Build tool |
| `react-router-dom` v6 | SPA routing |
| `axios` | HTTP client |
| `@tanstack/react-table` | Data tables |
| `recharts` | Charts & graphs |
| `leaflet` + `react-leaflet` | GPS maps |
| `react-hook-form` + `zod` | Forms & validation |
| `zustand` | State management |
| `react-hot-toast` | Notifications |
| `lucide-react` | Icons |
| `date-fns` | Date formatting |
| `@react-pdf/renderer` | PDF generation |

### Backend (Laravel 11)
| Package | Purpose |
|---|---|
| `laravel/sanctum` | API authentication |
| `spatie/laravel-permission` | RBAC |
| `spatie/laravel-activity-log` | Audit logs |
| `spatie/laravel-media-library` | File uploads |
| `maatwebsite/excel` | Excel export |
| `barryvdh/laravel-dompdf` | PDF export |
| `laravel/horizon` | Queue monitoring |
| `predis/predis` | Redis client |

---

## 🚀 Development Phases

### Phase 1 — Foundation (Week 1–2)
- [ ] Docker Compose setup (MySQL, Redis, Nginx, PHP, Node)
- [ ] Laravel project init + Sanctum auth
- [ ] React project init + routing + design system
- [ ] Database migrations for all 26 modules
- [ ] Seeders (roles, users, sample vehicles)
- [ ] Authentication flow (login/logout/JWT)

### Phase 2 — Core Modules (Week 3–5)
- [ ] Dashboard (KPI stats, alerts)
- [ ] Vehicle Management (CRUD + documents + status)
- [ ] Driver Management (CRUD + photo + assignments)
- [ ] Vehicle Assignments
- [ ] Fuel Management + basic reports

### Phase 3 — Operations (Week 6–8)
- [ ] Maintenance Management
- [ ] Breakdown Management
- [ ] Trip Management
- [ ] Route Management
- [ ] Vehicle Inspections
- [ ] Expense Management

### Phase 4 — Compliance & Documents (Week 9–10)
- [ ] Insurance Management
- [ ] Revenue License
- [ ] Emission Tests
- [ ] Accident Management
- [ ] Document Management (centralized)

### Phase 5 — Advanced Features (Week 11–12)
- [ ] GPS Tracking (Leaflet + simulated/real feed)
- [ ] Tire Management
- [ ] Spare Parts Inventory
- [ ] Vendor Management
- [ ] Department/Employee Management
- [ ] Vehicle Request + Approval Workflow

### Phase 6 — Intelligence & Polish (Week 13–14)
- [ ] Notification System (dashboard + email + SMS)
- [ ] Reports & Analytics (charts + PDF + Excel export)
- [ ] User Management + RBAC UI
- [ ] Audit Logs
- [ ] Performance optimization
- [ ] Final Docker production build

---

## 🔔 Notification System

**Triggers** (auto-checked via Laravel scheduled commands):
- Insurance expiry: 30, 15, 7 days before
- Revenue license expiry: 30, 15, 7 days before
- Emission test due: 30, 15 days before
- Driver license expiry: 60, 30 days before
- Service due: based on odometer/date
- Low spare parts stock: when quantity < min_stock_alert
- Over-speed alerts: GPS speed threshold

**Channels**:
- Dashboard notification center (real-time with Laravel Echo + Pusher/Soketi)
- Email (Laravel Mailables + SMTP)
- SMS (Twilio or a local Sri Lanka SMS gateway)

---

## 🌐 GPS Integration Options

| Option | Cost | Notes |
|---|---|---|
| **OpenStreetMap + Leaflet** | Free | Map display, route drawing |
| **Google Maps API** | Paid | Better Sri Lanka coverage |
| **Device GPS Feed** | Depends on hardware | Real tracking hardware sends coordinates to `/api/gps/update` |
| **Simulated Mode** | Free | Demo with recorded routes for development |

> For development we will implement simulated GPS. Production integration requires GPS hardware per vehicle sending coordinates via HTTP/MQTT.

---

## 📋 Open Questions

> [!IMPORTANT]
> **Please review these before we start building:**

1. **GPS Hardware**: Do you have existing GPS devices in vehicles, or is this planned for later? (affects real-time tracking architecture)

2. **SMS Provider**: Which SMS gateway do you use in Sri Lanka? (e.g., Dialog, Mobitel API, or a third-party like Twilio)

3. **Deployment Target**: Will this be hosted on a local server, a cloud VPS (DigitalOcean/AWS), or just run locally for now?

4. **Priority Modules**: Should we build all 26 modules, or would you like to start with a specific subset first (e.g., core vehicle/driver management + dashboard)?

5. **Language**: Should the UI support Sinhala/Tamil in addition to English?

6. **Existing Data**: Do you have existing vehicle/driver data to import (Excel/CSV)?

---

## ✅ Ready to Start?

Once you approve this plan, I will begin execution in this order:

1. **Root `docker-compose.yml`** + environment configs
2. **Laravel backend** — migrations, models, API routes, auth
3. **React frontend** — design system, layout, auth pages
4. **Module by module** following the phase plan above

> [!NOTE]
> Estimated total: ~14 weeks for a complete production-ready system. I can start building immediately — we can do module by module or complete phases.
