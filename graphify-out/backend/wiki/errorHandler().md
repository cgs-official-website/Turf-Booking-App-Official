# errorHandler()

> God node · 2 connections · [C:\Users\mohan\Downloads\turf booking app\server\middleware\errorHandler.js](file:///C:/Users/mohan/Downloads/turf%20booking%20app/server/middleware/errorHandler.js#L7)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as errorHandler()
    participant P1 as sendError()
    participant P2 as otpRateLimiter()
    participant P3 as now
    participant P4 as requireAdmin()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P2->>+ P3: calls
    P3-->>- P2: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P4: calls
    P4-->>- P1: return
    P4->>+ P1: calls
    P1-->>- P4: return
```

## Connections by Relation

### calls
- [[sendError()]] `INFERRED`

### contains
- [[errorHandler.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*