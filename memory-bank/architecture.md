# Architecture

## Product Summary

실시간 전자 방명록 웹앱은 방문자가 행사장에서 모바일 중심으로 빠르게 방명록을 작성하고, 다른 방문자의 방명록을 포스트잇 보드에서 실시간으로 확인하는 애플리케이션이다. 방명록은 사진 업로드 또는 HTML Canvas 그림 데이터 중 하나를 포함한다.

## Recommended Stack

- Framework: Next.js
- Language: TypeScript
- Styling: Tailwind CSS
- Realtime backend: Supabase
- Database: Supabase Postgres
- File storage: Supabase Storage
- Drawing: HTML Canvas
- Routing:
  - `/`: 방명록 작성 페이지
  - `/board`: 실시간 포스트잇 보드 페이지

Supabase를 기본 선택지로 둔다. 이유는 Postgres 테이블, Storage, Realtime 구독을 한 서비스에서 제공하므로 방명록 데이터와 이미지 파일, 댓글 실시간 반영을 단순한 구조로 구현할 수 있기 때문이다.

## High-Level Flow

1. 사용자는 `/`에서 이름, 메시지를 입력한다.
2. 사용자는 `photo` 또는 `drawing`을 선택한다.
3. `photo` 선택 시 이미지 파일을 Supabase Storage에 업로드한다.
4. `drawing` 선택 시 Canvas 결과를 이미지 Blob 또는 Data URL로 변환한 뒤 Storage에 업로드한다.
5. 업로드된 이미지 URL과 입력 정보를 `guestbook_entries` 테이블에 저장한다.
6. 저장 성공 후 `/board`로 이동한다.
7. `/board`는 기존 방명록 목록을 불러오고, `guestbook_entries` Realtime 구독으로 새 방명록을 즉시 반영한다.
8. 포스트잇 클릭 시 상세 모달을 열고 해당 방명록의 댓글을 불러온다.
9. 상세 모달은 `comments` Realtime 구독으로 댓글 추가를 즉시 반영한다.

## Data Model

### `guestbook_entries`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key, default generated UUID |
| `author_name` | text | 작성자 이름 또는 닉네임 |
| `message` | text | 짧은 방명록 메시지 |
| `media_url` | text | 사진 또는 그림 이미지 URL |
| `media_type` | text | `photo` 또는 `drawing` |
| `created_at` | timestamptz | 생성 시간 |
| `position_x` | numeric nullable | 랜덤 배치를 위한 x 좌표 |
| `position_y` | numeric nullable | 랜덤 배치를 위한 y 좌표 |
| `note_color` | text nullable | 포스트잇 색상 |
| `rotation` | numeric nullable | 포스트잇 회전 각도 |

Recommended constraints:

- `author_name` is not null and not empty after trim.
- `message` is not null and not empty after trim.
- `media_url` is not null.
- `media_type` is one of `photo`, `drawing`.

### `comments`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key, default generated UUID |
| `entry_id` | uuid | References `guestbook_entries.id` |
| `author_name` | text | 댓글 작성자 이름 |
| `content` | text | 댓글 내용 |
| `created_at` | timestamptz | 생성 시간 |

Recommended constraints:

- `entry_id` references `guestbook_entries(id)` with cascade delete.
- `author_name` is not null and not empty after trim.
- `content` is not null and not empty after trim.

## Storage Model

Recommended Supabase Storage bucket:

- Bucket name: `guestbook-media`
- Accepted files: common image formats such as JPEG, PNG, WebP
- Suggested max size: 5 MB per upload
- Path pattern:
  - `entries/{entryId or tempId}/{timestamp}-{safeFilename}`
  - `drawings/{entryId or tempId}/{timestamp}.png`

Canvas drawings should be exported as PNG or WebP and uploaded through the same Storage abstraction used by photo uploads.

## Frontend Structure

Suggested folders:

```text
src/
  app/
    page.tsx
    board/
      page.tsx
  components/
    guestbook/
      EntryForm.tsx
      MediaModeTabs.tsx
      PhotoUploader.tsx
      DrawingCanvas.tsx
      SubmitStatus.tsx
    board/
      PostItBoard.tsx
      PostItCard.tsx
      EntryDetailModal.tsx
      CommentList.tsx
      CommentForm.tsx
  lib/
    supabase/
      client.ts
      entries.ts
      comments.ts
      storage.ts
    validation.ts
    postit.ts
  types/
    guestbook.ts
```

## Component Responsibilities

- `EntryForm`: 작성 페이지의 전체 폼 상태, 유효성 검사, 제출 흐름 관리
- `MediaModeTabs`: 사진 업로드와 그림 그리기 모드 전환
- `PhotoUploader`: 이미지 선택, 용량 및 타입 검증, 미리보기
- `DrawingCanvas`: 펜 색상, 펜 두께, 지우개, 전체 지우기, 이미지 export
- `PostItBoard`: 방명록 목록 로딩, Realtime 구독, 보드 레이아웃 관리
- `PostItCard`: 단일 포스트잇 표시, 애니메이션, 상세 열기
- `EntryDetailModal`: 큰 이미지, 작성자, 메시지, 댓글 영역 표시
- `CommentForm`: 댓글 입력, 검증, 저장
- `CommentList`: 댓글 목록 및 Realtime 변경 반영

## Realtime Strategy

- 첫 로딩에서는 서버 데이터를 기준으로 목록을 가져온다.
- 이후 Supabase Realtime insert 이벤트를 구독한다.
- optimistic update를 사용할 경우, 서버 응답 id와 매칭해 중복 삽입을 방지한다.
- Realtime 이벤트 수신 시 이미 존재하는 id는 무시한다.
- 모달 댓글 구독은 현재 열린 `entry_id`에만 제한한다.
- 모달이 닫히면 댓글 구독을 해제한다.

## Validation And Error Handling

- 이름, 메시지, 미디어는 필수다.
- 메시지는 짧은 방명록 목적에 맞게 길이 제한을 둔다.
- 이미지는 파일 타입과 용량을 검증한다.
- 저장 버튼은 업로드 또는 저장 중 중복 클릭을 방지한다.
- 업로드 실패와 DB 저장 실패를 분리해 사용자에게 명확히 보여준다.

## UX Direction

- 첫 화면은 모바일에서 한 손으로 작성하기 쉬운 단순한 폼을 우선한다.
- 보드는 실제 벽에 포스트잇이 붙은 듯한 따뜻한 아날로그 감성을 준다.
- 포스트잇은 부드러운 등장 애니메이션과 약한 회전 값을 사용한다.
- 상세 모달은 이미지가 크게 보이고 댓글 작성이 즉시 가능한 구조로 만든다.
- 데스크톱은 더 많은 포스트잇을 한 화면에 보여주고, 모바일은 스크롤 가능한 그리드 중심으로 배치한다.

## Future Extension Points

- 관리자 인증 및 댓글 삭제
- 행사별 board id 또는 event slug
- 이미지 리사이징 및 CDN 캐싱
- 신고 기능
- 운영자용 moderation queue
- QR 코드 진입 페이지

## Implementation Update (2026-05-28)

- 초기 UI 골격은 Next.js App Router + Tailwind CSS로 구현했다.
- 현재 데모 단계에서는 Supabase 연동 전이라 `localStorage`를 임시 데이터 소스로 사용한다.
- `/` 경로에서 이름/메시지/미디어 검증, 사진 업로드 미리보기, 캔버스 드로잉 UI를 제공한다.
- `/board` 경로에서 포스트잇 그리드와 상세 모달, 댓글 입력 UI를 제공한다.
- 다음 단계에서 `localStorage`를 `lib/supabase/*` 데이터 접근 계층으로 교체할 계획이다.
- 미디어 저장 흐름을 Supabase Storage 업로드 기반으로 변경했고, `media_url`에는 Storage public URL을 저장한다.
- 사진은 원본 파일로 업로드하고, 캔버스 그림은 data URL을 PNG File로 변환해 업로드한다.
