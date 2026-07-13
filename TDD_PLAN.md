# TDD Implementation Plan - Bosch Internal Communications Platform

## Issue #1: Auth & Role System ✅ IN PROGRESS

### User Journeys
- **Employee**: Can login, view feed, comment, react, share posts
- **Comms Officer**: Can login, create posts, submit for approval, edit own posts
- **Admin**: Can login, approve/reject posts, view audit trail, manage audiences

### Tests Written (RED State) ✅
- [x] Login with Employee credentials → returns EMPLOYEE role
- [x] Login with Comms Officer credentials → returns COMMS_OFFICER role
- [x] Login with Admin credentials → returns ADMIN role
- [x] Invalid username → throws UnauthorizedException
- [x] Wrong password → throws UnauthorizedException
- [x] Validate JWT token → returns user payload
- [x] Employee permissions → [view_feed, comment, react, share]
- [x] Comms Officer permissions → [view_feed, create_post, edit_own_posts, comment, react, share]
- [x] Admin permissions → [view_feed, approve_post, reject_post, revoke_post, view_audit_trail, manage_audiences]

### Implementation (GREEN State) ✅
- [x] AuthService.login(credentials) → validates mock users, returns JWT + user
- [x] AuthService.validateUser(user) → returns user payload
- [x] AuthService.getRolePermissions(role) → returns array of permitted actions
- [x] JwtStrategy → extracts JWT from Bearer token
- [x] JwtAuthGuard → protects routes
- [x] AuthController.login() → POST /auth/login
- [x] AuthController.getProfile() → GET /auth/me (protected)

### Test Coverage Target: 80%+
- [ ] Run tests
- [ ] Verify GREEN state (all tests pass)
- [ ] Generate coverage report
- [ ] Verify coverage >= 80%

### Refactoring Candidates
- Extract mock user database to separate file
- Create role/permission enum
- Add DTO validation

### Commits
- [x] test: add Auth module tests (RED state)
- [ ] fix: implement Auth service and controller (GREEN state)
- [ ] refactor: extract mock data, improve type safety (REFACTOR)

---

## Issue #2: Database Schema & Immutable Audit Infrastructure

### User Journeys
- Admin creates collections in CosmosDB
- Audit collection enforces append-only (no deletes)
- All entities reference audit trail

### Tests to Write (RED State)
- [ ] Can connect to CosmosDB
- [ ] Can create document in posts collection
- [ ] Can create document in audit collection
- [ ] Cannot update audit document
- [ ] Cannot delete audit document
- [ ] Partition key strategy works

### Implementation (GREEN State)
- [ ] CosmosDB connection via environment variable
- [ ] Collections created with correct indexes
- [ ] Audit enforcement at application level

### Commits
- [ ] test: add database schema tests (RED)
- [ ] feat: implement CosmosDB connection (GREEN)
- [ ] refactor: optimize indexes and partitioning

---

## Issue #3: Post Content Model

### Tests to Write (RED State)
- [ ] Create post with text content
- [ ] Create post with up to 3 images (max 5MB each)
- [ ] Validate image count limit
- [ ] Validate image size limit
- [ ] Create post with video links
- [ ] Create post with document links
- [ ] Draft post only visible to creator
- [ ] Post transitions from Draft → Submitted → Published

### Implementation (GREEN State)
- [ ] Post schema with content types
- [ ] Media validation middleware
- [ ] Draft visibility enforcement

### Commits
- [ ] test: add post content model tests (RED)
- [ ] feat: implement post model and validation (GREEN)

---

## DevSecOps Setup ✅

### CI/CD Pipeline
- [x] GitHub Actions workflow (.github/workflows/ci.yml)
  - Run tests on Node 18.x and 20.x
  - Generate coverage reports
  - Upload to Codecov
  - Trivy vulnerability scanning
  - npm audit for security issues

### Pre-commit Hooks
- [x] Husky hooks configured
- [x] pre-commit: run tests before commit
- [x] commit-msg: enforce Conventional Commits format

### Security Scanning
- [x] Trivy SARIF output to GitHub Security
- [x] npm audit checks
- [x] Dependency outdated checks

---

## Coverage Requirements
- Global: 80% branches, functions, lines, statements
- Per-package thresholds enforced in jest/vitest configs

## Commit Format
```
<type>(<scope>): <subject>

<body>

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

Types: feat, fix, test, docs, refactor, ci, chore

---

## Success Criteria
- ✅ Issue #1 tests pass with 80%+ coverage
- ✅ All commits follow Conventional Commits
- ✅ GitHub Actions CI/CD runs on every push/PR
- ✅ Pre-commit hooks prevent bad commits
- ✅ Move to Issue #2 with same TDD rigor
