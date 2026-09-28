# requireAdmin()

> God node · 2 connections · [C:\Users\mohan\Downloads\turf booking app\server\middleware\requireAdmin.js](file:///C:/Users/mohan/Downloads/turf%20booking%20app/server/middleware/requireAdmin.js#L6)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as requireAdmin()
    participant P1 as sendError()
    participant P2 as otpRateLimiter()
    participant P3 as now
    participant P4 as errorHandler()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P2->>+ P3: calls
    P3-->>- P2: return
    P1->>+ P4: calls
    P4-->>- P1: return
    P4->>+ P1: calls
    P1-->>- P4: return
    P1->>+ P0: calls
    P0-->>- P1: return
```

## Connections by Relation

### calls
- [[sendError()]] `INFERRED`

### contains
- [[requireAdmin.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*