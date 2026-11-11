-- ============================================================
-- 실모벅벅 로그인·구독 데이터베이스 (Supabase SQL Editor 에서 한 번 실행)
-- 다시 실행해도 안전하도록 if not exists / or replace 를 사용합니다.
-- ============================================================

-- 1) 회원 프로필
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- 2) 이용 권한: Pro 만료일, EXP 무료 사용 횟수
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pro_until timestamptz,
  exp_used integer not null default 0 check (exp_used >= 0),
  updated_at timestamptz not null default now()
);

-- 3) 시험 기록 (기기 간 동기화). 기록 전체를 JSON 으로 저장
create table if not exists public.exam_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists exam_results_user_created on public.exam_results (user_id, created_at desc);

-- 4) Pro 이용권 코드 (관리자만 만들고, 회원은 함수로만 사용)
create table if not exists public.pro_codes (
  code text primary key,
  days integer not null check (days > 0),
  max_uses integer not null default 1 check (max_uses > 0),
  used_count integer not null default 0,
  expires_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.code_redemptions (
  code text not null references public.pro_codes (code) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code, user_id)
);

-- ------------------------------------------------------------
-- 보안 규칙 (Row Level Security): 본인 데이터만 읽고 쓰기
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.entitlements enable row level security;
alter table public.exam_results enable row level security;
alter table public.pro_codes enable row level security;
alter table public.code_redemptions enable row level security;

drop policy if exists "profiles: 본인 조회" on public.profiles;
create policy "profiles: 본인 조회" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles: 본인 수정" on public.profiles;
create policy "profiles: 본인 수정" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 이용 권한은 본인 조회만 (변경은 아래 함수로만)
drop policy if exists "entitlements: 본인 조회" on public.entitlements;
create policy "entitlements: 본인 조회" on public.entitlements for select to authenticated using (user_id = auth.uid());

drop policy if exists "exam_results: 본인 조회" on public.exam_results;
create policy "exam_results: 본인 조회" on public.exam_results for select to authenticated using (user_id = auth.uid());
drop policy if exists "exam_results: 본인 추가" on public.exam_results;
create policy "exam_results: 본인 추가" on public.exam_results for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "exam_results: 본인 수정" on public.exam_results;
create policy "exam_results: 본인 수정" on public.exam_results for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "exam_results: 본인 삭제" on public.exam_results;
create policy "exam_results: 본인 삭제" on public.exam_results for delete to authenticated using (user_id = auth.uid());

drop policy if exists "code_redemptions: 본인 조회" on public.code_redemptions;
create policy "code_redemptions: 본인 조회" on public.code_redemptions for select to authenticated using (user_id = auth.uid());
-- pro_codes 는 정책 없음 = 회원이 직접 읽기·쓰기 불가

-- ------------------------------------------------------------
-- 가입하면 프로필·이용 권한 행 자동 생성
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'nickname'))
  on conflict (id) do nothing;
  insert into public.entitlements (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 회원이 부르는 함수
-- ------------------------------------------------------------
-- EXP 무료 횟수 (바꾸려면 여기 숫자만 수정)
create or replace function public.exp_free_limit()
returns integer language sql immutable as $$ select 10 $$;

-- 내 이용 권한
create or replace function public.get_entitlement()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.entitlements;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  insert into public.entitlements (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select * into e from public.entitlements where user_id = auth.uid();
  return json_build_object(
    'pro_until', e.pro_until,
    'is_pro', coalesce(e.pro_until > now(), false),
    'exp_used', e.exp_used,
    'exp_limit', public.exp_free_limit()
  );
end;
$$;

-- EXP 모드 1회 사용 (Pro 는 차감 없음). 남은 횟수가 없으면 ok=false
create or replace function public.consume_exp()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.entitlements;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  insert into public.entitlements (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select * into e from public.entitlements where user_id = auth.uid() for update;
  if e.pro_until is not null and e.pro_until > now() then
    return json_build_object('ok', true, 'is_pro', true, 'exp_used', e.exp_used, 'exp_limit', public.exp_free_limit());
  end if;
  if e.exp_used >= public.exp_free_limit() then
    return json_build_object('ok', false, 'is_pro', false, 'exp_used', e.exp_used, 'exp_limit', public.exp_free_limit());
  end if;
  update public.entitlements set exp_used = exp_used + 1, updated_at = now() where user_id = auth.uid();
  return json_build_object('ok', true, 'is_pro', false, 'exp_used', e.exp_used + 1, 'exp_limit', public.exp_free_limit());
end;
$$;

-- 이용권 코드 사용 → Pro 기간 연장 (이미 Pro 면 남은 기간 뒤에 이어 붙임)
create or replace function public.redeem_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.pro_codes;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  v_until timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  select * into c from public.pro_codes where code = v_code for update;
  if not found then
    return json_build_object('ok', false, 'reason', 'not_found');
  end if;
  if c.expires_at is not null and c.expires_at < now() then
    return json_build_object('ok', false, 'reason', 'expired');
  end if;
  if exists (select 1 from public.code_redemptions where code = v_code and user_id = auth.uid()) then
    return json_build_object('ok', false, 'reason', 'already_used');
  end if;
  if c.used_count >= c.max_uses then
    return json_build_object('ok', false, 'reason', 'used_up');
  end if;

  insert into public.code_redemptions (code, user_id) values (v_code, auth.uid());
  update public.pro_codes set used_count = used_count + 1 where code = v_code;
  insert into public.entitlements (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  update public.entitlements
     set pro_until = greatest(coalesce(pro_until, now()), now()) + make_interval(days => c.days),
         updated_at = now()
   where user_id = auth.uid()
  returning pro_until into v_until;
  return json_build_object('ok', true, 'pro_until', v_until, 'days', c.days);
end;
$$;

-- 회원 탈퇴: 계정과 모든 기록 삭제 (연결된 표는 on delete cascade)
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.get_entitlement() from public, anon;
revoke all on function public.consume_exp() from public, anon;
revoke all on function public.redeem_code(text) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.get_entitlement() to authenticated;
grant execute on function public.consume_exp() to authenticated;
grant execute on function public.redeem_code(text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- ------------------------------------------------------------
-- 관리자용: 이용권 코드 만들기 (SQL Editor 에서만 실행. 앱에서는 호출 불가)
-- 예) select * from public.create_pro_codes(10, 30, 1, '초기 사용자 이벤트');
--     → 30일짜리 1회용 코드 10개
-- ------------------------------------------------------------
create or replace function public.create_pro_codes(p_count integer, p_days integer, p_max_uses integer default 1, p_note text default null, p_expires_at timestamptz default null)
returns table (code text, days integer, max_uses integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 헷갈리는 0/O/1/I 제외
  v text;
  i integer;
  j integer;
begin
  for i in 1 .. p_count loop
    loop
      v := 'SILBUK-';
      for j in 1 .. 8 loop
        v := v || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
        if j = 4 then v := v || '-'; end if;
      end loop;
      exit when not exists (select 1 from public.pro_codes pc where pc.code = v);
    end loop;
    insert into public.pro_codes (code, days, max_uses, note, expires_at) values (v, p_days, p_max_uses, p_note, p_expires_at);
    code := v;
    days := p_days;
    max_uses := p_max_uses;
    return next;
  end loop;
end;
$$;

revoke all on function public.create_pro_codes(integer, integer, integer, text, timestamptz) from public, anon, authenticated;
