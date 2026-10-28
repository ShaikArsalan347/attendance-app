create table if not exists public.daily_attendance (
  student_id uuid not null references public.profiles(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent', 'leave')),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (student_id, attendance_date)
);

create index if not exists daily_attendance_date_idx
  on public.daily_attendance (attendance_date);

alter table public.daily_attendance enable row level security;

grant select, insert, update on public.daily_attendance to authenticated;

drop policy if exists "Users read scoped attendance" on public.daily_attendance;
create policy "Users read scoped attendance"
  on public.daily_attendance
  for select
  to authenticated
  using (
    student_id = auth.uid()
    or exists (
      select 1
      from public.profiles as student
      where student.id = daily_attendance.student_id
        and student.teacher_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles as administrator
      where administrator.id = auth.uid()
        and administrator.role = 'admin'
    )
  );

drop policy if exists "Teachers and admins write attendance" on public.daily_attendance;
create policy "Teachers and admins write attendance"
  on public.daily_attendance
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles as student
      where student.id = daily_attendance.student_id
        and student.teacher_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles as administrator
      where administrator.id = auth.uid()
        and administrator.role = 'admin'
    )
  )
  with check (
    updated_by = auth.uid()
    and (
      exists (
        select 1
        from public.profiles as student
        where student.id = daily_attendance.student_id
          and student.teacher_id = auth.uid()
      )
      or exists (
        select 1
        from public.profiles as administrator
        where administrator.id = auth.uid()
          and administrator.role = 'admin'
      )
    )
  );