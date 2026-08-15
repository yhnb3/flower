# 花 Planner

Google 로그인과 Turso 동기화를 지원하는 React/Vite 플래너입니다. 할 일·폴더·메모는 로컬에 즉시 캐시되고, 로그인한 사용자별로 Turso에 동기화됩니다.

## Design Method

- StyleSeed lock: `STYLESEED.md`
- Effective rules: `.styleseed/effective-rules.md`
- Rule set: `consumer-service x product-ui x productivity x list x calm-consumer x none`

## Commands

```bash
npm install
npm test
npm run test:e2e
npm run build
```

`npm run test:e2e`는 로컬 플래너 모드의 Vite 서버를 자동으로 실행하고 Playwright 시나리오를 검증합니다.

## 로컬에서 전체 연동 테스트

### 1. Turso DB 생성

```bash
brew install tursodatabase/tap/turso
turso auth signup
turso db create hwa-planner
turso db show hwa-planner --url
turso db tokens create hwa-planner
```

Turso 연결 문서: https://docs.turso.tech/sdk/ts/reference

### 2. Clerk에서 Google 로그인 활성화

1. Clerk에서 앱을 생성합니다.
2. **SSO connections**에서 Google을 활성화합니다.
3. 개발 인스턴스의 Publishable Key와 Secret Key를 복사합니다.

Clerk Vite 문서: https://clerk.com/docs/react/getting-started/quickstart

Clerk Google 연결: https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google

### 3. 환경변수 설정

`.env.local`이 아직 없을 때만 샘플을 복사합니다.

```bash
test -f .env.local || cp .env.example .env.local
```

기존 `.env.local`이 있다면 내용을 덮어쓰지 말고 아래 Clerk/Turso 키만 추가해 주세요.

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
CLERK_AUTHORIZED_PARTIES=http://localhost:3000
```

`CLERK_SECRET_KEY`와 `TURSO_AUTH_TOKEN`에는 `VITE_` 접두어를 붙이지 마세요. `VITE_` 값은 브라우저 번들에 노출됩니다.

### 4. Vite + Vercel Functions 실행

```bash
npm run dev:vercel
```

`http://localhost:3000` 접속 후 Google로 로그인하면 됩니다. `planner_state` 테이블은 첫 API 요청 시 자동으로 생성됩니다.

### 기존 브라우저 데이터 업데이트

로그인한 사용자의 Turso 데이터가 비어 있고 브라우저에 기존 `flower-planner-state` 데이터가 있을 때만 **DB 업데이트** 버튼이 활성화됩니다. 업데이트가 성공하면 기존 키는 `localStorage`에서 삭제되며, 실패하면 다시 시도할 수 있도록 그대로 유지됩니다.

## 외부 서비스 없이 UI만 테스트

```bash
npm run dev:local
```

`http://127.0.0.1:5173` 접속 후 기존 `localStorage` 모드로 폴더·할 일·메모 UI를 테스트할 수 있습니다. 이 모드는 Turso 동기화를 테스트하지 않습니다.

## Vercel 배포 설정

Vercel 프로젝트의 Production/Preview/Development 환경변수에 `.env.example`의 값을 등록합니다.

- `CLERK_AUTHORIZED_PARTIES`에 실제 도메인을 추가합니다.
- Clerk 프로덕션 인스턴스에서 Google OAuth Client ID/Secret을 연결합니다.
- 본인 계정 하나만 허용하려면 첫 로그인 후 Clerk Dashboard의 User ID를 `OWNER_CLERK_USER_ID`로 등록합니다.
- `OWNER_CLERK_USER_ID`를 비워 두면 Google로 로그인한 각 사용자가 자신의 독립된 planner 행을 갖습니다.

API는 요청에서 보낸 user ID를 신뢰하지 않고 Clerk가 검증한 세션의 `userId`만 Turso 키로 사용합니다.
