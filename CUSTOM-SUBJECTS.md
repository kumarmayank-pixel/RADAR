# Custom subjects and deadline types

This feature branch adds account-specific subjects and lets a task use a custom type such as Quiz, Presentation, or Competition. Before running this branch, run the following migration in the Supabase SQL Editor. It preserves existing tasks and the existing five subjects.

```sql
alter table public.tasks drop constraint if exists tasks_category_check;

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz not null default now(),
  constraint subjects_user_name_unique unique (user_id, name)
);

alter table public.subjects enable row level security;

drop policy if exists "Users manage their own subjects" on public.subjects;
create policy "Users manage their own subjects"
on public.subjects for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.subjects to authenticated;
```

The app saves custom subject rows in Supabase, so they follow the signed-in user across devices. Custom task types are stored in the existing `tasks.category` text column with a `custom:` prefix; the migration removes the old built-in-only category constraint.
