# resetAndSeed()

> God node · 2 connections · [C:\Users\mohan\Downloads\turf booking app\server\scripts\resetDatabase.js](file:///C:/Users/mohan/Downloads/turf%20booking%20app/server/scripts/resetDatabase.js#L11)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as resetAndSeed()
    participant P1 as now
    participant P2 as otpRateLimiter()
    participant P3 as sendError()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P3: calls
    P3-->>- P2: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P1->>+ P0: calls
    P0-->>- P1: return
```

## Connections by Relation

### calls
- [[now]] `INFERRED`

### contains
- [[resetDatabase.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*