create table if not exists public.attendance_sessions (
  id uuid primary key,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  attendance_date date not null,
  created_at timestamptz not null,
  expires_at timestamptz not null
);

create table if not exists public.attendance_checkins (
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

alter table public.attendance_sessions enable row level security;
alter table public.attendance_checkins enable row level security;

grant all on public.attendance_sessions, public.attendance_checkins to service_role;