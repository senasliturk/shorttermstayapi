-- ============================================================
-- Short-Term Stay API — PostgreSQL Database Schema
-- ============================================================

-- Users (hosts and guests)
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    role          VARCHAR(20) NOT NULL DEFAULT 'guest' CHECK (role IN ('guest', 'host', 'admin')),
    created_at    TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Listings (properties added by hosts)
CREATE TABLE IF NOT EXISTS listings (
    id              SERIAL PRIMARY KEY,
    host_id         INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    location        VARCHAR(255) NOT NULL,
    country         VARCHAR(100) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    capacity        INTEGER     NOT NULL CHECK (capacity >= 1),
    price_per_night NUMERIC(10,2) NOT NULL CHECK (price_per_night > 0),
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Bookings (guests booking a listing)
CREATE TABLE IF NOT EXISTS bookings (
    id          SERIAL PRIMARY KEY,
    listing_id  INTEGER     NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    guest_id    INTEGER     NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    from_date   DATE        NOT NULL,
    to_date     DATE        NOT NULL,
    guest_count INTEGER     NOT NULL CHECK (guest_count >= 1),
    guest_names TEXT,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    CHECK (to_date > from_date)
);

-- Reviews (only guests who booked can review)
CREATE TABLE IF NOT EXISTS reviews (
    id          SERIAL PRIMARY KEY,
    booking_id  INTEGER     NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    listing_id  INTEGER     NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    guest_id    INTEGER     NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Uploaded files (CSV bulk listing uploads)
CREATE TABLE IF NOT EXISTS uploaded_files (
    id            SERIAL PRIMARY KEY,
    listing_id    INTEGER REFERENCES listings(id) ON DELETE SET NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name   VARCHAR(255) NOT NULL,
    file_path     TEXT        NOT NULL,
    mime_type     VARCHAR(100) NOT NULL,
    file_size     INTEGER     NOT NULL,
    created_at    TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- API rate limiting tracking (Query Listings: 3 calls/day per IP)
CREATE TABLE IF NOT EXISTS rate_limit_log (
    id         SERIAL PRIMARY KEY,
    ip_address VARCHAR(50)  NOT NULL,
    endpoint   VARCHAR(100) NOT NULL,
    called_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_listings_country_city ON listings(country, city);
CREATE INDEX IF NOT EXISTS idx_bookings_listing_id   ON bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id     ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_reviews_listing_id    ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log        ON rate_limit_log(ip_address, endpoint, called_at);

-- ── Seed Data (for testing) ────────────────────────────────────────────────────
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Admin User',  'admin@test.com', '$2b$10$examplehashADMIN',  'admin'),
    ('Host User',   'host@test.com',  '$2b$10$examplehashHOST',   'host'),
    ('Guest User',  'guest@test.com', '$2b$10$examplehashGUEST',  'guest'),
    ('Test User',   'test@test.com',  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p36WkLkMynBoJhmB9yWd8O', 'guest')
ON CONFLICT (email) DO NOTHING;
