# Supabase 백엔드 빠른 적용 가이드

최신 `docs/SCHEMA.md`, `src/lib/api.ts`, `src/types/api.ts`, `src/mocks/dolls.ts` 계약에 맞춘 백엔드입니다.

## 이번 제출 버전에 포함된 범위

- 이메일/비밀번호 회원가입·로그인
- 가입 시 `profiles` 생성 및 10,000 Gold 지급
- 인형 45종 마스터 데이터
- 보유 인형과 콜렉터함
- Gold 직접 수정 차단 RLS
- `start_game`, `finish_game`
- 인형 판매, Gold 송금
- 소형/중형 티어와 랭킹
- Gold 거래 원장
- Gold Realtime 구독

이번 일정에서 제외한 범위:

- 실시간 2인 매칭
- 버프 아이템 구매
- 실제 인형 이미지 업로드

이미지가 없으면 기존 React 코드가 이모지로 자동 대체하므로 게임 기능에는 문제가 없습니다.

---

## 1. Supabase Auth 설정

Supabase Dashboard에서 다음 메뉴로 이동합니다.

```text
Authentication → Sign In / Providers → Email
```

- Email provider: **ON**
- Confirm email: **OFF**

제출·테스트 중 회원가입 직후 바로 로그인하기 위한 설정입니다.

---

## 2. SQL 한 번 실행

다음 파일 전체를 복사합니다.

```text
supabase/migrations/202608060001_complete_backend.sql
supabase/migrations/202608070001_game_items.sql
```

Supabase Dashboard에서:

```text
SQL Editor → New query → 붙여넣기 → Run
```

두 파일은 **위 순서대로 따로** 실행합니다. 이미 `202608060001`을 돌린 프로젝트라면
`202608070001_game_items.sql`만 추가로 실행하면 됩니다 (기존 데이터는 건드리지 않습니다).

각 파일은 새 프로젝트에 **한 번만** 실행합니다. 중간에 오류가 나면 명시적 트랜잭션이 롤백되므로 오류를 수정한 뒤 다시 실행할 수 있습니다.

성공 후 `Table Editor`에서 다음 테이블을 확인합니다.

```text
profiles
dolls
user_dolls
game_sessions
tiers
user_ranks
gold_ledger
```

`dolls` 행 수는 45개여야 합니다.

---

## 3. GitHub Actions Secrets 등록

프런트 저장소에서:

```text
Settings → Secrets and variables → Actions → New repository secret
```

등록할 값:

```text
VITE_SUPABASE_URL
```

값:

```text
https://mcfhuyupokawlnakoiif.supabase.co
```

그리고:

```text
VITE_SUPABASE_ANON_KEY
```

값은 Supabase Dashboard의 `Connect` 또는 `Project Settings → API Keys`에 표시되는 **Publishable key**입니다.

절대 등록하거나 소스에 넣지 말아야 할 값:

- Secret key
- `service_role` key
- Database password
- Supabase Access Token

현재 `.github/workflows/deploy.yml`은 `main`에 머지되면 GitHub 서버에서 `npm ci`와 `npm run build`를 실행하고 `dist/`만 Pages에 배포합니다. `supabase/` SQL 파일은 Pages 산출물에 포함되지 않습니다.

---

## 4. 브랜치와 PR

기존 저장소에서 PowerShell 또는 VS Code 터미널로 실행합니다.

```powershell
git switch main
git pull origin main
git switch -c feat/supabase-backend

git add supabase SUPABASE_QUICKSTART.md docs/SCHEMA.md TASKS.md
git commit -m "feat: add Supabase backend"
git push -u origin feat/supabase-backend
```

GitHub에서 `feat/supabase-backend → main` PR을 생성하고 파트너 확인 후 머지합니다.

로컬에서 React를 실행하지 않을 경우 Node/npm 설치는 필수가 아닙니다. GitHub Actions가 빌드합니다.

---

## 5. 배포 후 최소 테스트

GitHub Pages 게임에서 다음 순서만 확인합니다.

1. 새 계정 회원가입
2. 로비에서 10,000 Gold 확인
3. 소형 게임 입장 후 9,000 Gold 확인
4. 게임 종료 후 인형 획득 확인
5. 콜렉터함에서 획득 인형 확인
6. 인형 판매 후 Gold 증가 확인
7. 계정 2개로 송금 확인
8. 소형/중형 랭킹 확인

Supabase Dashboard에서도 확인합니다.

```text
Authentication → Users
auth 계정 생성 확인

Table Editor → profiles
gold = 10000 확인

Table Editor → game_sessions
playing → finished 확인

Table Editor → user_dolls
획득 수량 확인
```

---

## 6. 시연용 게임 마스터 계정 (선택)

먼저 Dashboard에서 사용자를 직접 만듭니다.

```text
Authentication → Users → Add user
```

README에 적힌 시연 이메일을 사용할 경우 계정을 만든 다음 아래 파일을 SQL Editor에서 실행합니다.

```text
supabase/seed_master_account.sql
```

이 스크립트는 비밀번호를 만들거나 저장하지 않고, 이미 생성된 계정의 Gold·인형·티어만 시연 상태로 채웁니다.

---

## 7. 오류가 날 때 확인할 곳

- SQL 오류: Supabase SQL Editor 오류 전문
- 빌드 오류: GitHub `Actions`의 실패 단계 로그
- 게임 오류: 브라우저 개발자 도구 `Console`과 `Network`

오류 메시지를 줄이지 말고 그대로 공유해야 빠르게 수정할 수 있습니다.
