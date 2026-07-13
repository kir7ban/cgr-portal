# Convergence Summary: Bosch Internal Communications Platform

**Session Date:** 2026-07-13  
**Skill:** grill-with-docs  
**Status:** ✅ Requirements converged and documented

---

## What We Did

Conducted a **27-question interview** (grill) covering every aspect of the Bosch internal communications platform, converging on a shared understanding of:

1. **Architecture:** Web-first (React + Capacitor) for cross-platform from single codebase
2. **Governance:** Role-based approval workflow with Admin override for business continuity
3. **Content:** Posts, comments, reactions, shares; Comms Officers create, Admins approve & distribute
4. **Audit:** Immutable append-only logs (3 years), Admin-only access
5. **Data:** GDPR-compliant (minimal PII, department-only visibility)
6. **Deployment:** Azure App Service + CosmosDB, GitHub Actions CI/CD
7. **MVP Scope:** No backup, monitoring, session security, push notifications, or data export

---

## Key Decisions (Why They Matter)

### 1. Web-First (React + Capacitor), Not React Native
- **Decision:** Single React web app wraps with Capacitor for mobile
- **Why:** True single codebase (React Native requires separate web app), faster iteration, easier maintenance
- **Trade-off:** Mobile UX is web-based, not truly native (acceptable for internal comms)
- **ADR:** `docs/adr/0001-web-first-capacitor-over-react-native.md`

### 2. Role-Based Approval with Admin Override
- **Decision:** All posts follow same approval flow; Admins can override each other's rejections
- **Why:** Simple, flexible, prevents bottlenecks if Admin unavailable
- **Consequences:** Override must be logged; requires trust in Admin team
- **ADR:** `docs/adr/0002-role-based-approval-workflow.md`

### 3. CosmosDB All-In-One with App-Level Audit Immutability
- **Decision:** All data (posts, comments, audit logs) in single CosmosDB; immutability enforced at app level
- **Why:** Simpler ops (one database), flexible schema for semi-structured social content
- **Consequences:** Audit safety depends on code discipline (no deletes on audit collection)
- **ADR:** `docs/adr/0003-cosmosdb-immutable-audit-logs.md`

### 4. GDPR-Compliant Minimal PII
- **Decision:** Admins see only department + engagement counts; no personal data shown
- **Why:** Bosch is German company (GDPR-subject); internal comms data is sensitive
- **Consequence:** Audit trail has no "who read it" list, only view count

### 5. Read-Only Mobile App
- **Decision:** Mobile (iOS/Android via Capacitor) is consumption-only; all governance/creation on web
- **Why:** Governance (approval, analytics, audit) requires careful UI; simpler to do once on web
- **Consequence:** Employees can't draft posts on mobile, but can read and engage offline

---

## What's Documented

### Project Files (in repo root)

- **`CONTEXT.md`** — Domain glossary. Define all terms (Comms Officer, Admin, Approval Workflow, Pending Review State, Admin Override, etc.). Language for the team.

- **`REQUIREMENTS.md`** — Full converged specification. Functional requirements, governance, audit, technical stack, API endpoints, scale assumptions, MVP scope, out-of-scope items.

- **`docs/adr/`** — Architecture Decision Records (3 ADRs covering the major decisions above).

### Memory (for future conversations)

- **Persistent project memory** — What it is, workflow, tech stack, why decisions matter, for future sessions.

---

## What's Next

You're now ready to:

1. **Design the database schema** — document CosmosDB collections (posts, comments, reactions, users, auditLogs)
2. **Design the API** — REST endpoints with request/response specs
3. **Plan the frontend** — component architecture, Redux state shape, Capacitor integration
4. **Build in sprints:**
   - Sprint 1: Auth + role management (mock)
   - Sprint 2: Post creation & approval workflow
   - Sprint 3: Feed + employee engagement (likes, comments, shares)
   - Sprint 4: Admin audit & analytics dashboard
   - Sprint 5: Capacitor mobile app + offline caching
   - Sprint 6: Azure deployment & GitHub Actions CI/CD

---

## Key Constraints to Remember

- ✅ **Single codebase** (React + Capacitor, not React Native)
- ✅ **Immutable audit logs** (3 years, append-only, admin-only access)
- ✅ **GDPR minimal PII** (no personal data shown to Admins)
- ✅ **Comms Officers create** (not employees; tight control at source)
- ✅ **Admin controls distribution** (even if Comms Officer proposes audience)
- ✅ **Approval is mutable** (posts can be edited, must go back to approval)
- ✅ **Revocation is final** (only Admins, disappears from feed, logged in audit)
- ✅ **Mobile is read-only** (all governance on web)
- ⏭️ **No backup/monitoring/session-security for MVP** (add in production)

---

## Session Stats

- **Questions asked:** 27 (covering architecture, workflow, data, compliance, scale, tech stack)
- **Major decisions converged:** 5 (web-first, role-based approval, CosmosDB, audit, GDPR)
- **ADRs created:** 3
- **Documentation:** CONTEXT.md, REQUIREMENTS.md, persistent project memory

---

**Ready to build.** All requirements are clear. Start with database design or API spec. 🚀
