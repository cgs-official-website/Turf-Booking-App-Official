# otpRateLimiter()

> God node · 3 connections · [C:\Users\mohan\Downloads\turf booking app\server\middleware\rateLimiter.js](file:///C:/Users/mohan/Downloads/turf%20booking%20app/server/middleware/rateLimiter.js#L24)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as otpRateLimiter()
    participant P1 as sendError()
    participant P2 as errorHandler()
    participant P3 as requireAdmin()
    participant P4 as now
    participant P5 as resetAndSeed()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P1->>+ P3: calls
    P3-->>- P1: return
    P3->>+ P1: calls
    P1-->>- P3: return
    P0->>+ P4: calls
    P4-->>- P0: return
    P4->>+ P0: calls
    P0-->>- P4: return
    P4->>+ P5: calls
    P5-->>- P4: return
    P5->>+ P4: calls
    P4-->>- P5: return
```

## Connections by Relation

### calls
- [[sendError()]] `INFERRED`
- [[now]] `EXTRACTED`

### contains
- [[rateLimiter.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*