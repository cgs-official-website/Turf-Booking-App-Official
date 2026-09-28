# now

> God node · 3 connections · [C:\Users\mohan\Downloads\turf booking app\server\middleware\rateLimiter.js](file:///C:/Users/mohan/Downloads/turf%20booking%20app/server/middleware/rateLimiter.js#L11)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as now
    participant P1 as otpRateLimiter()
    participant P2 as sendError()
    participant P3 as errorHandler()
    participant P4 as requireAdmin()
    participant P5 as resetAndSeed()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P2->>+ P3: calls
    P3-->>- P2: return
    P2->>+ P4: calls
    P4-->>- P2: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P0->>+ P5: calls
    P5-->>- P0: return
    P5->>+ P0: calls
    P0-->>- P5: return
```

## Connections by Relation

### calls
- [[otpRateLimiter()]] `EXTRACTED`
- [[resetAndSeed()]] `INFERRED`

### contains
- [[rateLimiter.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*