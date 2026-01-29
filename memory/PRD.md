# Solar Energy Sales Management System - PRD

## Problem Statement
Comprehensive solar energy sales management system with admin/sales panels, product/stock management, customer tracking, quotes, and financial modules.

## Core Modules (Implemented)
1. **User & Role Management** ✅
2. **Product & Category Management** ✅
3. **Stock Management** ✅
4. **Customer Management** ✅
5. **Dealer Management** ✅
6. **Quote Management** ✅ (Enhanced with USD/TL)
7. **Sales Tracking** ✅
8. **Reports Module** ✅
9. **Packages Module** ✅
10. **Personnel & Payroll** (Phases 1-2 ✅)
11. **Accounting/Expenses** ✅

## Recent Changes (Jan 2025)

### Expense Bug Fix
- Fixed `current_user["user_id"]` → `current_user["id"]` in create_expense

### Quote Module Enhancement
- Added dual currency support (USD/TL)
- Auto exchange rate conversion from settings
- Both currencies stored and displayed
- Edit permissions expanded (all except "satisa_dondu")
- Status change dropdown added

## Known Issues
- **P0**: PDF generation - images don't load (backend static file routing)

## Backlog
- **P1**: Personnel Phase 3 (Advance/Bonus management)
- **P1**: Personnel Phase 4-5 (Expenses, PDF payroll)
- **P2**: XML B2B product import
- **P3**: WhatsApp quote sending
- **P3**: PayTR payment integration

## Tech Stack
- Backend: FastAPI, MongoDB
- Frontend: React, Tailwind, shadcn/ui
- Auth: JWT

## Credentials
- Email: admin@solar.com
- Password: admin123
