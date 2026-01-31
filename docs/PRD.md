# AGRO CRM - Product Requirements Document (PRD)

## Overview

**Product Name:** Agro CRM  
**Version:** 1.0  
**Type:** B2B Sales & Distribution Management System  
**Target Industry:** Agricultural Products Distribution  
**Tech Stack:** React 19 + TypeScript + Tailwind CSS + Supabase  

---

## Executive Summary

Agro CRM is a comprehensive Customer Relationship Management system designed specifically for agricultural product distribution businesses. It manages the entire sales cycle from inventory management to dealer relationships, invoicing, payments, and financial reporting.

---

## Core Features

### 1. Authentication & Authorization

**Roles:**
- `admin` - Full system access, can manage users, products, and all data
- `territory_sales_manager` - Manages dealers and sales within assigned territory
- `dealer` - Can view their own orders, invoices, and credits
- `finance` - Access to financial reports and transactions
- `employee` - Basic read access, default role for new signups

**Features:**
- Email/password authentication
- Role-based access control (RBAC)
- Territory-based data segregation
- Admin user management (create, delete, update role, reset password)

### 2. Inventory Management

**Products:**
- SKU-based product identification
- Product categories for organization
- Cost price and selling price tracking
- Stock quantity management
- Unit types (pcs, kg, box, etc.)
- Pack size variants (500ml, 1000ml, etc.)

**Stock Operations:**
- Stock increases via purchase orders
- Stock decreases via sales orders
- Low stock alerts
- Bulk cost price updates

### 3. Dealer Management

**Dealer Information:**
- Dealer name and contact person
- Contact details (phone, email, address)
- GST number for tax compliance
- Territory assignment
- Optional user account linking

**Dealer Operations:**
- Add, edit, delete dealers
- View dealer credits
- Record dealer payments
- Territory-based filtering

### 4. Supplier Management

**Supplier Information:**
- Company name and contact person
- Contact details
- GST number
- Address

**Supplier Operations:**
- Manage supplier credits
- Record supplier payments
- Track purchase history

### 5. Territory Management

**Features:**
- Territory name and unique code
- Assign territory managers
- Territory-based data filtering
- Territory-wise reporting

### 6. Purchase Management

**Purchase Orders:**
- Auto-generated purchase numbers (PO-000001)
- Supplier selection
- Multi-product line items
- Status tracking (pending, confirmed, received, cancelled)
- Notes and documentation

**Purchase Items:**
- Product selection
- Quantity and unit price
- Automatic total calculation
- Stock updates on receipt

### 7. Sales Order Management

**Sales Orders:**
- Auto-generated order numbers (SO-000001)
- Dealer selection
- Multi-product line items
- Status tracking (pending, confirmed, shipped, delivered, cancelled)
- Convert to invoice

**Sales Items:**
- Product selection with current prices
- Quantity and custom pricing
- Stock validation and deduction

### 8. Invoice Management

**Invoices:**
- Auto-generated invoice numbers (INV-000001)
- Link to sales order (optional)
- Dealer selection
- Due date management (default 30 days)
- Tax calculation (configurable rate)
- Status tracking (unpaid, partial, paid, overdue, cancelled)

**Invoice Items:**
- Product details
- Quantity and pricing
- Item descriptions

**Payments:**
- Multiple payment methods (cash, bank transfer, cheque, UPI, other)
- Payment reference numbers
- Partial payment support
- Payment history

### 9. Policy/Booking Management

**Policies (Advance Bookings):**
- Auto-generated policy numbers (POL-000001)
- Dealer and product selection
- Quantity and rate per unit
- Total amount calculation
- Advance payment tracking
- Remaining amount (auto-calculated)
- Status (pending, partial, paid)
- Expected delivery date

**Policy Payments:**
- Record advance payments
- Multiple payment methods
- Payment notes

### 10. Credit Management

**Dealer Credits:**
- Record credits given to dealers
- Product-linked credits
- Credit date and amount
- Description and notes
- Create invoices from credits

**Supplier Credits:**
- Record credits from suppliers
- Similar structure to dealer credits

### 11. Expense Tracking

**Features:**
- Expense categories
- Amount and date
- Territory assignment
- Description and notes
- Receipt URL storage
- User-based ownership

### 12. Cash Transactions

**Features:**
- Transaction types (income/expense)
- Amount and date
- Reference linking
- Description
- Cash flow tracking

### 13. Reporting & Analytics

**Dashboard:**
- Cash in hand widget
- Sales performance charts
- Sales vs expenses comparison
- Cash flow visualization
- Dealer credits summary
- Pending policies overview
- Supplier payments due
- Credit recovery summary

**Reports:**
- Credit recovery report
- Invoice aging report
- Territory-wise sales
- Product profitability

### 14. Data Management

**Backup & Restore:**
- Full database backup (SQL format)
- Incremental backups
- Scheduled backups with email notifications
- SQL import/restore functionality
- Backup history logging

**Export Features:**
- SQL INSERT statements export
- Support for upsert (ON CONFLICT)
- Table-by-table export
- Data migration support

### 15. Audit Logging

**Features:**
- Track all user actions
- Entity type and ID logging
- IP address capture
- Action details (JSON)
- Admin-only access

---

## Database Schema

### Tables (25 total)

1. **profiles** - User profile information
2. **user_roles** - Role assignments with territory
3. **territories** - Geographic regions
4. **product_categories** - Product classification
5. **products** - Inventory items
6. **suppliers** - Vendor information
7. **dealers** - Customer/distributor information
8. **purchases** - Purchase orders
9. **purchase_items** - Purchase order line items
10. **sales_orders** - Sales orders
11. **sales_order_items** - Sales order line items
12. **invoices** - Customer invoices
13. **invoice_items** - Invoice line items
14. **invoice_payments** - Invoice payment records
15. **policies** - Advance booking/orders
16. **policy_items** - Policy line items
17. **policy_payments** - Policy payment records
18. **dealer_credits** - Credits to dealers
19. **dealer_payments** - Payments from dealers
20. **supplier_credits** - Credits from suppliers
21. **supplier_payments** - Payments to suppliers
22. **expenses** - Business expenses
23. **cash_transactions** - Cash flow records
24. **audit_logs** - System audit trail
25. **backup_history** - Backup operation logs

### Key Relationships

```
auth.users (Supabase)
    ↓
profiles (1:1)
    ↓
user_roles (1:many) → territories

territories → dealers (1:many)
dealers → sales_orders, invoices, policies, dealer_credits, dealer_payments

suppliers → purchases, supplier_credits, supplier_payments

products → product_categories
products → purchase_items, sales_order_items, invoice_items, policy_items

sales_orders → invoices (optional link)
```

---

## Security Model

### Row Level Security (RLS)

**Admin Access:**
- Full CRUD on all tables

**Territory Sales Manager:**
- View/manage dealers in assigned territory
- Create/manage sales orders, invoices, policies for their territory dealers
- Create purchases and expenses
- View products, suppliers, territories (read-only)

**Dealer:**
- View own dealer record
- View own sales orders, invoices, credits, payments

**Employee (Default):**
- Read access to products, suppliers, territories
- Limited create access

### Security Functions

- `has_role(user_id, role)` - Check user role
- `get_user_territory(user_id)` - Get user's assigned territory
- SECURITY DEFINER functions to prevent RLS recursion

---

## Edge Functions Required

1. **create-user** - Admin creates new users with roles
2. **delete-user** - Admin deletes users
3. **update-user-role** - Admin changes user roles
4. **reset-user-password** - Admin resets passwords
5. **change-user-email** - Admin changes user emails

---

## UI Components

### Layout
- Responsive sidebar navigation
- Role-based menu visibility
- Mobile hamburger menu

### Pages
1. Dashboard (analytics widgets)
2. Inventory (products, categories)
3. Dealers (management)
4. Dealer Credits
5. Suppliers (via Settings)
6. Supplier Credits
7. Purchases
8. Sales
9. Invoices
10. Policies
11. Expenses
12. Cash Transactions
13. Reports
14. Users (admin only)
15. Settings (backup, import/export)
16. Auth (login/signup)

### Common Patterns
- Data tables with search/filter
- Dialog-based forms (add, edit, view, delete)
- Toast notifications
- Loading states
- Error handling

---

## Technical Requirements

### Frontend
- React 19 with TypeScript
- Tailwind CSS for styling
- shadcn/ui component library
- TanStack Query for data fetching
- React Router for navigation
- Recharts for data visualization
- Zod for form validation

### Backend (Supabase)
- PostgreSQL database
- Row Level Security (RLS)
- Database functions and triggers
- Edge Functions (Deno)
- Auth with email/password

### Key Integrations
- Resend for email notifications (scheduled backups)

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Set up Supabase project
- [ ] Run database setup SQL (tables, functions, triggers, RLS)
- [ ] Deploy Edge Functions
- [ ] Create first admin user
- [ ] Connect frontend to Supabase

### Phase 2: Core Features
- [ ] Authentication flow
- [ ] Dashboard widgets
- [ ] Inventory management
- [ ] Dealer management
- [ ] Supplier management

### Phase 3: Transactions
- [ ] Purchase orders
- [ ] Sales orders
- [ ] Invoices with payments
- [ ] Policies/bookings

### Phase 4: Financial
- [ ] Credits management
- [ ] Expense tracking
- [ ] Cash transactions
- [ ] Reports

### Phase 5: Administration
- [ ] User management
- [ ] Audit logs
- [ ] Backup/restore
- [ ] Settings

---

## Prompt for Single-Generation Build

If you want to rebuild this entire project in Lovable with one prompt, use:

```
Build an Agro CRM system for agricultural product distribution with these features:

TECH: React + TypeScript + Tailwind + Supabase

AUTH & ROLES:
- Email/password authentication
- 5 roles: admin, territory_sales_manager, dealer, finance, employee
- Role-based access control with territory segregation
- Admin can create/delete/update users via Edge Functions

MODULES:
1. Dashboard - Sales charts, cash summary, pending items widgets
2. Inventory - Products with SKU, categories, cost/selling prices, stock
3. Dealers - Territory-linked customers with credits and payments
4. Suppliers - Vendors with credits and payments
5. Territories - Geographic regions with codes
6. Purchases - PO from suppliers with line items, stock updates
7. Sales Orders - SO to dealers with line items, status tracking
8. Invoices - Auto-numbered, tax support, partial payments, aging
9. Policies - Advance bookings with payments and delivery dates
10. Expenses - Categorized business expenses
11. Cash Transactions - Cash flow tracking
12. Reports - Credit recovery, invoice aging

DATA MANAGEMENT:
- SQL export with INSERT statements
- Backup/restore functionality
- Audit logging

SECURITY:
- RLS on all tables
- Admin-only user management via Edge Functions
- has_role() security definer function

UI: Professional dashboard layout with sidebar, data tables, dialog forms, charts.
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-31 | Initial release |

---

## Support Files

- `docs/PERSONAL_SUPABASE_SETUP.sql` - Complete database setup script
- `docs/EDGE_FUNCTIONS_CODE.md` - Edge function deployment code
