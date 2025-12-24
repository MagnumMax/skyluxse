ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rental_prices JSONB DEFAULT NULL;
COMMENT ON COLUMN vehicles.rental_prices IS 'Daily, weekly, monthly rental prices and minimum days';
