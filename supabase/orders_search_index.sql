-- Speeds up the admin Orders search (ilike '%text%' on order number and customer name).
create extension if not exists pg_trgm;
create index if not exists orders_order_no_trgm on orders using gin (order_no gin_trgm_ops);
create index if not exists orders_customer_name_trgm on orders using gin (customer_name gin_trgm_ops);
