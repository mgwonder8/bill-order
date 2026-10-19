-- TagBill database. Run in the Supabase SQL editor (safe to re-run).
-- The app reads and writes with the service role key on the server only, so every
-- table has row-level security on and no policies: the public anon key sees nothing.
--
-- Flow: scan tags -> customer order form (optionally billed) -> daily compile per supplier -> supplier purchase order.
-- Supplier data and customer data are kept in separate tables.

-- ---------- Parties ----------

create table if not exists public.suppliers (
  id         text primary key,
  created_at timestamptz not null default now(),
  name       text not null default '',
  gstin      text not null default '',
  phone      text not null default '',
  email      text not null default '',
  address    text not null default '',
  row_no     bigint generated always as identity unique
);
comment on table public.suppliers is 'Who the shop buys from. Created from scanned tags.';

create table if not exists public.customers (
  id         text primary key,
  created_at timestamptz not null default now(),
  name       text not null default '',
  phone      text not null default '',
  gstin      text not null default '',
  address    text not null default '',
  row_no     bigint generated always as identity unique
);
comment on table public.customers is 'Who the shop sells to. Created from bills.';

-- ---------- Articles from supplier tags ----------

create table if not exists public.tags (
  id               text primary key,
  created_at       timestamptz not null default now(),
  created_by       text not null default '',
  supplier_id      text references public.suppliers (id),
  design_no        text not null default '',
  supplier_name    text not null default '',
  supplier_gstin   text not null default '',
  supplier_phone   text not null default '',
  supplier_email   text not null default '',
  supplier_address text not null default '',
  brand            text not null default '',
  fabric           text not null default '',
  gsm              text not null default '',
  color            text not null default '',
  remarks          text not null default '',
  image_url        text not null default '',
  photo_name       text not null default '',
  row_no           bigint generated always as identity unique
);
comment on table public.tags is 'One row per article (design no + supplier), created by scanning a tag.';

create table if not exists public.article_sizes (
  id             text primary key,
  tag_id         text not null references public.tags (id),
  created_at     timestamptz not null default now(),
  article_code   text not null default '',
  size           text not null default '',
  sizes          text not null default '',
  pcs_per_set    integer not null default 24,
  rate           numeric(12,2) not null default 0,
  sell_rate      numeric(12,2) not null default 0,
  supplier_name  text not null default '',
  supplier_gstin text not null default '',
  supplier_phone text not null default '',
  brand          text not null default '',
  fabric         text not null default '',
  row_no         bigint generated always as identity unique
);
comment on table public.article_sizes is 'One row per size range of an article. rate = supplier rate per piece, sell_rate = selling price per piece.';

-- ---------- Supplier orders (purchase orders) ----------

create table if not exists public.supplier_orders (
  id               text primary key,
  order_no         text not null default '',
  created_at       timestamptz not null default now(),
  created_by       text not null default '',
  supplier_id      text references public.suppliers (id),
  supplier_name    text not null default '',
  supplier_phone   text not null default '',
  supplier_gstin   text not null default '',
  supplier_address text not null default '',
  total_sets       integer not null default 0,
  total_pieces     integer not null default 0,
  total_amount     numeric(12,2) not null default 0,
  notes            text not null default '',
  row_no           bigint generated always as identity unique
);
comment on table public.supplier_orders is 'Purchase orders sent to suppliers.';

create table if not exists public.supplier_order_items (
  id             text primary key,
  order_id       text not null references public.supplier_orders (id),
  size_id        text references public.article_sizes (id),
  article_code   text not null default '',
  size           text not null default '',
  sizes          text not null default '',
  sets           integer not null default 0,
  pcs_per_set    integer not null default 24,
  pieces         integer not null default 0,
  rate           numeric(12,2) not null default 0,
  amount         numeric(12,2) not null default 0,
  sell_rate      numeric(12,2) not null default 0,
  brand          text not null default '',
  fabric         text not null default '',
  supplier_name  text not null default '',
  supplier_gstin text not null default '',
  supplier_phone text not null default '',
  row_no         bigint generated always as identity unique
);
comment on table public.supplier_order_items is 'Lines of a supplier order: sets of 24 pieces at the supplier rate.';

-- ---------- Customer order forms ----------

create table if not exists public.customer_orders (
  id               text primary key,
  order_no         text not null default '',
  created_at       timestamptz not null default now(),
  created_by       text not null default '',
  customer_id      text references public.customers (id),
  customer_name    text not null default '',
  customer_phone   text not null default '',
  customer_gstin   text not null default '',
  customer_address text not null default '',
  status           text not null default 'open',
  bill_id          text,
  total_sets       integer not null default 0,
  total_pieces     integer not null default 0,
  total_amount     numeric(12,2) not null default 0,
  notes            text not null default '',
  row_no           bigint generated always as identity unique
);
comment on table public.customer_orders is 'Order forms taken from customers. status is open until a bill is made from it, then billed.';

create table if not exists public.customer_order_items (
  id             text primary key,
  order_id       text not null references public.customer_orders (id),
  size_id        text references public.article_sizes (id),
  article_code   text not null default '',
  size           text not null default '',
  sizes          text not null default '',
  sets           integer not null default 0,
  pcs_per_set    integer not null default 24,
  pieces         integer not null default 0,
  rate           numeric(12,2) not null default 0,
  amount         numeric(12,2) not null default 0,
  brand          text not null default '',
  fabric         text not null default '',
  supplier_name  text not null default '',
  supplier_gstin text not null default '',
  supplier_phone text not null default '',
  row_no         bigint generated always as identity unique
);
comment on table public.customer_order_items is 'Lines of a customer order form: article, size chart, sets and pieces at the selling price.';

-- ---------- Customer bills ----------

create table if not exists public.bills (
  id               text primary key,
  bill_no          text not null default '',
  created_at       timestamptz not null default now(),
  created_by       text not null default '',
  customer_id      text references public.customers (id),
  customer_name    text not null default '',
  customer_phone   text not null default '',
  customer_gstin   text not null default '',
  customer_address text not null default '',
  total_sets       integer not null default 0,
  total_pieces     integer not null default 0,
  gross_amount     numeric(12,2) not null default 0,
  discount_amount  numeric(12,2) not null default 0,
  taxable_amount   numeric(12,2) not null default 0,
  cgst_rate        numeric(5,2)  not null default 0,
  cgst_amount      numeric(12,2) not null default 0,
  sgst_rate        numeric(5,2)  not null default 0,
  sgst_amount      numeric(12,2) not null default 0,
  round_off        numeric(12,2) not null default 0,
  total            numeric(12,2) not null default 0,
  notes            text not null default '',
  row_no           bigint generated always as identity unique
);
comment on table public.bills is 'GST tax invoices for customers (CGST + SGST).';

create table if not exists public.bill_items (
  id              text primary key,
  bill_id         text not null references public.bills (id),
  size_id         text references public.article_sizes (id),
  hsn             text not null default '',
  article_code    text not null default '',
  size            text not null default '',
  sizes           text not null default '',
  sets            integer not null default 0,
  loose_pieces    integer not null default 0,
  pcs_per_set     integer not null default 24,
  pieces          integer not null default 0,
  rate            numeric(12,2) not null default 0,
  cost_rate       numeric(12,2) not null default 0,
  gross_amount    numeric(12,2) not null default 0,
  discount_pct    numeric(5,2)  not null default 0,
  discount_amount numeric(12,2) not null default 0,
  taxable_amount  numeric(12,2) not null default 0,
  brand           text not null default '',
  fabric          text not null default '',
  supplier_name   text not null default '',
  supplier_gstin  text not null default '',
  supplier_phone  text not null default '',
  row_no          bigint generated always as identity unique
);
comment on table public.bill_items is 'Lines of a bill: full sets plus loose pieces at the selling price (rate); cost_rate is the supplier rate.';

alter table public.bills add column if not exists order_id text references public.customer_orders (id);
alter table public.bills add column if not exists order_no text not null default '';
alter table public.bills add column if not exists gst_mode text not null default 'with';
comment on column public.bills.gst_mode is 'with = 5% GST added on top (CGST + SGST); without = plain bill, no GST.';

create index if not exists customer_orders_created_at_idx on public.customer_orders (created_at);
create index if not exists customer_order_items_order_id_idx on public.customer_order_items (order_id);
create index if not exists tags_supplier_id_idx on public.tags (supplier_id);
create index if not exists article_sizes_tag_id_idx on public.article_sizes (tag_id);
create index if not exists supplier_orders_supplier_id_idx on public.supplier_orders (supplier_id);
create index if not exists supplier_order_items_order_id_idx on public.supplier_order_items (order_id);
create index if not exists supplier_order_items_size_id_idx on public.supplier_order_items (size_id);
create index if not exists bills_created_at_idx on public.bills (created_at);
create index if not exists bills_customer_id_idx on public.bills (customer_id);
create index if not exists bill_items_bill_id_idx on public.bill_items (bill_id);
create index if not exists bill_items_size_id_idx on public.bill_items (size_id);

alter table public.suppliers            enable row level security;
alter table public.customers            enable row level security;
alter table public.tags                 enable row level security;
alter table public.article_sizes        enable row level security;
alter table public.supplier_orders      enable row level security;
alter table public.supplier_order_items enable row level security;
alter table public.customer_orders      enable row level security;
alter table public.customer_order_items enable row level security;
alter table public.bills                enable row level security;
alter table public.bill_items           enable row level security;

-- ---------- Ready-made views ----------

drop view if exists public.stock;
drop view if exists public.supplier_daily;

create or replace view public.daily_order_compile with (security_invoker = true) as
with lines as (
  select (o.created_at at time zone 'Asia/Kolkata')::date as order_date, o.order_no as source_no,
         i.supplier_name, i.brand, i.article_code, i.size, i.sets, i.pieces
  from public.customer_order_items i join public.customer_orders o on o.id = i.order_id
  union all
  select (b.created_at at time zone 'Asia/Kolkata')::date, b.bill_no,
         i.supplier_name, i.brand, i.article_code, i.size, i.sets, i.pieces
  from public.bill_items i join public.bills b on b.id = i.bill_id
  where b.order_id is null
)
select order_date,
       coalesce(nullif(supplier_name, ''), 'Unknown supplier') as supplier_name,
       brand, article_code, size,
       sum(sets)::integer   as total_sets,
       sum(pieces)::integer as total_pieces,
       string_agg(distinct source_no, ', ' order by source_no) as from_orders
from lines
group by 1, 2, brand, article_code, size
order by 1 desc, 2, brand, article_code, size;
comment on view public.daily_order_compile is 'What customers ordered per day, grouped by supplier, brand, article and size chart: total sets to order from each supplier.';
