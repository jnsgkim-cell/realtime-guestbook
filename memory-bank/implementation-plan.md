# Implementation Plan

## Phase 1: Project Setup

1. Next.js, TypeScript, Tailwind CSS 프로젝트를 구성한다.
2. Supabase 클라이언트 설정 파일을 만든다.
3. 환경변수 예시 파일을 추가한다.
4. 기본 라우트 `/`, `/board`를 만든다.

Expected environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=guestbook-media
```

## Phase 2: Database And Storage

1. `guestbook_entries` 테이블을 만든다.
2. `comments` 테이블을 만든다.
3. `guestbook-media` Storage bucket을 만든다.
4. 이미지 업로드 정책과 읽기 정책을 설정한다.
5. Realtime publication에 두 테이블을 포함한다.

Suggested SQL:

```sql
create table guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  message text not null,
  media_url text not null,
  media_type text not null check (media_type in ('photo', 'drawing')),
  created_at timestamptz not null default now(),
  position_x numeric,
  position_y numeric,
  note_color text,
  rotation numeric
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references guestbook_entries(id) on delete cascade,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index comments_entry_id_created_at_idx
  on comments (entry_id, created_at);
```

## Phase 3: Entry Creation Page

1. `EntryForm`을 만든다.
2. 이름과 메시지 입력 필드를 구현한다.
3. `photo`와 `drawing` 모드 전환 UI를 구현한다.
4. `PhotoUploader`에서 이미지 선택, 미리보기, 파일 용량 제한을 구현한다.
5. `DrawingCanvas`에서 펜 색상, 펜 두께, 지우개, 전체 지우기를 구현한다.
6. 제출 시 미디어를 Storage에 업로드한다.
7. 업로드 성공 후 `guestbook_entries`에 레코드를 저장한다.
8. 저장 성공 시 `/board`로 이동한다.

Validation checklist:

- 이름이 비어 있으면 제출 불가
- 메시지가 비어 있으면 제출 불가
- 사진 또는 그림 데이터가 없으면 제출 불가
- 이미지 용량 초과 시 명확한 오류 표시
- 업로드 중 버튼 비활성화
- 저장 중 버튼 비활성화

## Phase 4: Realtime Board

1. `/board` 페이지를 만든다.
2. 초기 방명록 목록을 최신순 또는 생성순으로 조회한다.
3. `PostItBoard`를 구현한다.
4. `PostItCard`에 작성자, 메시지, 이미지 미리보기를 표시한다.
5. 포스트잇 색상, 위치, 회전 값을 적용한다.
6. `guestbook_entries` insert 이벤트를 구독한다.
7. 새 방명록 수신 시 새로고침 없이 보드에 추가한다.
8. 중복 id 방지를 구현한다.

Board layout direction:

- 모바일: 1~2열 반응형 그리드
- 태블릿 이상: 여러 열의 자연스러운 그리드
- 데스크톱: 약한 랜덤 회전과 색상 차이를 둔 포스트잇 벽 느낌

## Phase 5: Detail Modal And Comments

1. 포스트잇 클릭 시 `EntryDetailModal`을 연다.
2. 상세 모달에 큰 이미지, 작성자 이름, 메시지를 표시한다.
3. 해당 방명록의 댓글 목록을 조회한다.
4. `CommentForm`에서 댓글 작성자와 댓글 내용을 입력받는다.
5. 댓글 저장 시 `comments` 테이블에 insert한다.
6. 현재 열린 entry의 댓글 insert 이벤트를 구독한다.
7. 다른 사용자의 댓글이 새로고침 없이 즉시 반영되도록 한다.
8. 모달이 닫히면 댓글 Realtime 구독을 해제한다.

Comment validation checklist:

- 댓글 작성자 이름 필수
- 댓글 내용 필수
- 저장 중 중복 제출 방지
- 저장 실패 시 오류 표시

## Phase 6: Polish And Resilience

1. 포스트잇 등장, 클릭, 모달 열림 애니메이션을 추가한다.
2. 업로드 중, 저장 중, 로딩 중, 빈 상태, 오류 상태 UI를 정리한다.
3. 모바일 입력 경험을 점검한다.
4. 이미지가 너무 큰 경우 안내 문구와 제한을 명확히 한다.
5. Realtime 연결이 끊겼을 때 재조회하거나 상태를 안내한다.
6. 접근성을 위해 버튼 label, modal focus, keyboard close를 처리한다.

## Phase 7: Verification

Manual test cases:

1. 사진 업로드로 방명록을 작성하면 `/board`에 표시된다.
2. 그림 그리기로 방명록을 작성하면 `/board`에 표시된다.
3. 두 브라우저에서 `/board`를 열고 한쪽에서 방명록을 추가하면 다른 쪽에 즉시 나타난다.
4. 포스트잇을 클릭하면 상세 모달이 열린다.
5. 두 브라우저에서 같은 상세 모달을 보고 댓글을 작성하면 양쪽에 즉시 반영된다.
6. 이름, 메시지, 미디어가 비어 있을 때 제출이 막힌다.
7. 이미지 용량 제한을 초과하면 오류가 표시된다.
8. 모바일 화면에서 작성, 그림 그리기, 보드 확인, 댓글 작성이 자연스럽게 동작한다.

Recommended automated checks:

- TypeScript type check
- Lint
- 핵심 validation utility unit test
- Supabase data access function mock test

## Deliverables

- 실행 가능한 Next.js 웹앱 코드
- `.env.example`
- Supabase 테이블 생성 SQL
- Supabase Storage bucket 및 정책 안내
- 로컬 실행 방법
- 주요 컴포넌트 설명

## Open Decisions

- Supabase Row Level Security 정책을 공개 행사장에 맞춰 어느 수준으로 열지 결정해야 한다.
- 이미지 업로드 전 클라이언트 리사이징을 초기 버전에 포함할지 결정해야 한다.
- 포스트잇 위치를 DB에 저장할지, 클라이언트에서 id 기반 deterministic layout으로 계산할지 결정해야 한다.
- 관리자 기능은 초기 버전에서는 제외하되, 데이터 모델과 컴포넌트 구조는 추후 삭제 기능을 추가하기 쉽게 유지한다.

## Progress Update (2026-05-28)

- Phase 1 일부 완료: Next.js + TypeScript + Tailwind 구성 파일 추가.
- Phase 3 UI 선구현: EntryForm, 사진 첨부, DrawingCanvas, 기본 검증, 저장 상태 UI 구현.
- Phase 4/5 UI 프로토타입: `/board` 포스트잇 카드, 상세 모달, 댓글 입력 UI 구현.
- 현재 데이터 영속 및 실시간은 임시 `localStorage` 기반이며, Supabase 연동은 후속 작업으로 남아 있다.
- Phase 3 진행 업데이트: 사진/그림 업로드 경로를 Supabase Storage 기반으로 교체했다.
- `.env.local`의 `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`를 사용하며 현재 기본 버킷명은 `guestbook`이다.
