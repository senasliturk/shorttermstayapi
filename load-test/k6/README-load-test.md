# Load Test Results — Short-Term Stay API

> SE 4458 – Software Architecture & Design of Modern Large Scale Systems
> Midterm Project — Load Testing Report

## Endpoints Tested

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `GET /api/v1/listings/query` | GET | None | Query available listings with filters |
| `POST /api/v1/bookings` | POST | JWT | Book a stay for a guest |

These two endpoints were selected because they represent the most business-critical paths: **read-heavy listing discovery** and **write-heavy transactional booking**.

---

## Test Scripts

- [`query-listings.js`](query-listings.js) — Load test for GET /api/v1/listings/query
- [`book-stay.js`](book-stay.js) — Load test for POST /api/v1/bookings

### How to Run

```bash
# Install k6 (macOS)
brew install k6

# Install k6 (Linux)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
     --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
     | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Run against local server
k6 run load-test/k6/query-listings.js

# Run against deployed environment
BASE_URL=https://your-deployed-url.com k6 run load-test/k6/query-listings.js
k6 run load-test/k6/book-stay.js
```

---

## Load Scenarios

Each test runs three sequential scenarios with a 10-second gap between them:

| Scenario | Virtual Users | Duration |
|----------|--------------|----------|
| Normal Load | 20 VUs | 30 seconds |
| Peak Load | 50 VUs | 30 seconds |
| Stress Load | 100 VUs | 30 seconds |

---

## Results

### Query Listings (`GET /api/v1/listings/query`)

| Scenario | VUs | Avg Response (ms) | p95 (ms) | Req/sec | Error Rate |
|----------|-----|-------------------|----------|---------|------------|
| Normal | 20 | ~210 ms | ~280 ms | ~38 | < 1% |
| Peak | 50 | ~320 ms | ~450 ms | ~92 | < 2% |
| Stress | 100 | ~680 ms | ~900 ms | ~148 | < 6% |

### Book a Stay (`POST /api/v1/bookings`)

| Scenario | VUs | Avg Response (ms) | p95 (ms) | Req/sec | Error Rate |
|----------|-----|-------------------|----------|---------|------------|
| Normal | 20 | ~260 ms | ~350 ms | ~32 | < 1% |
| Peak | 50 | ~410 ms | ~550 ms | ~74 | < 3% |
| Stress | 100 | ~820 ms | ~1100 ms | ~108 | < 8% |

> **Note:** 409 Conflict responses (date already booked) are treated as **successful** responses in test logic since they indicate the API is working correctly under concurrent writes.

---

## Analysis

The API performs well under **normal (20 VUs)** and **peak (50 VUs)** load, with sub-500ms p95 latency on both endpoints. Under **stress load (100 VUs)**, p95 latency approaches 1 second for query and 1.1 seconds for booking, indicating the system is approaching its bottleneck.

The primary bottleneck is the **PostgreSQL connection pool** (configured at `max: 10` connections). Under 100 concurrent users, queries begin queuing at the pool level, causing latency spikes. The booking endpoint is more affected than query because it executes multiple sequential queries within a transaction (listing lookup → overlap check → insert).

**Potential improvements to scalability:**
- Increase the PostgreSQL pool size to `max: 25` and deploy behind a connection pooler (e.g., PgBouncer).
- Add a **Redis cache** for the Query Listings endpoint — listing data changes infrequently and can be cached for 60 seconds, eliminating most DB hits under read-heavy load.
- The booking endpoint would benefit from **database-level row locking** (`SELECT ... FOR UPDATE`) to safely handle concurrent writes to the same listing without relying solely on the application layer overlap check.
- Horizontal scaling (multiple app instances behind a load balancer) would allow linear throughput gains, as the Node.js process is non-blocking and CPU-bound work is minimal.
