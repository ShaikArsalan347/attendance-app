create table if not exists public.leave_appeals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  student_name text not null,
  reason text not null check (length(trim(reason)) > 0),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

create index if not exists leave_appeals_student_created_idx
  on public.leave_appeals (student_id, created_at desc);

alter table public.leave_appeals enable row level security;

grant select on public.leave_appeals to authenticated;
grant insert (id, student_id, student_name, reason, status, created_at)
  on public.leave_appeals to authenticated;
grant update (status, reviewed_at, reviewed_by)
  on public.leave_appeals to authenticated;

drop policy if exists "Users read scoped leave appeals" on public.leave_appeals;
create policy "Users read scoped leave appeals"
  on public.leave_appeals
  for select
  to authenticated
  using (
    student_id = auth.uid()
    or exists (
      select 1
      from public.profiles as student
      where student.id = leave_appeals.student_id
        and student.teacher_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles as administrator
      where administrator.id = auth.uid()
        and administrator.role = 'admin'
    )
  );

drop policy if exists "Students submit own leave appeals" on public.leave_appeals;
create policy "Students submit own leave appeals"
  on public.leave_appeals
  for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
  );

drop policy if exists "Teachers and admins review leave appeals" on public.leave_appeals;
create policy "Teachers and admins review leave appeals"
  on public.leave_appeals
  for update
  to authenticated
  using (
    status = 'pending'
    and (
      exists (
        select 1
        from public.profiles as student
        where student.id = leave_appeals.student_id
          and student.teacher_id = auth.uid()
      )
      or exists (
        select 1
        from public.profiles as administrator
        where administrator.id = auth.uid()
          and administrator.role = 'admin'
      )
    )
  )
  with check (
    status in ('approved', 'rejected')
    and reviewed_by = auth.uid()
    and reviewed_at is not null
    and (
      exists (
        select 1
        from public.profiles as student
        where student.id = leave_appeals.student_id
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
