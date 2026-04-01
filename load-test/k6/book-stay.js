/**
 * k6 Load Test — Book a Stay Endpoint
 * SE 4458 Midterm — Short-Term Stay API
 *
 * Endpoint: POST /api/v1/bookings
 * Auth: JWT acquired once in setup(), shared across all VUs
 *
 * Scenarios:
 *   1. Normal Load  — 20 VUs for 30s
 *   2. Peak Load    — 50 VUs for 30s
 *   3. Stress Load  — 100 VUs for 30s
 *
 * Run: k6 run book-stay.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
const bookResponseTime = new Trend('book_stay_response_time', true);
const bookErrors       = new Rate('book_stay_error_rate');
const bookRequests     = new Counter('book_stay_total_requests');

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
      startTime: '40s',
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
    book_stay_response_time: ['p(95)<2000'],
    book_stay_error_rate:    ['rate<0.15'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// ── Setup: get JWT token once, share with all VUs ─────────────────────────────
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: 'test@test.com', password: '123456' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (loginRes.status !== 200) {
    console.error(`Login failed: ${loginRes.status} — ${loginRes.body}`);
    return { token: null };
  }

  try {
    const token = JSON.parse(loginRes.body).data.token;
    console.log('Login successful, token acquired.');
    return { token };
  } catch {
    console.error('Failed to parse token from login response.');
    return { token: null };
  }
}

// ── Main test function ────────────────────────────────────────────────────────
export default function ({ token }) {
  if (!token) {
    bookErrors.add(1);
    sleep(1);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Use future dates with random offsets to reduce booking conflicts
  const vuId = __VU;
  const iter = __ITER;
  const year = 2027;
  const month = String(((vuId + iter) % 12) + 1).padStart(2, '0');
  const day   = String(((vuId * 3 + iter + Math.floor(Math.random() * 20)) % 25) + 1).padStart(2, '0');
  const endDay = String(parseInt(day) + 3).padStart(2, '0');

  const payload = JSON.stringify({
    listing_id:  1,
    date_from:   `${year}-${month}-${day}`,
    date_to:     `${year}-${month}-${endDay}`,
    guest_count: 1,
    guest_names: `Guest-VU${vuId}-I${iter}`,
  });

  const res = http.post(`${BASE_URL}/api/v1/bookings`, payload, { headers });

  bookResponseTime.add(res.timings.duration);
  bookRequests.add(1);

  const success = check(res, {
    'status is 201, 409 or 429': (r) => r.status === 201 || r.status === 409 || r.status === 429,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
    'response is JSON': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
  });

  bookErrors.add(!success);

  sleep(Math.random() * 0.5 + 0.3);
}

export function handleSummary(data) {
  console.log('\n========= Book a Stay Load Test Summary =========');
  const rt = data.metrics.book_stay_response_time;
  if (rt) {
    console.log(`Average Response Time : ${rt.values.avg.toFixed(2)} ms`);
    console.log(`p95 Response Time     : ${rt.values['p(95)'].toFixed(2)} ms`);
    console.log(`p99 Response Time     : ${rt.values['p(99)'].toFixed(2)} ms`);
  }
  const reqs = data.metrics.http_reqs;
  if (reqs) {
    console.log(`Requests/sec          : ${reqs.values.rate.toFixed(2)}`);
  }
  const errRate = data.metrics.book_stay_error_rate;
  if (errRate) {
    console.log(`Error Rate            : ${(errRate.values.rate * 100).toFixed(2)}%`);
  }
  console.log('=================================================\n');
  return {};
}
