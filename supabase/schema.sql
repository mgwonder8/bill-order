-- TagBill database. Run in the Supabase SQL editor (safe to re-run).
-- The app reads and writes with the service role key on the server only, so every
-- table has row-level security on and no policies: the public anon key sees nothing.
--
-- Flow: scan a supplier tag -> supplier order (stock comes in) -> customer bill (stock goes out).
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

-- ---------- Supplier orders (stock in) ----------

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
comment on table public.supplier_orders is 'Order forms sent to suppliers. Saving one adds its pieces to stock.';

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

-- ---------- Customer bills (stock out) ----------

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
alter table public.bills                enable row level security;
alter table public.bill_items           enable row level security;

-- ---------- Ready-made views ----------

create or replace view public.stock with (security_invoker = true) as
select
  s.id                                   as size_id,
  s.article_code,
  s.size,
  s.supplier_name,
  s.rate                                 as supplier_rate,
  s.sell_rate,
  coalesce(o.pieces, 0)                  as ordered_pieces,
  coalesce(b.pieces, 0)                  as sold_pieces,
  coalesce(o.pieces, 0) - coalesce(b.pieces, 0) as in_stock_pieces,
  greatest(0, floor((coalesce(o.pieces, 0) - coalesce(b.pieces, 0)) / 24.0))::integer as in_stock_full_sets
from public.article_sizes s
left join (select size_id, sum(pieces) as pieces from public.supplier_order_items group by size_id) o on o.size_id = s.id
left join (select size_id, sum(pieces) as pieces from public.bill_items group by size_id) b on b.size_id = s.id
order by s.supplier_name, s.article_code, s.size;
comment on view public.stock is 'Live stock per article size range: pieces ordered from suppliers minus pieces billed (1 set = 24 pieces).';

create or replace view public.supplier_daily with (security_invoker = true) as
select
  (b.created_at at time zone 'Asia/Kolkata')::date                     as bill_date,
  coalesce(nullif(i.supplier_name, ''), 'Unknown supplier')           as supplier_name,
  max(nullif(i.supplier_gstin, ''))                                   as supplier_gstin,
  i.article_code,
  i.size,
  i.cost_rate                                                         as supplier_rate,
  sum(i.pieces)::integer                                              as pieces,
  sum(i.pieces * i.cost_rate)                                         as amount_at_supplier_rate,
  string_agg(distinct b.bill_no, ', ' order by b.bill_no)             as bill_nos
from public.bill_items i
join public.bills b on b.id = i.bill_id
group by 1, 2, i.article_code, i.size, i.cost_rate
order by 1 desc, 2, i.article_code, i.size;
comment on view public.supplier_daily is 'Pieces sold per day, grouped by supplier, article and size range, valued at the supplier rate.';
