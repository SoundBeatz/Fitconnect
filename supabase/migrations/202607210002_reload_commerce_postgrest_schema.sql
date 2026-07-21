-- Refresh PostgREST after the checkout compatibility columns were added.
-- Without this notification, Edge Functions can continue to receive
-- PGRST204/PGRST200 responses for columns that already exist in PostgreSQL.

notify pgrst, 'reload schema';
