-- 클릭 기록(trackClicks) 추가: type에 'click', 링크 이동 주소 href
alter table public.stuck_events drop constraint if exists stuck_events_type_check;
alter table public.stuck_events
  add constraint stuck_events_type_check
  check (type in ('rage_click', 'dead_click', 'form_abandon', 'error_click', 'visit', 'click'));
alter table public.stuck_events add column if not exists href text;
