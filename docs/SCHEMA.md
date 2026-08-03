# 📐 DB 스키마 & RPC 계약 (Contract)

> **이 문서가 FE ↔ BE의 유일한 계약입니다.**
> FE는 이 문서만 보고 mock을 만들고, BE는 이 문서대로 구현합니다.
> 변경이 필요하면 **먼저 이 문서를 고치고 PR에 명시** → 상대에게 공유 후 코드 반영.

- 작성일: 2026-08-03 (Task C-1)
- 상태: 🟡 **FE 초안 — BE 검토/합의 필요**
- 규칙: 모든 금액은 정수(`bigint`), 단위는 Gold. **소수점 없음.**

---

## 0. 핵심 원칙

1. **재화(Gold)와 인형 지급은 클라이언트가 직접 INSERT/UPDATE 하지 않습니다.** 전부 아래 RPC를 통해서만 변경됩니다.
2. `profiles.gold`, `user_dolls` 는 **RLS에서 클라이언트 UPDATE/INSERT를 차단**하고, RPC(`security definer`)만 쓰기 권한을 가집니다.
3. 게임 결과는 **서버가 재검증**합니다. FE가 보낸 획득 목록을 그대로 믿지 않습니다. (§4.2 참고)
4. 모든 테이블은 RLS **기본 차단(deny)** 후 필요한 정책만 허용합니다.

---

## 1. ENUM 타입

```sql
create type doll_size as enum ('small', 'medium', 'large');
create type game_mode as enum ('small', 'medium', 'large');
create type tier_name as enum ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'challenger');
create type session_status as enum ('playing', 'finished', 'aborted');
create type ledger_reason as enum ('signup', 'game_entry', 'doll_sell', 'item_buy', 'transfer_in', 'transfer_out');
```

> 🔎 **BE 확인 필요**: 티어 7단계 구성이 맞는지. README에는 `Bronze → Silver → Gold → ... → Challenger` 로만 표기돼 있어 중간 단계를 임의로 정했습니다.

---

## 2. 테이블

### 2.1 `profiles` — 유저 프로필
| 컬럼 | 타입 | 비고 |
| :--- | :--- | :--- |
| `id` | `uuid` PK | `auth.users.id` 참조 (on delete cascade) |
| `nickname` | `text` unique not null | 송금 시 대상 지정에 사용 |
| `gold` | `bigint` not null default 10000 | **초기 자금 10,000** (REQ-AUTH-02) |
| `created_at` | `timestamptz` default now() | |

- 트리거: `auth.users` INSERT 시 `profiles` 자동 생성 + gold 10000
- RLS: `select` 전체 허용(랭킹/송금 대상 조회용, **gold 제외 뷰 사용 권장**) / `update`는 `nickname`만 본인 허용 / `gold` 컬럼 update **차단**

> 🔎 **BE 확인 필요**: 타 유저의 `gold`가 노출되지 않도록 `public_profiles` 뷰(id, nickname만)를 별도로 만들지 여부.

### 2.2 `dolls` — 인형 마스터 (45종)
| 컬럼 | 타입 | 비고 |
| :--- | :--- | :--- |
| `id` | `int` PK | |
| `name` | `text` not null | |
| `size` | `doll_size` not null | small 30 / medium 10 / large 5 (REQ-COLL-01) |
| `image_path` | `text` not null | Storage 경로 (예: `dolls/small_01.png`) |
| `sell_price` | `int` not null | small 1000 / medium 3000 / large 5000 (REQ-SHOP-01) |
| `drop_weight` | `int` not null default 1 | 획득 가중치 (서버 전용) |

- RLS: `select` 전체 허용 / 쓰기 차단

### 2.3 `user_dolls` — 보유 인형
| 컬럼 | 타입 | 비고 |
| :--- | :--- | :--- |
| `user_id` | `uuid` | PK(user_id, doll_id) |
| `doll_id` | `int` | |
| `count` | `int` not null default 0 | **0 이상 체크 제약** |
| `first_acquired_at` | `timestamptz` | 콜렉터함 정렬용 |

- RLS: 본인 행만 `select` / **쓰기는 RPC 전용**

### 2.4 `game_sessions` — 게임 세션
| 컬럼 | 타입 | 비고 |
| :--- | :--- | :--- |
| `id` | `uuid` PK default gen_random_uuid() | |
| `user_id` | `uuid` not null | |
| `mode` | `game_mode` not null | |
| `cost` | `int` not null | 차감된 입장 비용 (REQ-GAME-02) |
| `score` | `int` not null default 0 | 획득 1개당 +10 (REQ-GAME-01) |
| `status` | `session_status` not null default 'playing' | |
| `started_at` / `finished_at` | `timestamptz` | |

- RLS: 본인 행만 `select` / **쓰기는 RPC 전용**
- **중복 정산 방지**: `finish_game`은 `status = 'playing'` 인 세션만 처리

### 2.5 `tiers` — 티어 기준표
| 컬럼 | 타입 | 비고 |
| :--- | :--- | :--- |
| `tier` | `tier_name` PK | |
| `level` | `int` not null | 정렬용 (bronze=1 … challenger=7) |
| `promote_score` | `int` not null | 승급 기준 점수 (이상) |
| `promote_count` | `int` not null | 승급 조건 달성 필요 횟수 |
| `demote_score` | `int` not null | 강등 기준 점수 (미만) |
| `demote_count` | `int` not null | 강등 조건 달성 필요 횟수 |

- 예시(REQ-RANK-02): silver → `promote_score=30, promote_count=3, demote_score=20, demote_count=4`

### 2.6 `user_ranks` — 유저 티어 현황
| 컬럼 | 타입 | 비고 |
| :--- | :--- | :--- |
| `user_id` | `uuid` | PK(user_id, mode) |
| `mode` | `game_mode` | **large 제외** (REQ-RANK-01) |
| `tier` | `tier_name` not null default 'bronze' | |
| `promote_cnt` / `demote_cnt` | `int` not null default 0 | 승·강등 시 **둘 다 0으로 리셋** |
| `best_score` | `int` not null default 0 | 리더보드 정렬 기준 |
| `updated_at` | `timestamptz` | |

### 2.7 `items` / `user_items` — 버프 아이템 *(P2, 여유 시)*
| `items` 컬럼 | 타입 | 비고 |
| :--- | :--- | :--- |
| `id` / `name` / `price` | `int` / `text` / `int` | |
| `effect_type` | `text` | `claw_power` \| `extra_time` (REQ-SHOP-02) |
| `effect_value` | `int` | 예: `extra_time = 15` (초) |

### 2.8 `gold_ledger` — 거래 원장 *(P2, 감사 추적)*
`id`, `user_id`, `delta`(±), `reason`(`ledger_reason`), `ref_id`, `created_at`

---

## 3. 상수 (FE/BE 양쪽 하드코딩 금지 — 이 표가 기준)

| 항목 | small | medium | large |
| :--- | :-- | :-- | :-- |
| 입장 비용 | 1,000 | 2,000 | 3,000 |
| 판매가 | 1,000 | 3,000 | 5,000 |
| 인형 종류 수 | 30 | 10 | 5 |
| 제한 시간 | 60초 | 60초 | 타이밍 1회 |

- 획득 점수: **인형 1개당 +10점**
- 신규 가입 지급: **10,000 Gold**

---

## 4. RPC 계약

> 모든 RPC는 `security definer`. 실패 시 PostgreSQL 예외를 던지고, FE는 `error.message`의 코드로 분기합니다.

### 공통 에러 코드
| 코드 | 의미 | FE 처리 |
| :--- | :--- | :--- |
| `INSUFFICIENT_GOLD` | 잔액 부족 | "골드가 부족합니다" 토스트 |
| `SESSION_NOT_FOUND` | 세션 없음/이미 종료 | 결과 화면 없이 로비 복귀 |
| `INVALID_TARGET` | 송금 대상 없음 / 자기 자신 | 입력 필드 에러 |
| `INVALID_AMOUNT` | 0 이하 금액 | 입력 필드 에러 |
| `NOT_ENOUGH_DOLLS` | 보유 인형 부족 | "보유 수량이 부족합니다" |

### 4.1 `start_game(p_mode game_mode)` → `json`
입장 비용 검증 및 차감 후 세션을 발급합니다.
```jsonc
// 성공 응답
{ "session_id": "uuid", "mode": "small", "cost": 1000, "gold_after": 9000 }
```
- 실패: `INSUFFICIENT_GOLD`
- **차감과 세션 생성은 하나의 트랜잭션**

### 4.2 `finish_game(p_session_id uuid, p_caught int)` → `json`
FE는 **획득 인형 목록이 아니라 "획득 개수"만** 보냅니다. 어떤 인형이 나올지는 **서버가 `drop_weight` 기반으로 추첨**합니다. (클라 조작 방어)
```jsonc
// 요청: p_caught = 3   (60초 동안 3개 성공)
// 성공 응답
{
  "score": 30,
  "dolls": [ { "id": 12, "name": "곰돌이", "size": "small", "image_path": "dolls/small_12.png", "is_new": true } ],
  "rank": { "mode": "small", "before": "bronze", "after": "silver", "changed": "promote" }
}
```
- `p_caught` 상한 검증: small/medium ≤ 10, large ≤ 1 → 초과 시 예외
- `status='playing'` 세션만 처리 → 처리 후 `finished`로 변경 (중복 정산 차단)
- 점수 산출 · 인형 지급 · 승강등 판정이 **하나의 트랜잭션**

> 🔎 **BE 확인 필요**: `p_caught` 상한값. 소형 60초에 현실적으로 몇 개까지 가능한지 게임 튜닝 후 확정.

### 4.3 `get_collection()` → `json[]`
콜렉터함 조회. **미보유 인형도 전부 포함**해서 반환합니다 (마스킹 렌더링용, REQ-COLL-02).
```jsonc
[ { "id": 1, "name": "토끼", "size": "small", "image_path": "dolls/small_01.png", "count": 2, "owned": true },
  { "id": 2, "name": "펭귄", "size": "small", "image_path": "dolls/small_02.png", "count": 0, "owned": false } ]
```

### 4.4 `sell_doll(p_doll_id int, p_count int)` → `json`
```jsonc
{ "sold": 2, "earned": 2000, "gold_after": 11000, "remain": 0 }
```
- 실패: `NOT_ENOUGH_DOLLS`, `INVALID_AMOUNT`

### 4.5 `transfer_gold(p_to_nickname text, p_amount bigint)` → `json`
```jsonc
{ "to": "친구닉네임", "amount": 500, "gold_after": 9500 }
```
- 실패: `INVALID_TARGET`(대상 없음/자기 자신), `INVALID_AMOUNT`(≤0), `INSUFFICIENT_GOLD`
- 출금·입금 **원자적 처리**

### 4.6 `get_leaderboard(p_mode game_mode, p_limit int default 20)` → `json`
```jsonc
{
  "top": [ { "rank": 1, "nickname": "고수", "tier": "challenger", "best_score": 120 } ],
  "me":  { "rank": 57, "nickname": "나", "tier": "silver", "best_score": 40 }
}
```
- `p_mode`는 `small` | `medium`만 허용 (REQ-RANK-01)

### 4.7 `buy_item(p_item_id int)` → `json` *(P2)*
```jsonc
{ "item_id": 1, "gold_after": 8500 }
```

---

## 5. Realtime 구독

| 대상 | 용도 | 참조 |
| :--- | :--- | :--- |
| `profiles` (본인 행 UPDATE) | 로비 우측 상단 **Gold 실시간 반영** | REQ-LOBBY-01 |

- BE: 해당 테이블에 `replica identity` 및 publication 설정 필요

---

## 6. Storage

- 버킷: `assets` (public read)
- 경로: `dolls/{size}_{번호}.png` (예: `dolls/small_01.png`, `dolls/large_05.png`)
- FE는 `image_path`를 받아 `supabase.storage.from('assets').getPublicUrl(path)`로 렌더링

---

## 7. 미확정 항목 (Meeting 2에서 결정)

- [ ] 티어 중간 단계 구성 (7단계안 확정 여부)
- [ ] `public_profiles` 뷰 도입 여부 (타 유저 gold 노출 차단)
- [ ] `p_caught` 모드별 상한값
- [ ] 이메일 인증(confirm) 활성화 여부 — **데모 편의상 비활성 권장**
- [ ] 인형 45종 이름/이미지 에셋 최종본
