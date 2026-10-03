-- TagBill database. Run in the Supabase SQL editor (safe to re-run).
-- The app reads and writes with the service role key on the server only, so every
-- table has row-level security on and no policies: the public anon key sees nothing.

-- ---------- Articles from supplier tags ----------

create table if not exists public.tags (
  id               text primary key,
  created_at       timestamptz not null default now(),
  created_by       text not null default '',
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
  pcs_per_set    integer not null default 1,
  rate           numeric(12,2) not null default 0,
  supplier_name  text not null default '',
  supplier_gstin text not null default '',
  supplier_phone text not null default '',
  brand          text not null default '',
  fabric         text not null default '',
  row_no         bigint generated always as identity unique
);
comment on table public.article_sizes is 'One row per size set of an article (e.g. 22-28) with its rate per piece.';

-- ---------- Order forms ----------

create table if not exists public.orders (
  id               text primary key,
  order_no         text not null default '',
  created_at       timestamptz not null default now(),
  created_by       text not null default '',
  status           text not null default 'open',
  customer_name    text not null default '',
  customer_phone   text not null default '',
  customer_gstin   text not null default '',
  customer_address text not null default '',
  total_sets       integer not null default 0,
  total_pieces     integer not null default 0,
  total_amount     numeric(12,2) not null default 0,
  bill_id          text,
  notes            text not null default '',
  row_no           bigint generated always as identity unique
);
comment on table public.orders is 'Order forms. status is open until a bill is made, then billed.';

create table if not exists public.order_items (
  id             text primary key,
  order_id       text not null references public.orders (id),
  size_id        text,
  article_code   text not null default '',
  size           text not null default '',
  sizes          text not null default '',
  sets           integer not null default 0,
  pcs_per_set    integer not null default 1,
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
comment on table public.order_items is 'Lines of an order form, one per article size set.';

-- ---------- GST bills ----------

create table if not exists public.bills (
  id               text primary key,
  bill_no          text not null default '',
  created_at       timestamptz not null default now(),
  created_by       text not null default '',
  order_id         text references public.orders (id),
  order_no         text not null default '',
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
comment on table public.bills is 'GST tax invoices (CGST + SGST).';

create table if not exists public.bill_items (
  id              text primary key,
  bill_id         text not null references public.bills (id),
  hsn             text not null default '',
  article_code    text not null default '',
  size            text not null default '',
  sizes           text not null default '',
  sets            integer not null default 0,
  pcs_per_set     integer not null default 1,
  pieces          integer not null default 0,
  rate            numeric(12,2) not null default 0,
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
comment on table public.bill_items is 'Lines of a bill, one per article size set, with the discount given.';

create index if not exists article_sizes_tag_id_idx on public.article_sizes (tag_id);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists bills_created_at_idx on public.bills (created_at);
create index if not exists bill_items_bill_id_idx on public.bill_items (bill_id);

alter table public.tags          enable row level security;
alter table public.article_sizes enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.bills         enable row level security;
alter table public.bill_items    enable row level security;

-- ---------- Ready-made report: what to send each supplier, per day (Indian time) ----------

create or replace view public.supplier_daily with (security_invoker = true) as
select
  (b.created_at at time zone 'Asia/Kolkata')::date                     as bill_date,
  coalesce(nullif(i.supplier_name, ''), 'Unknown supplier')           as supplier_name,
  max(nullif(i.supplier_gstin, ''))                                   as supplier_gstin,
  i.article_code,
  i.size,
  i.rate,
  sum(i.sets)::integer                                                as sets,
  sum(i.pieces)::integer                                              as pieces,
  sum(i.gross_amount)                                                 as amount,
  string_agg(distinct b.bill_no, ', ' order by b.bill_no)             as bill_nos
from public.bill_items i
join public.bills b on b.id = i.bill_id
group by 1, 2, i.article_code, i.size, i.rate
order by 1 desc, 2, i.article_code, i.size;
comment on view public.supplier_daily is 'Everything billed per day, grouped by supplier, article and size set.';
