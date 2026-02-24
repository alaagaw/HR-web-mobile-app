-- Enforce unique supplier names (case-insensitive)
CREATE UNIQUE INDEX idx_suppliers_unique_name ON suppliers (LOWER(name));
