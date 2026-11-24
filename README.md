# RADAR

**Exam, Lab & Assignment Deadline Scanner** — a lightweight academic deadline tracker built with HTML, CSS, and vanilla JavaScript.

RADAR helps students organize coursework deadlines and exam dates, see what needs attention next, and access their data from different devices after signing in.

## Features

- Add project, viva, and assignment deadlines, grouped by subject.
- Add and manage an exam timetable with date, time, duration, venue, and notes.
- See live countdowns and urgency labels for upcoming deadlines.
- Filter and search tasks, mark them complete, and copy formatted reminders.
- Browse tasks by subject.
- Sign in with email and password; tasks and exams are stored in Supabase and associated with the signed-in account.
- Use dark or light theme, with the preference saved in the browser.
- Responsive layout for laptop and phone screens.

## Subjects

- Discrete Mathematics
- Engineering Mathematics
- Fundamentals of Computer Programming (FoCP)
- Fundamentals of Electrical Engineering (FoEE)
- Professional Communication

## Project team

| Name | Scholar number | Role |
|---|---:|---|
| Mayank Kumar | 26U010137 | Leader |
| Rohit Nagraj | 26U010143 | Layout & Design |
| Jitendra Kumar Swami | 26U010130 | Team member |
| Khushwant Gahlot | 26U010131 | Team member |

## Technology

- HTML5, CSS3, and vanilla JavaScript
- Supabase Auth for account sign-in
- Supabase Postgres for tasks and exams
- GitHub Pages for static hosting

## Run locally

1. Download or clone this repository.
2. Serve the project over HTTP, for example with the **Live Server** extension in Visual Studio Code.
3. Open the local site URL and sign in or create an account.

Opening `index.html` directly as a `file://` URL may prevent authentication from working. Use HTTPS hosting or a local web server.

## Supabase setup

The browser client is configured in `script.js` with the Supabase project URL and publishable key. Publishable keys are intended for browser use; never put a Supabase secret or service-role key in frontend code.

Create the following tables in the Supabase SQL Editor and enable Row Level Security. The policies restrict each account to its own rows:

```sql
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  subject text not null,
  category text not null check (category in ('projects', 'viva', 'assignments')),
  due_at timestamptz not null,
  submission_link text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  subject text not null,
  exam_at timestamptz not null,
  duration text,
  venue text,
  reporting_time text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
alter table public.exams enable row level security;

create policy "Users manage their own tasks"
on public.tasks for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage their own exams"
on public.exams for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.tasks, public.exams to authenticated;
```

In Supabase **Authentication → Sign In / Providers**, enable email/password sign-in. Email confirmation can be enabled or disabled. With confirmation enabled, configure a custom SMTP provider before inviting many users; the built-in email sender has strict limits.

Each account has its own tasks and exams. Signing in with the same account on multiple devices syncs that account's records. Separate accounts do not share data unless workspace sharing is added.

## Deploy with GitHub Pages

1. Push `index.html`, `style.css`, and `script.js` to the repository's `main` branch.
2. In GitHub, open **Settings → Pages**.
3. Select **Deploy from a branch**, choose `main` and `/(root)`, then save.
4. Copy the published site URL from the Pages settings.
5. In Supabase, open **Authentication → URL Configuration** and set the Site URL and allowed redirect URL to the published site URL.

## License

No license has been specified yet.
