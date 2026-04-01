/**
 * k6 Load Test — Query Listings Endpoint
 * SE 4458 Midterm — Short-Term Stay API
 *
 * Endpoint: GET /api/v1/listings/query
 * Auth: None required
 * Rate limit: 3/day per IP (bypassed in tests by rotating IPs or using staging env)
 *
 * Scenarios:
 *   1. Normal Load  — 20 VUs for 30s
 *   2. Peak Load    — 50 VUs for 30s
 *   3. Stress Load  — 100 VUs for 30s
 *
 * Run: k6 run query-listings.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
const queryResponseTime = new Trend('query_listings_response_time', true);
const queryErrors       = new Rate('query_listings_error_rate');
const queryRequests     = new Counter('query_listings_total_requests');

// ── Test configuration ────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    normal_load: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30s',
      startTime: '0s',
      tags: { scenario: 'normal' },
    },
    peak_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30s',
      startTime: '40s',  // 10s gap between scenarios
      tags: { scenario: 'peak' },
    },
    stress_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '30s',
      startTime: '80s',
      tags: { scenario: 'stress' },
    },
  },
  thresholds: {
    // 95th percentile response time under 1.5s across all scenarios
    query_listings_response_time: ['p(95)<1500'],
    // Error rate below 10%
    query_listings_error_rate: ['rate<0.1'],
  },
};

// ── Base URL (change before running against deployed environment) ──────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// ── Main test function ────────────────────────────────────────────────────────
export default function () {
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  // Vary query params to simulate realistic usage
  const queries = [
    '?country=Turkey&city=Istanbul&no_of_people=2&page=1',
    '?country=Turkey&page=1',
    '?city=Ankara&no_of_people=3&page=1',
    '?no_of_people=1&date_from=2025-08-01&date_to=2025-08-07&page=1',
    '?page=1',
  ];
  const q = queries[Math.floor(Math.random() * queries.length)];

  const res = http.get(`${BASE_URL}/api/v1/listings/query${q}`, params);

  // Record metrics
  queryResponseTime.add(res.timings.duration);
  queryRequests.add(1);

  const success = check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
    'response is JSON': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
  });

  queryErrors.add(!success);

  sleep(Math.random() * 0.5 + 0.2); // 0.2–0.7s think time
}

export function handleSummary(data) {
  console.log('\n========= Query Listings Load Test Summary =========');
  const rt = data.metrics.query_listings_response_time;
  if (rt) {
    console.log(`Average Response Time : ${rt.values.avg.toFixed(2)} ms`);
    console.log(`p95 Response Time     : ${rt.values['p(95)'].toFixed(2)} ms`);
    console.log(`p99 Response Time     : ${rt.values['p(99)'].toFixed(2)} ms`);
  }
  const reqs = data.metrics.http_reqs;
  if (reqs) {
    console.log(`Requests/sec          : ${reqs.values.rate.toFixed(2)}`);
  }
  const errRate = data.metrics.query_listings_error_rate;
  if (errRate) {
    console.log(`Error Rate            : ${(errRate.values.rate * 100).toFixed(2)}%`);
  }
  console.log('====================================================\n');
  return {};
}
