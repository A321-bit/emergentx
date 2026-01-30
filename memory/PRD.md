# Solar Energy Sales Management System - PRD

## Son Güncelleme: 30 Ocak 2026

### Son Eklenen Özellik
- **Teklif Modülü - Sürükle-Bırak:** Ürünlerin sırasını değiştirmek için drag & drop özelliği eklendi (@dnd-kit)

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
9. **Advanced Packages Module** ✅ (Completely rebuilt Jan 2025)
10. **Personnel & Payroll** (Phases 1-2 ✅)
11. **Accounting/Expenses** ✅

## Advanced Packages Module (Jan 2025)
- Dynamic category system with icons/colors
- Package levels: Basic, Plus, Pro
- Technical specs: kWp, kWh, daily/yearly production
- "Suitable For" tags: home, farm, industrial, etc.
- Cost/profit calculation (role-based visibility)
- Stock integration with availability count
- Status management: Active, Inactive, Campaign

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
