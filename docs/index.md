# Tinedy CRM - Documentation Index

> Generated: 2026-01-22 | BMad Method Document-Project Workflow

## Project Overview

| Property | Value |
|----------|-------|
| **Type** | Brownfield Web Application (Monolith) |
| **Primary Language** | TypeScript |
| **Framework** | React 18 + Vite 7 |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) |
| **Architecture** | Layered Component Architecture |

## Quick Reference

| Metric | Count |
|--------|-------|
| Components | 176 files |
| Custom Hooks | 70 files |
| Pages | 25 files |
| Test Files | 43 files |
| DB Migrations | 109 files |
| Edge Functions | 9 functions |
| Existing Docs | 61 files |

## Generated Documentation

### Core Documents

| Document | Description |
|----------|-------------|
| [Project Overview](./project-overview.md) | High-level project summary |
| [Architecture](./architecture.md) | System architecture & design decisions |
| [Source Tree Analysis](./source-tree-analysis.md) | Annotated directory structure |
| [Development Guide](./development-guide.md) | Setup & development instructions |

### Technical Analysis

| Document | Description |
|----------|-------------|
| [project-scan-report.json](./project-scan-report.json) | Full scan data & findings |

## Existing Documentation (Legacy)

### Core Guides

| Document | Description |
|----------|-------------|
| [CLAUDE.md](../CLAUDE.md) | ⭐ Comprehensive developer guide (740+ lines) |
| [README.md](../README.md) | Project introduction |
| [HANDOVER.md](../HANDOVER.md) | Knowledge transfer document |

### Setup & Deployment

| Document | Description |
|----------|-------------|
| [SETUP_GUIDE.md](../SETUP_GUIDE.md) | Initial setup instructions |
| [DEPLOYMENT.md](../DEPLOYMENT.md) | Deployment guide |
| [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) | Additional deployment info |
| [DEPLOYMENT-CHECKLIST.md](../DEPLOYMENT-CHECKLIST.md) | Pre-deployment checklist |
| [PRE_PRODUCTION_CHECKLIST.md](../PRE_PRODUCTION_CHECKLIST.md) | Production readiness |

### Database & Security

| Document | Description |
|----------|-------------|
| [DATABASE_MIGRATION_GUIDE.md](../DATABASE_MIGRATION_GUIDE.md) | Migration procedures |
| [RLS_SECURITY_SETUP.md](../RLS_SECURITY_SETUP.md) | Row Level Security setup |
| [DATA_RETENTION_POLICY.md](../DATA_RETENTION_POLICY.md) | Data retention rules |

### Feature Epics

| Document | Description |
|----------|-------------|
| [EPIC_BOOKING_MANAGEMENT.md](../EPIC_BOOKING_MANAGEMENT.md) | Booking feature |
| [EPIC_CUSTOMER_MANAGEMENT.md](../EPIC_CUSTOMER_MANAGEMENT.md) | Customer feature |
| [EPIC_STAFF_PORTAL.md](../EPIC_STAFF_PORTAL.md) | Staff portal feature |
| [EPIC_CHAT_SYSTEM.md](../EPIC_CHAT_SYSTEM.md) | Chat feature |

### User Guides

| Document | Description |
|----------|-------------|
| [USER_GUIDE_MANAGER_ROLE.md](../USER_GUIDE_MANAGER_ROLE.md) | Manager role guide |
| [ADMIN_GUIDE_USER_MANAGEMENT.md](../ADMIN_GUIDE_USER_MANAGEMENT.md) | Admin user management |
| [USER-GUIDE-V2-TIERED-PRICING.md](../USER-GUIDE-V2-TIERED-PRICING.md) | Tiered pricing guide |

## Getting Started

### For New Developers

1. Read [CLAUDE.md](../CLAUDE.md) first - it's the most comprehensive guide
2. Review [Architecture](./architecture.md) for system overview
3. Follow [Development Guide](./development-guide.md) for setup
4. Explore [Source Tree](./source-tree-analysis.md) to understand structure

### Quick Commands

```bash
# Development
npm run dev          # Start dev server (port 5173)
npm run build        # Production build
npm run lint         # Run linter

# Testing
npm run test:run     # Run tests once
npm run test:coverage # Coverage report
```

## Architecture Health

```
Structure:     ████████░░ 80%  Clean but needs refactor
Security:      █████████░ 90%  RLS + RBAC comprehensive
Testing:       ████░░░░░░ 40%  Infrastructure ready
Documentation: ██████░░░░ 60%  Good foundation
Operations:    ███░░░░░░░ 30%  No CI/CD, no monitoring
```

## Known Gaps

| Gap | Severity | Status |
|-----|----------|--------|
| Customer Portal | High | Not implemented |
| Payment Gateway | Medium | UI ready, backend pending |
| CI/CD Pipeline | Medium | Not configured |
| Error Monitoring | High | Not implemented |

## Documentation To Generate _(Future)_

The following documents could enhance project understanding:

- [API Contracts](./api-contracts.md) _(To be generated)_
- [Data Models](./data-models.md) _(To be generated)_
- [Component Inventory](./component-inventory.md) _(To be generated)_
- [Test Coverage Report](./test-coverage.md) _(To be generated)_

---

## Navigation

| Section | Link |
|---------|------|
| 📖 Overview | [project-overview.md](./project-overview.md) |
| 🏗️ Architecture | [architecture.md](./architecture.md) |
| 🌳 Source Tree | [source-tree-analysis.md](./source-tree-analysis.md) |
| 🔧 Development | [development-guide.md](./development-guide.md) |
| 📊 Scan Report | [project-scan-report.json](./project-scan-report.json) |

---

*This index was generated by the BMad Method document-project workflow.*
*Last updated: 2026-01-22*
