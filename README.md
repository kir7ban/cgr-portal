# Bosch Internal Communications Platform

A web-based social media site for Bosch's internal communications department. Cross-platform (web, mobile browsers, native iOS/Android apps) from a single React codebase, deployed on Azure.

**Status:** Requirements converged (2026-07-13). Ready for implementation.

---

## Quick Start: Read These First

1. **[`CONVERGENCE_SUMMARY.md`](./CONVERGENCE_SUMMARY.md)** — What was decided and why. Start here for a 5-min overview.
2. **[`REQUIREMENTS.md`](./REQUIREMENTS.md)** — Full specification. Functional, governance, technical, scale.
3. **[`CONTEXT.md`](./CONTEXT.md)** — Domain glossary. Shared vocabulary for the team.

---

## Architecture Decisions

See `docs/adr/`:

- **[ADR 0001: Web-First (React + Capacitor) Over React Native](./docs/adr/0001-web-first-capacitor-over-react-native.md)** — Why single codebase via web app + Capacitor, not separate React Native.
- **[ADR 0002: Role-Based Approval Workflow with Admin Override](./docs/adr/0002-role-based-approval-workflow.md)** — Why flexible Admin approval + override mechanism, not hierarchical routing.
- **[ADR 0003: CosmosDB with Immutable Append-Only Audit Logs](./docs/adr/0003-cosmosdb-immutable-audit-logs.md)** — Why all data in one CosmosDB with app-level audit immutability.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + TypeScript, Redux, Vite, Capacitor (iOS/Android) |
| **Backend** | Node.js + NestJS, REST API |
| **Database** | Azure CosmosDB (posts, comments, users, audit logs) |
| **Deployment** | Azure App Service (API + static frontend), GitHub Actions CI/CD |
| **Auth** | Mock for MVP; Azure Entra in production |

---

## Key Features

- **Content Creation:** Comms Officers create posts (text, images, videos, documents)
- **Approval Workflow:** Admins review, approve, reject, or request feedback; can override each other
- **Distribution Control:** Admins decide audience scope (org-wide, department-only, custom groups)
- **Employee Engagement:** Like, comment, share published posts
- **Immutable Audit Trail:** All actions logged for 3 years, admin-only access
- **GDPR Compliant:** Minimal PII (no names/emails shown to Admins), department-only visibility
- **Mobile App:** Read-only consumption via Capacitor wrapper (iOS/Android)

---

## Scale (MVP)

- **Users:** 5,000-10,000 employees, 20-30 Comms Officers, 5 Admins
- **Content:** 50-100 posts/day, 5-10 comments/post
- **Performance:** <2s feed load time, 400-1000 RU/s CosmosDB

---

## What's Next

1. **Database Design** — CosmosDB schema for posts, comments, reactions, users, audit logs
2. **API Specification** — REST endpoint details (requests, responses, status codes)
3. **Frontend Architecture** — Component hierarchy, Redux state shape, Capacitor integration
4. **Sprints:**
   - Sprint 1: Auth + role management (mock)
   - Sprint 2: Post creation & approval
   - Sprint 3: Feed + engagement (likes, comments, shares)
   - Sprint 4: Admin audit & analytics dashboard
   - Sprint 5: Mobile app (Capacitor)
   - Sprint 6: Azure deployment & CI/CD

---

## Out of Scope (MVP)

- Push notifications
- Session security (add in production)
- Backup & disaster recovery
- Monitoring & alerting
- Data export
- SOC 2 Type II compliance (plan for later)

---

## Questions?

See [`REQUIREMENTS.md`](./REQUIREMENTS.md) for full details on functional requirements, governance, audit, and technical spec. See [`CONTEXT.md`](./CONTEXT.md) for glossary of terms.

---

**Ready to code.** All requirements are converged. Let's build. 🚀
