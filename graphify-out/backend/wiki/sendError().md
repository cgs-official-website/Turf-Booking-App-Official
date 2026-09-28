# sendError()

> God node · 4 connections · [C:\Users\mohan\Downloads\turf booking app\server\utils\response.js](file:///C:/Users/mohan/Downloads/turf%20booking%20app/server/utils/response.js#L16)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as sendError()
    participant P1 as otpRateLimiter()
    participant P2 as now
    participant P3 as resetAndSeed()
    participant P4 as errorHandler()
    participant P5 as requireAdmin()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P2->>+ P3: calls
    P3-->>- P2: return
    P0->>+ P4: calls
    P4-->>- P0: return
    P4->>+ P0: calls
    P0-->>- P4: return
    P0->>+ P5: calls
    P5-->>- P0: return
    P5->>+ P0: calls
    P0-->>- P5: return
```

## Connections by Relation

### calls
- [[otpRateLimiter()]] `INFERRED`
- [[errorHandler()]] `INFERRED`
- [[requireAdmin()]] `INFERRED`

### contains
- [[response.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*