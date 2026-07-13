# ADR 0001: Web-First (React + Capacitor) Over React Native

**Date:** 2026-07-13  
**Status:** Accepted

## Context

The application must run on web browsers, laptops, and mobile devices (iOS/Android) from a **single codebase**. Two main architectural approaches were evaluated:

1. **Web-first (React + Capacitor):** Single React web app that runs natively on browsers; Capacitor wraps it for iOS/Android with native access where needed.
2. **React Native:** JavaScript runtime targeting iOS/Android natively; requires separate web React app or experimental Expo Web (not production-ready).

## Decision

We chose **web-first (React + Capacitor)**.

## Rationale

| Criterion | Web-First + Capacitor | React Native |
|-----------|----------------------|--------------|
| Single codebase | ✓ Yes | ✗ No (requires separate web app or Expo Web) |
| Time to market | ✓ Faster (one codebase to maintain) | ✗ Slower (two codebases or unproven Expo) |
| Mobile UX | ~ Good (web with native shell) | ✓ Better (true native rendering) |
| Team expertise | ✓ React is standard; Capacitor learning curve minimal | ✗ React Native has steeper curve |
| Offline support | ✓ Feasible (service workers, local caching) | ✓ Feasible |
| Push notifications | ✓ Via Capacitor plugins | ✓ Native |
| Maintenance | ✓ One stack to update | ✗ Two stacks to update |

**Key trade-off:** We sacrifice some native polish for code unity and faster iteration.

## Consequences

**Positive:**
- Single React codebase deployed to web, iOS, and Android simultaneously.
- Faster bug fixes and feature updates (one place to change).
- Lower maintenance overhead.
- Easier onboarding for React developers.

**Negative:**
- Mobile UX is web-based, not truly native (acceptable for internal comms).
- Some native features require Capacitor plugins (manageable).
- iOS/Android app store submission requires more boilerplate (one-time cost).

## Alternatives Considered

- **React Native with Expo Web:** Unproven in production; Expo Web still experimental.
- **Separate web + React Native apps:** Violates single-codebase requirement; doubles maintenance burden.
- **Flutter:** No team expertise; would require ramp-up time.
