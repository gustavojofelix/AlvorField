-- =========================================================================
-- ALVORFIELD - ESTRUTURA DE BANCO DE DADOS SUPABASE (POSTGRESQL)
-- Cole este script no Editor SQL (SQL Editor) do seu painel Supabase.
-- =========================================================================

-- 1. TIPOS ENUMERADOS
create type public.user_role as enum ('producer', 'buyer', 'investor', 'admin');
create type public.offer_status as enum ('active', 'paused', 'sold', 'expired');
create type public.interest_status as enum ('pending', 'accepted', 'rejected', 'completed');

-- 2. TABELA DE PERFIS DE UTILIZADORES
-- Vinculada automaticamente ao auth.users do Supabase Auth.
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  phone text unique not null,
  full_name text not null,
  role public.user_role not null,
  province text not null,
  district text not null,
  address text,
  reputation_score numeric(3,2) default 5.00 check (reputation_score >= 1.00 and reputation_score <= 5.00),
  completed_deals integer default 0 check (completed_deals >= 0),
  avatar_url text,
  area_cultivo numeric check (area_cultivo >= 0),
  num_membros integer check (num_membros >= 0),
  nome_associacao text,
  tipo_comprador text,
  produtos_interesse text[],
  tipo_instituicao text,
  descricao text,
  status text default 'Activo' not null,
  preferences jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS nos Perfis
alter table public.profiles enable row level security;

-- Políticas de Acesso para perfis:
-- Qualquer um pode visualizar perfis
create policy "Perfis são públicos para leitura"
  on public.profiles for select
  using (true);

-- Apenas o próprio utilizador pode atualizar o seu perfil
create policy "Utilizadores atualizam os seus próprios perfis"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. TABELA DE OFERTAS DE PRODUÇÃO
create table public.offers (
  id uuid default gen_random_uuid() primary key,
  producer_id uuid references public.profiles(id) on delete cascade not null,
  product_name text not null,
  category text not null,
  quantity numeric not null check (quantity >= 0),
  unit text not null,
  price_per_unit numeric not null check (price_per_unit >= 0),
  negotiable boolean default true not null,
  province text not null,
  district text not null,
  latitude numeric,
  longitude numeric,
  image_url text,
  status public.offer_status default 'active'::public.offer_status not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS nas Ofertas
alter table public.offers enable row level security;

-- Políticas para Ofertas:
-- Leitura pública para todos
create policy "Ofertas públicas para leitura"
  on public.offers for select
  using (true);

-- Criação e alteração apenas pelo produtor dono
create policy "Produtores gerem as suas ofertas"
  on public.offers for all
  using (auth.uid() = producer_id)
  with check (auth.uid() = producer_id);

-- 4. TABELA DE INTERESSES E NEGOCIAÇÃO
create table public.interests (
  id uuid default gen_random_uuid() primary key,
  offer_id uuid references public.offers(id) on delete cascade not null,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  requested_quantity numeric not null check (requested_quantity > 0),
  proposed_price numeric check (proposed_price >= 0),
  message text,
  status public.interest_status default 'pending'::public.interest_status not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS nos Interesses
alter table public.interests enable row level security;

-- Políticas para Interesses:
-- Um interesse só é lido pelo comprador interessado, pelo produtor dono da oferta, ou por admin
create policy "Visualização de interesses permitida aos envolvidos"
  on public.interests for select
  using (
    auth.uid() = buyer_id or 
    auth.uid() = (select producer_id from public.offers where id = offer_id) or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Apenas o comprador pode criar interesse
create policy "Compradores registam interesses"
  on public.interests for insert
  with check (auth.uid() = buyer_id);

-- Envolvidos podem atualizar status/dados do interesse
create policy "Envolvidos atualizam interesses"
  on public.interests for update
  using (
    auth.uid() = buyer_id or 
    auth.uid() = (select producer_id from public.offers where id = offer_id)
  );

-- 5. TABELA DE AVALIAÇÕES
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  interest_id uuid references public.interests(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete cascade not null,
  reviewee_id uuid references public.profiles(id) on delete cascade not null,
  rating integer check (rating >= 1 and rating <= 5) not null,
  comment text,
  approved boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS nas Avaliações
alter table public.reviews enable row level security;

create policy "Avaliações públicas aprovadas"
  on public.reviews for select
  using (approved = true or auth.uid() = reviewer_id or auth.uid() = reviewee_id);

create policy "Utilizadores autenticados criam avaliações"
  on public.reviews for insert
  with check (auth.uid() = reviewer_id);

-- 6. TABELA DE NOTIFICAÇÕES
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  message text not null,
  type text not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS nas Notificações
alter table public.notifications enable row level security;

create policy "Utilizadores leem as suas notificações"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Utilizadores atualizam (marcam como lida) as suas notificações"
  on public.notifications for update
  using (auth.uid() = user_id);

-- 7. TABELA DE LOGS DE AUDITORIA
create table public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS nos Logs de Auditoria
alter table public.audit_logs enable row level security;

create policy "Apenas administradores leem logs"
  on public.audit_logs for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Administradores criam logs"
  on public.audit_logs for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- =========================================================================
-- 8. TRIGGER DE CRIAÇÃO AUTOMÁTICA DE PERFIL
-- Cria um registo correspondente em public.profiles sempre que um utilizador se regista no auth.users do Supabase.
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  _phone text;
  _name text;
  _role public.user_role;
  _province text;
  _district text;
  _address text;
  _avatar_url text;
  _area_cultivo numeric;
  _num_membros integer;
  _nome_associacao text;
  _tipo_comprador text;
  _produtos_interesse text[];
  _tipo_instituicao text;
  _descricao text;
begin
  -- Extrair metadados passados no registo (user_metadata)
  _phone := coalesce(new.raw_user_meta_data->>'phone', new.phone, '');
  _name := coalesce(new.raw_user_meta_data->>'full_name', 'Utilizador AlvorField');
  _role := (coalesce(new.raw_user_meta_data->>'role', 'buyer'))::public.user_role;
  _province := coalesce(new.raw_user_meta_data->>'province', 'Maputo');
  _district := coalesce(new.raw_user_meta_data->>'district', 'Boane');
  _address := new.raw_user_meta_data->>'address';
  _avatar_url := new.raw_user_meta_data->>'avatar_url';
  
  -- Campos extras
  if new.raw_user_meta_data->>'area_cultivo' is not null then
    _area_cultivo := (new.raw_user_meta_data->>'area_cultivo')::numeric;
  end if;
  if new.raw_user_meta_data->>'num_membros' is not null then
    _num_membros := (new.raw_user_meta_data->>'num_membros')::integer;
  end if;
  
  _nome_associacao := new.raw_user_meta_data->>'nome_associacao';
  _tipo_comprador := new.raw_user_meta_data->>'tipo_comprador';
  
  -- Converter array de produtos de interesse de JSON para text[]
  if new.raw_user_meta_data->'produtos_interesse' is not null then
    select array_agg(val)::text[] into _produtos_interesse 
    from jsonb_array_elements_text(new.raw_user_meta_data->'produtos_interesse') as val;
  end if;
  
  _tipo_instituicao := new.raw_user_meta_data->>'tipo_instituicao';
  _descricao := new.raw_user_meta_data->>'descricao';

  insert into public.profiles (
    id, phone, full_name, role, province, district, address, avatar_url,
    area_cultivo, num_membros, nome_associacao, tipo_comprador, produtos_interesse, tipo_instituicao, descricao
  )
  values (
    new.id, _phone, _name, _role, _province, _district, _address, _avatar_url,
    _area_cultivo, _num_membros, _nome_associacao, _tipo_comprador, _produtos_interesse, _tipo_instituicao, _descricao
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- 9. TABELA DE PRODUTOS PREDEFINIDOS
-- =========================================================================
create table public.predefined_products (
  name text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.predefined_products enable row level security;

create policy "Produtos visíveis a todos" on public.predefined_products for select using (true);
create policy "Admins gerem produtos" on public.predefined_products for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Inserir produtos iniciais padrão
insert into public.predefined_products (name) values
  ('Milho Branco'),
  ('Feijão Nhemba'),
  ('Feijão Manteiga'),
  ('Gergelim'),
  ('Castanha de Caju'),
  ('Manga'),
  ('Mandioca'),
  ('Amendoim'),
  ('Batata Doce'),
  ('Tomate'),
  ('Cebola Vermelha')
on conflict (name) do nothing;

-- =========================================================================
-- 10. TABELA DE PEDIDOS DE RELATÓRIO DE INVESTIDORES
-- =========================================================================
create table public.report_requests (
  id uuid default gen_random_uuid() primary key,
  investor_id uuid references public.profiles(id) on delete cascade not null,
  topic text not null,
  details text not null,
  mpesa_phone text not null,
  status text default 'Pendente' not null,
  file_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  responded_at timestamp with time zone
);

alter table public.report_requests enable row level security;

create policy "Investidores leem seus relatórios" on public.report_requests for select
  using (auth.uid() = investor_id or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Investidores criam relatórios" on public.report_requests for insert
  with check (auth.uid() = investor_id);

create policy "Admins gerem relatórios" on public.report_requests for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

