create table if not exists public.chat_messages (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  message_text text not null,
  created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end;
$$;

create index if not exists chat_messages_created_at_idx
on public.chat_messages (created_at desc);

alter table public.chat_messages enable row level security;

drop policy if exists "chat messages public read" on public.chat_messages;
create policy "chat messages public read"
on public.chat_messages
for select
using (true);

drop policy if exists "chat messages owner insert" on public.chat_messages;
create policy "chat messages owner insert"
on public.chat_messages
for insert
with check (auth.uid() = user_id);
