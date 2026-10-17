-- Stuckpoint 이벤트 테이블
create table if not exists public.stuck_events (
  id bigint generated always as identity primary key,
  project_key text not null,
  type text not null check (type in ('rage_click', 'dead_click', 'form_abandon', 'error_click', 'visit')),
  page text not null,
  selector text not null,
  label text not null,
  x integer not null,
  y integer not null,
  vw integer not null,
  count integer,
  field text,
  filled integer,
  total integer,
  message text,
  sid text not null,
  ts timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists stuck_events_project_ts on public.stuck_events (project_key, ts desc);

-- 서버(service role)만 읽고 쓴다. 브라우저에서 직접 접근하는 정책은 만들지 않는다.
alter table public.stuck_events enable row level security;
