create table if not exists public.direct_messages (
  id text primary key,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  message_text text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint direct_messages_sender_recipient_check check (sender_id <> recipient_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end;
$$;

create index if not exists direct_messages_sender_created_at_idx
on public.direct_messages (sender_id, created_at desc);

create index if not exists direct_messages_recipient_created_at_idx
on public.direct_messages (recipient_id, created_at desc);

alter table public.direct_messages enable row level security;

drop policy if exists "direct messages owner read" on public.direct_messages;
create policy "direct messages owner read"
on public.direct_messages
for select
using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "direct messages owner insert" on public.direct_messages;
create policy "direct messages owner insert"
on public.direct_messages
for insert
with check (auth.uid() = sender_id);
