# ✅ Task List — 웹 인형뽑기 게임

2인 협업 기준 작업 목록입니다. **위에서 아래 순서대로** 진행합니다.

| 담당 | 역할 | 범위 |
| :--- | :--- | :--- |
| **FE** (@MinZLIM) | 프론트엔드 | Vite + 게임 로직 + UI + GitHub Pages 배포 |
| **BE** | 백엔드 | Supabase (DB / Auth / RLS / RPC / Storage) |

- 기술 스택: `Vite` + `TypeScript` + `Supabase JS Client` / `Supabase (PostgreSQL)`
- 브랜치 전략: `main`(배포) ← `develop` ← `feat/*`
- Gold 증감 등 **재화 관련 연산은 전부 BE RPC(서버)에서 처리**합니다. (클라이언트 조작 방지)

---

## Phase 0. 프로젝트 셋업 (공통 · 1일차)

> 이 단계가 끝나야 FE/BE 병렬 작업이 가능합니다. 가장 먼저 처리합니다.

| # | Task | 담당 | 산출물 |
| :-- | :--- | :--- | :--- |
| 0-1 | 리포지토리 브랜치 전략 / 이슈 템플릿 / PR 룰 확정 | 공통 | `.github/` |
| 0-2 | **API·DB 스키마 계약(Contract) 합의** — 테이블·컬럼·RPC 시그니처 문서화 | 공통 | `docs/SCHEMA.md` |
| 0-3 | Supabase 프로젝트 생성 및 URL / anon key 공유 | BE | `.env.example` |
| 0-4 | Vite 프로젝트 초기화 (TS, ESLint, Prettier) | FE | `package.json` |
| 0-5 | `.env` 규약 정의 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) | 공통 | `.env.example` |
| 0-6 | GitHub Pages 배포 파이프라인 선구축 (빈 화면이라도 배포 성공 확인) | FE | `.github/workflows/deploy.yml` |

---

## Phase 1. 인증 & 기본 골격 (2~3일차)

### 🎨 FE
| # | Task | 참조 요구사항 |
| :-- | :--- | :--- |
| F1-1 | 라우팅 구성 (`/login`, `/lobby`, `/collection`, `/game`, `/rank`, `/shop`) | — |
| F1-2 | 전역 상태 스토어 설계 (user, gold, session) | — |
| F1-3 | Supabase 클라이언트 초기화 모듈 (`src/lib/supabase.ts`) | — |
| F1-4 | 로그인 / 회원가입 화면 및 폼 검증 | REQ-AUTH-01 |
| F1-5 | 세션 유지 / 로그아웃 / 라우트 가드 (미로그인 시 `/login` 리다이렉트) | REQ-AUTH-01 |
| F1-6 | 공통 UI 컴포넌트 (Button, Modal, Toast, Loading) | — |

### 🗄 BE
| # | Task | 참조 요구사항 |
| :-- | :--- | :--- |
| B1-1 | Supabase Auth 설정 (Email/Password, 이메일 인증 정책 결정) | REQ-AUTH-01 |
| B1-2 | `profiles` 테이블 설계 (user_id, nickname, gold, created_at) | REQ-AUTH-02 |
| B1-3 | 신규 가입 트리거 — `profiles` 자동 생성 + **초기 10,000 Gold 지급** | REQ-AUTH-02 |
| B1-4 | RLS 정책 기본 세팅 (본인 행만 read/update, gold 직접 update 차단) | — |
| B1-5 | 마이그레이션 SQL 파일로 버전 관리 (`supabase/migrations/`) | — |

---

## Phase 2. 로비 & 콜렉터함 (4~5일차)

### 🎨 FE
| # | Task | 참조 요구사항 |
| :-- | :--- | :--- |
| F2-1 | 메인 로비 레이아웃 + 우측 상단 보유 Gold 실시간 표시 | REQ-LOBBY-01 |
| F2-2 | 5개 메뉴 내비게이션 (실시간 매칭은 `준비 중` 비활성 처리) | REQ-LOBBY-02 |
| F2-3 | 인형 45종 에셋 정리 (소형 30 / 중형 10 / 대형 5) | REQ-COLL-01 |
| F2-4 | 콜렉터함 그리드 UI — 미획득 인형 마스킹(실루엣) 처리 | REQ-COLL-02 |
| F2-5 | 카테고리 필터 (`ALL` / 소형 / 중형 / 대형) | REQ-COLL-03 |
| F2-6 | 수집률 진행바 (n / 45) | REQ-COLL-02 |

### 🗄 BE
| # | Task | 참조 요구사항 |
| :-- | :--- | :--- |
| B2-1 | `dolls` 마스터 테이블 (id, name, size, image_path, sell_price) + 45종 시드 | REQ-COLL-01 |
| B2-2 | `user_dolls` 보유 테이블 (user_id, doll_id, count, acquired_at) | REQ-COLL-02 |
| B2-3 | Storage 버킷 생성 및 인형 이미지 업로드 / public URL 정책 | REQ-COLL-02 |
| B2-4 | 보유 재화 실시간 반영 — `profiles.gold` Realtime 구독 활성화 | REQ-LOBBY-01 |
| B2-5 | 콜렉터함 조회 뷰/RPC (`get_collection(user_id)`) | REQ-COLL-03 |

---

## Phase 3. 게임 코어 (6~9일차 · 최우선 기능)

### 🎨 FE
| # | Task | 참조 요구사항 |
| :-- | :--- | :--- |
| F3-1 | 게임 공용 프레임 (입장 비용 차감 확인 모달 → 게임 시작 → 결과 정산) | REQ-GAME-02 |
| F3-2 | **소형**: 집게 좌우/전후 조작, 인형 파지 → 구멍 낙하 판정, 60초 타임어택 | REQ-GAME-02 |
| F3-3 | **중형**: 회전 집게 + 버튼 클릭 시 상단 바 하강 낙하 판정, 60초 타임어택 | REQ-GAME-02 |
| F3-4 | **대형**: 1.00초~20.00초 타이머, 20.00초 정타 시 박스 오픈 (1회성) | REQ-GAME-02 |
| F3-5 | 물리/충돌 처리 및 난이도(하/중/상) 파라미터 튜닝 | REQ-GAME-02 |
| F3-6 | 획득 인형당 +10점 스코어 UI + 결과 화면 (획득 목록 / 최종 점수) | REQ-GAME-01 |
| F3-7 | 게임 결과 서버 제출 및 실패/네트워크 오류 처리 | — |

### 🗄 BE
| # | Task | 참조 요구사항 |
| :-- | :--- | :--- |
| B3-1 | `game_sessions` 테이블 (mode, cost, score, played_at, result) | REQ-GAME-01 |
| B3-2 | RPC `start_game(mode)` — 잔액 검증 후 입장 비용 차감 & 세션 발급 | REQ-GAME-02 |
| B3-3 | RPC `finish_game(session_id, dolls[])` — 점수 산출(+10/개) & 인형 지급 | REQ-GAME-01 |
| B3-4 | 인형 획득 확률 테이블 / 서버 측 검증 로직 (클라 조작 방어) | — |
| B3-5 | 트랜잭션 처리 — 차감·지급 원자성 보장 | — |

---

## Phase 4. 랭킹 & 티어 (10~11일차)

### 🎨 FE
| # | Task | 참조 요구사항 |
| :-- | :--- | :--- |
| F4-1 | 랭킹 화면 + 좌측 상단 모드 드롭다운 (소형 / 중형, 대형 제외) | REQ-RANK-01 |
| F4-2 | 우측 상단 본인 티어 / 순위 카드 | REQ-RANK-03 |
| F4-3 | Challenger 리더보드 테이블 | REQ-RANK-03 |
| F4-4 | 티어 분포 / 점수 추이 차트 시각화 | REQ-RANK-03 |
| F4-5 | 승급·강등 연출 (게임 결과 직후 알림 모달) | REQ-RANK-02 |

### 🗄 BE
| # | Task | 참조 요구사항 |
| :-- | :--- | :--- |
| B4-1 | `tiers` 기준 테이블 (티어별 승급/강등 점수·필요 횟수) — Bronze~Challenger | REQ-RANK-02 |
| B4-2 | `user_ranks` 테이블 (user_id, mode, tier, promote_cnt, demote_cnt) | REQ-RANK-02 |
| B4-3 | 승/강등 판정 로직 — `finish_game`에 연동 (조건 선착 달성 시 즉시 반영) | REQ-RANK-02 |
| B4-4 | 리더보드 조회 RPC (모드별 상위 N명, 본인 순위 포함) | REQ-RANK-01 / 03 |
| B4-5 | 랭킹 조회 성능 — 인덱스 및 필요 시 머티리얼라이즈드 뷰 | — |

---

## Phase 5. 상점 & 송금 (12~13일차)

### 🎨 FE
| # | Task | 참조 요구사항 |
| :-- | :--- | :--- |
| F5-1 | 상점 화면 탭 구성 (인형 판매 / 아이템 구매 / 송금) | REQ-SHOP-01~03 |
| F5-2 | 보유 인형 판매 UI (소형 1,000 / 중형 3,000 / 대형 5,000 Gold) | REQ-SHOP-01 |
| F5-3 | 아이템 구매 UI (집게 압력 강화권, 타임 추가권 등) | REQ-SHOP-02 |
| F5-4 | 구매 아이템 게임 내 적용 (집게 파워 / 제한 시간 보정) | REQ-SHOP-02 |
| F5-5 | 송금 UI — 대상 ID 검색 → 금액 입력 → 확인 모달 | REQ-SHOP-03 |

### 🗄 BE
| # | Task | 참조 요구사항 |
| :-- | :--- | :--- |
| B5-1 | RPC `sell_doll(doll_id, count)` — 보유 검증 후 Gold 환전 | REQ-SHOP-01 |
| B5-2 | `items` / `user_items` 테이블 및 효과 정의 스키마 | REQ-SHOP-02 |
| B5-3 | RPC `buy_item(item_id)` — 잔액 검증 후 구매 처리 | REQ-SHOP-02 |
| B5-4 | RPC `transfer_gold(to_user, amount)` — 원자적 이체, 음수/자기송금 차단 | REQ-SHOP-03 |
| B5-5 | `gold_ledger` 거래 내역 테이블 (감사 추적용) | REQ-SHOP-03 |

---

## Phase 6. 마감 & 배포 (14일차)

| # | Task | 담당 |
| :-- | :--- | :--- |
| 6-1 | GitHub Pages 프로덕션 배포 확정 (`base` 경로, SPA 404 fallback 처리) | FE |
| 6-2 | 반응형 / 크로스 브라우저 점검 | FE |
| 6-3 | 로딩·에러 상태 및 에셋 최적화(이미지 압축, 번들 사이즈) | FE |
| 6-4 | RLS 정책 최종 점검 — 모든 테이블 기본 차단 확인 | BE |
| 6-5 | anon key 노출 범위 점검 / service_role key 미노출 확인 | BE |
| 6-6 | 시드 데이터 및 마이그레이션 재현성 검증 (신규 환경에서 1회 실행) | BE |
| 6-7 | 통합 QA — 가입 → 게임 → 수집 → 판매 → 송금 → 랭킹 전 시나리오 | 공통 |
| 6-8 | README 사용법 / 데모 링크 갱신 | 공통 |

---

## Phase 7. 실시간 매칭 (Backlog · 최하위 우선순위)

> Core 싱글 플레이 완성 이후 착수합니다.

| # | Task | 담당 | 참조 요구사항 |
| :-- | :--- | :--- | :--- |
| 7-1 | 매칭 큐 / 룸 스키마 및 Realtime 채널 설계 | BE | REQ-MULTI-01 |
| 7-2 | 협동 모드 — 역할 분담(A: 스틱 / B: 버튼), 성공 시 양쪽 지급 | 공통 | REQ-MULTI-01 |
| 7-3 | 협동 모드 입장 비용 처리 (소형 2,000 / 중형 4,000 Gold) | BE | REQ-MULTI-01 |
| 7-4 | PVP — 동일 티어 매칭 로직 | BE | REQ-MULTI-02 |
| 7-5 | PVP — 화면 2분할 실시간 렌더링 및 상태 동기화 | FE | REQ-MULTI-02 |

---

## 🔗 협업 규칙

1. **Phase 0-2(스키마 계약)를 반드시 먼저 합의**합니다. 이후 FE는 계약 기반 목(mock) 데이터로 선행 개발이 가능합니다.
2. BE는 각 Phase 시작 시 해당 테이블/RPC를 FE보다 먼저 배포합니다.
3. 스키마 변경 시 `docs/SCHEMA.md` 갱신 + PR에 변경 내용을 명시합니다.
4. 재화(Gold) 관련 로직은 예외 없이 서버 RPC에서만 변경합니다.
5. PR은 상대방 리뷰 후 머지합니다.
