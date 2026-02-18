# Preacher / Pulpit -- Implementation Plan

## Project Overview

**Preacher / Pulpit** is an open-source, self-hosted alternative to PushCut for sending rich push notifications to iOS devices and triggering automations remotely.

| Component | Name | Technology | Description |
|-----------|------|------------|-------------|
| Server | **Pulpit** | Electron + Express + React | Cross-platform server with REST API, APNs integration, WebSocket, and management dashboard |
| iOS Client | **Preacher** | SwiftUI | Receives push notifications, handles action buttons, WebSocket client, automation server mode |

**License**: Apache-2.0

---

## Architecture

```
External Services          Pulpit Server (Electron)         iOS Device
(cURL, IFTTT, etc.)        +---------------------+         +-----------------+
       |                   | Express REST API     |  APNs   | Preacher App    |
       +-- HTTP POST ----->| SQLite Database      |-------->| Push Notifs     |
                           | APNs Service (p8)    |         | Action Buttons  |
                           | WebSocket Server     |<------->| WebSocket Client|
                           | Scheduler            |         | Shortcut Runner |
                           | React Dashboard      |         | Automation Mode |
                           +---------------------+         +-----------------+
```

**Notification flow**: API request -> validate + store -> send via APNs (push) + WebSocket (real-time)
**Automation flow**: API request -> WebSocket command to iOS -> run Shortcut -> report result back

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| APNs auth | p8 token-based | Never expires, simpler than p12, works for all environments |
| APNs library | `apns2` | Modern HTTP/2, TypeScript, JWT-based |
| Database | better-sqlite3 (raw SQL) | Synchronous, fast, zero-config, repo pattern for abstraction |
| Electron tooling | Electron Forge + Vite | Official recommendation, HMR in dev |
| Server framework | Express v5 | Mature, async support, middleware ecosystem |
| Dashboard | React 19 + TailwindCSS v4 | Best Electron integration, modern styling |
| Validation | Zod | TypeScript-native schemas, clear error messages |
| iOS WebSocket | URLSessionWebSocketTask | Native, no dependencies, stable since iOS 13 |
| iOS min target | iOS 17 | Required for ContentUnavailableView, App Intents enhancements |
| iOS Shortcuts | shortcuts:// URL scheme + x-callback-url | Only way to run Shortcuts programmatically |

---

## Monorepo Structure

```
ios-preacher/
  package.json                # npm workspaces root
  tsconfig.base.json
  LICENSE                     # Apache-2.0
  PLAN.md                     # This file
  .gitignore
  .editorconfig
  server/                     # Pulpit -- Electron app
    package.json
    tsconfig.json
    forge.config.ts           # Electron Forge config
    forge.env.d.ts
    index.html
    vite.main.config.ts
    vite.preload.config.ts
    vite.renderer.config.ts
    src/
      main.ts                 # Electron entry, creates window + starts server
      preload.ts              # contextBridge: electronAPI
      renderer.tsx            # React mount point
      index.css               # TailwindCSS v4 theme
      main/
        server.ts             # Express server bootstrap (port 26547)
        ipc.ts                # IPC handlers (file dialogs, status, etc.)
      api/
        router.ts             # Top-level Express router
        middleware/
          auth.ts             # API key Bearer token auth (SHA-256)
          error-handler.ts    # Zod + general error middleware
        routes/
          health.ts           # GET /api/v1/health
          devices.ts          # CRUD /api/v1/devices
          api-keys.ts         # CRUD /api/v1/api-keys
          notifications.ts    # Send + template CRUD /api/v1/notifications
          actions.ts          # CRUD /api/v1/actions
          execute.ts          # POST /api/v1/execute
          log.ts              # GET /api/v1/log (paginated)
          config.ts           # APNs config + test
        validators/
          notification.ts     # Zod schemas for notification payloads
          device.ts           # Zod schemas for device registration
      db/
        index.ts              # better-sqlite3 setup (WAL mode, foreign keys)
        migrations/
          001_initial.ts      # 7 tables: devices, api_keys, notification_definitions, notification_log, server_actions, scheduled_tasks, apns_config
        repositories/
          device.repo.ts
          api-key.repo.ts
          notification.repo.ts
          action.repo.ts
          scheduled-task.repo.ts
      services/
        apns.service.ts       # APNs client (p8 token auth, send/sendSilent)
        notification.service.ts  # Template resolution, scheduling, dual-delivery
        websocket.service.ts  # WebSocket server (/ws), auth, ping/pong, execute dispatch
        action.service.ts     # WebSocket-first execution with APNs fallback + webhooks
        scheduler.service.ts  # node-cron polling scheduled_tasks every 10s
        logger.ts             # Winston logging
      renderer/
        App.tsx               # HashRouter, setup check, route definitions
        types.d.ts            # Window.electronAPI type declarations
        hooks/
          useApi.ts           # apiFetch<T>() with Bearer auth, useApiQuery<T>()
        components/
          Layout.tsx          # Flex layout with sidebar + main content
          Sidebar.tsx         # NavLink sidebar with SVG icons
          SetupWizard.tsx     # 4-step first-run wizard
          Dashboard.tsx       # Stats cards, quick-send, recent log
          DeviceList.tsx      # Device table with actions
          NotificationComposer.tsx  # Template CRUD + send
          ApiKeyManager.tsx   # Key lifecycle management
          ActionManager.tsx   # Server action CRUD + test
          Settings.tsx        # Server info, APNs config, iOS setup
      shared/
        types.ts              # All TypeScript interfaces
        constants.ts          # APP_NAME, APP_VERSION, DEFAULT_PORT
  ios/                        # Preacher -- SwiftUI app
    Preacher/
      Preacher.xcodeproj/
      Preacher/
        PreacherApp.swift     # @main entry with UIApplicationDelegateAdaptor
        AppDelegate.swift     # APNs registration + UNUserNotificationCenterDelegate
        Preacher.entitlements # Push Notifications entitlement
        Assets.xcassets/
        Models/
          Device.swift
          ServerConfig.swift
          Notification.swift
          Action.swift
        Views/
          ContentView.swift           # Routes: SetupView or MainTabView
          SetupView.swift             # Server URL + device name input
          NotificationListView.swift  # Notification history
          SettingsView.swift          # Server/device info, reset
          AutomationServerView.swift  # Automation mode toggle + log
        ViewModels/
          AppViewModel.swift          # Central state: configure, register, actions
        Services/
          (to be created in Phase 4)
          ServerAPIClient.swift       # HTTP client to Pulpit
          WebSocketManager.swift      # URLSessionWebSocketTask
          NotificationManager.swift   # UNUserNotificationCenter
          KeychainManager.swift       # Secure credential storage
        Extensions/
          Data+Hex.swift              # Device token hex encoding
        Intents/
          (to be created in Phase 5)
          RunShortcutIntent.swift
          SendNotificationIntent.swift
        NotificationService/
          (to be created in Phase 4)
          NotificationService.swift   # Rich content (images)
          Info.plist
```

---

## Database Schema

**7 tables** in SQLite via better-sqlite3:

| Table | Purpose |
|-------|---------|
| `devices` | Registered iOS devices with APNs tokens, online status, automation capability |
| `api_keys` | SHA-256 hashed API keys with permissions JSON, never stores plaintext |
| `notification_definitions` | Reusable notification templates referenced by name in API URLs |
| `notification_log` | Sent notification history with delivery status tracking |
| `server_actions` | Named actions mapping to iOS Shortcuts or webhook URLs |
| `scheduled_tasks` | Pending scheduled notifications/executions with timestamps |
| `apns_config` | Singleton row: p8 key path, Key ID, Team ID, Bundle ID, environment |

All timestamps are ISO 8601 UTC.

---

## REST API

Auth: `Authorization: Bearer {api_key}` on all endpoints (except device registration which uses optional auth).

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/health` | Server health check |
| `GET` | `/api/v1/devices` | List all devices |
| `POST` | `/api/v1/devices` | Register device (iOS client) |
| `PUT` | `/api/v1/devices/:id` | Update device |
| `DELETE` | `/api/v1/devices/:id` | Remove device |
| `POST` | `/api/v1/notifications/:name` | Send notification by template name |
| `POST` | `/api/v1/notifications` | Send ad-hoc notification |
| `GET` | `/api/v1/notifications/definitions` | List notification templates |
| `POST` | `/api/v1/notifications/definitions` | Create template |
| `PUT` | `/api/v1/notifications/definitions/:id` | Update template |
| `DELETE` | `/api/v1/notifications/definitions/:id` | Delete template |
| `GET` | `/api/v1/actions` | List server actions |
| `POST` | `/api/v1/actions` | Create action |
| `PUT` | `/api/v1/actions/:id` | Update action |
| `DELETE` | `/api/v1/actions/:id` | Delete action |
| `POST` | `/api/v1/execute` | Execute a server action |
| `DELETE` | `/api/v1/execute/:id` | Cancel scheduled execution |
| `GET` | `/api/v1/api-keys` | List API keys (masked) |
| `POST` | `/api/v1/api-keys` | Generate new API key |
| `DELETE` | `/api/v1/api-keys/:id` | Revoke API key |
| `GET` | `/api/v1/log` | Notification log (paginated) |
| `PUT` | `/api/v1/config/apns` | Update APNs configuration |
| `POST` | `/api/v1/config/apns/test` | Send test notification |

### Notification Payload

```json
{
  "title": "string",
  "text": "string",
  "sound": "system|vibrateOnly|subtle|question|jobDone|problem|loud|lasers",
  "image": "https://...",
  "imageData": "base64...",
  "input": "string passed to actions",
  "devices": ["device-name-1"],
  "isTimeSensitive": false,
  "delay": 60,
  "scheduleTimestamp": 1700000000,
  "id": "custom-dedup-id",
  "threadId": "group-id",
  "defaultAction": { "url": "https://..." },
  "actions": [
    {
      "name": "View",
      "url": "https://...",
      "shortcut": "Shortcut Name",
      "runOnServer": false,
      "input": "per-action input",
      "keepNotification": true,
      "urlBackgroundOptions": {
        "httpMethod": "POST",
        "httpContentType": "application/json",
        "httpBody": "{}"
      }
    }
  ]
}
```

---

## WebSocket Protocol

iOS client connects to `ws://{server}/ws` and authenticates with its registration token.

```
Client -> Server:  { type: "auth", token: "..." }
Server -> Client:  { type: "auth_ok", deviceId: "..." }
Server -> Client:  { type: "execute_shortcut", id: "...", shortcutName: "...", input: "..." }
Client -> Server:  { type: "execute_result", id: "...", success: true, output: "..." }
Server -> Client:  { type: "notification", payload: {...} }
Client -> Server:  { type: "status", automationServerReady: true }
Both:              { type: "ping" } / { type: "pong" }
```

Heartbeat: server pings every 30s, 60s timeout.

---

## Device Registration Flow

```
[Preacher iOS]                        [Pulpit Server]
  User enters server URL
  GET /api/v1/health               -->  200 { version, name }
  Request notification permission (iOS dialog)
  UIApplication.registerForRemoteNotifications()
  didRegisterForRemoteNotifications(deviceToken)
  POST /api/v1/devices             -->  201 { id, registrationToken }
    { name, apnsToken, platform }
  Store registrationToken in Keychain
  Connect WebSocket ws://server/ws
    { type: "auth", token }        -->  { type: "auth_ok" }
```

---

## Implementation Phases

### Phase 1: Scaffolding -- COMPLETE

- [x] Initialize npm workspace root with `server/` workspace
- [x] Scaffold Electron Forge app with React + TypeScript + Vite
- [x] Create Xcode project for Preacher iOS app with SwiftUI
- [x] Configure `.gitignore`, `.editorconfig`, `LICENSE`
- [x] Verify `npm run start` opens Electron window
- [x] Verify Xcode builds to simulator (iOS 17.0 target)

**Files created**: Root configs, server scaffold (Electron Forge + Vite), iOS Xcode project with all models/views/viewmodels/extensions.

---

### Phase 2: Server Core -- COMPLETE

- [x] SQLite schema + migration runner (7 tables)
- [x] Repository layer (device, api-key, notification, action, scheduled-task)
- [x] Express API router with all route modules
- [x] Zod validation schemas (notification, device)
- [x] Bearer token auth middleware (SHA-256 hash lookup)
- [x] Error handler middleware (ZodError -> 400, general -> 500)
- [x] APNs service (apns2, p8 token auth, send/sendSilent/sendToDevices/sendTest)
- [x] Notification service (template resolution, scheduling, dual-delivery via APNs + WebSocket)
- [x] WebSocket server (auth, device tracking, ping/pong, execute dispatch with Promise tracking)
- [x] Action service (WebSocket-first execution, APNs silent push fallback, webhook support)
- [x] Scheduler service (node-cron polling every 10s)
- [x] Winston logger
- [x] IPC handlers (file dialog, server status, initial API key)
- [x] Zero TypeScript errors

**Key files**: `server.ts`, `ipc.ts`, `router.ts`, `auth.ts`, all routes (8), all repos (5), all services (6), validators (2).

---

### Phase 3: Server Dashboard -- COMPLETE

- [x] TailwindCSS v4 theme (dark mode, custom design tokens)
- [x] Vite renderer config with Tailwind plugin + JSX
- [x] React entry point + HashRouter
- [x] Layout shell with sidebar navigation (6 nav items with SVG icons)
- [x] Setup wizard: 4-step flow (welcome, APNs config with file picker, API key creation, done)
- [x] Dashboard: 4 stat cards, quick-send form, recent notification log (auto-refresh 5s)
- [x] Device list: table with online/offline status, toggle automation, test notification, delete
- [x] Notification composer: template CRUD, action builder UI, inline send, curl example
- [x] API key manager: create (shown once with copy), list (masked), revoke
- [x] Action manager: CRUD (shortcut name, webhook URL, timeout), test execute
- [x] Settings: server info display, APNs config editor, iOS setup instructions
- [x] Preload bridge wired for all IPC calls
- [x] Zero TypeScript errors

**Key files**: `App.tsx`, `Layout.tsx`, `Sidebar.tsx`, `SetupWizard.tsx`, `Dashboard.tsx`, `DeviceList.tsx`, `NotificationComposer.tsx`, `ApiKeyManager.tsx`, `ActionManager.tsx`, `Settings.tsx`, `useApi.ts`, `types.d.ts`, `index.css`.

---

### Phase 4: iOS Core -- COMPLETE

- [x] **ServerAPIClient.swift** -- Actor-based HTTP client to Pulpit REST API
  - Health check, device registration, device update
  - Typed `APIError` enum with status code handling
  - Configurable base URL, 15s request timeout

- [x] **KeychainManager.swift** -- Secure credential storage via iOS Keychain
  - Store/retrieve server URL, device ID, registration token, device name, APNs token
  - `kSecAttrAccessibleAfterFirstUnlock` for background access
  - Bulk save/load `ServerConfig`, delete all on reset
  - Migration from legacy UserDefaults storage

- [x] **WebSocketManager.swift** -- Real-time connection to Pulpit
  - `URLSessionWebSocketTask` with `URLSessionWebSocketDelegate`
  - Auth handshake on connect, message dispatch (notification, execute_shortcut, ping/pong)
  - Automatic reconnection with exponential backoff (1s -> 60s max)
  - Observable `isConnected` and `connectionError` for UI
  - Callbacks for notification display and shortcut execution

- [x] **NotificationManager.swift** -- UNUserNotificationCenter wrapper
  - Permission requests, authorization status checks
  - Dynamic category registration with action buttons (up to 4 per notification)
  - Local notification display from WebSocket payloads with sound mapping
  - Notification history with UserDefaults persistence (max 100)
  - Push notification parsing from APNs userInfo

- [x] **NotificationService.appex** -- Notification Service Extension
  - Separate Xcode target (`com.kenmoini.Preacher.NotificationService`)
  - Download and attach images from `image` URL in payload
  - Decode `imageData` base64 with auto-detect format (PNG/GIF/JPG)
  - Graceful timeout handling via `serviceExtensionTimeWillExpire`

- [x] **AppDelegate.swift** -- Full notification wiring
  - APNs token delivery -> `registerDevice()` via ServerAPIClient
  - Silent push handler (`content-available: 1`) for shortcut execution fallback
  - Foreground notification display adds to history
  - Action button tap routing (URLs, shortcuts)

- [x] **AppViewModel.swift** -- Complete state machine
  - Keychain-based persistence with UserDefaults migration
  - ServerAPIClient for health check + registration flow
  - WebSocket auto-connect on launch, observable connection state
  - Automation mode toggle: disables idle timer, reports status to server
  - Shortcut execution with server result reporting

- [x] **Updated Views**
  - `NotificationListView`: reads from NotificationManager, connection indicator, clear history
  - `SettingsView`: connection error display, reconnect button, notification count, confirmation dialog
  - Background mode `remote-notification` enabled in Info.plist

- [x] Zero Swift compilation errors (both Preacher target and NotificationService extension)

**Key files**: `ServerAPIClient.swift`, `KeychainManager.swift`, `WebSocketManager.swift`, `NotificationManager.swift`, `NotificationService.swift`, updated `AppDelegate.swift`, `AppViewModel.swift`, `NotificationListView.swift`, `SettingsView.swift`.

---

### Phase 5: iOS Automation -- COMPLETE

- [x] **ShortcutRunner.swift** -- Shortcut execution service
  - Sequential execution queue with configurable timeouts
  - Build `shortcuts://run-shortcut` URL with name + input
  - `enqueue()` for server-triggered (queued), `executeImmediate()` for user-triggered
  - `handleAppDidBecomeActive()` detects Shortcuts app return as completion signal
  - `cancelAll()` for queue clearing
  - Observable `isExecuting` and `currentShortcut` for UI

- [x] **WebSocket -> ShortcutRunner wiring**
  - `execute_shortcut` messages routed through AppViewModel to ShortcutRunner queue
  - `execute_result` reported back to server on completion/timeout/failure
  - Execution history recorded in `recentExecutions`

- [x] **Automation mode in AppViewModel**
  - `isAutomationServerEnabled` didSet sends status to server via WebSocket
  - Disables idle timer (`isIdleTimerDisabled`) when active
  - `handleAppDidBecomeActive()` wired via `scenePhase` in PreacherApp
  - `shortcutRunner.cancelAll()` called on reset

- [x] **Silent push fallback** (implemented in Phase 4)
  - AppDelegate handles `content-available: 1` silent push
  - Parses `execute_shortcut` from push payload
  - Routes to `executeShortcut()` which uses ShortcutRunner

- [x] **App Intents** -- Shortcuts app integration
  - `RunServerActionIntent` -- Triggers named server action via REST API, optional wait-for-result
  - `SendNotificationIntent` -- Sends ad-hoc or template-based notification via REST API
  - `PreacherShortcuts` (AppShortcutsProvider) -- Phrases and discoverability for both intents
  - Typed error enums with `CustomLocalizedStringResourceConvertible`

- [x] **AutomationServerView** -- Enhanced UI
  - Active execution display with ProgressView and cancel button
  - Connection error display with exclamation icon
  - Keep-screen-on footer note when automation is active
  - Empty state with descriptive message
  - Execution count in section header

- [x] Zero Swift compilation errors, App Intents metadata processed

**Key files**: `ShortcutRunner.swift`, `RunServerActionIntent.swift`, `SendNotificationIntent.swift`, `PreacherShortcuts.swift`, updated `AppViewModel.swift`, `PreacherApp.swift`, `AutomationServerView.swift`.

---

### Phase 6: Testing + Polish -- COMPLETE

#### Server Tests (Vitest) -- 133 tests, all passing

- [x] **Test infrastructure**: in-memory SQLite setup, mocked APNs/WebSocket/scheduler/logger
- [x] **Repository unit tests** (5 suites, 71 tests)
  - `device.repo.test.ts` -- 20 tests: CRUD, findByApnsToken, findByRegistrationToken, findAutomationServers
  - `api-key.repo.test.ts` -- 16 tests: create (pk_ prefix, SHA-256 hash), validateKey, revoke, permissions
  - `notification.repo.test.ts` -- 15 tests: definition CRUD, log CRUD, pagination, status transitions
  - `action.repo.test.ts` -- 10 tests: CRUD, default timeout, findByName
  - `scheduled-task.repo.test.ts` -- 10 tests: findPending (time-based), cancel (status guard), status transitions
- [x] **API integration tests** (7 suites, 62 tests via supertest)
  - `health.test.ts` -- 2 tests: health check, no auth required
  - `devices.test.ts` -- 11 tests: register, re-register (idempotent), list, update, delete, auth
  - `api-keys.test.ts` -- 10 tests: create, list (masked), delete, auth flow (missing/invalid/non-Bearer)
  - `notifications.test.ts` -- 16 tests: ad-hoc send, template send, definition CRUD, duplicate names, validation
  - `actions.test.ts` -- 9 tests: CRUD, duplicate names, timeout/URL validation
  - `execute.test.ts` -- 8 tests: action/shortcut required, delayed scheduling, cancel, timeout bounds
  - `config.test.ts` -- 6 tests: APNs config status, validation (keyId/teamId length, bundleId format)

#### iOS Tests (XCTest) -- 5 test files

- [x] `ModelTests.swift` -- ServerConfig, DeviceRegistration, PreacherNotification, PreacherAction, ShortcutExecution encode/decode
- [x] `DataHexTests.swift` -- Data+Hex extension: empty, single byte, multi-byte, APNs token (32 bytes -> 64 hex), lowercase
- [x] `WebSocketMessageTests.swift` -- Client->Server and Server->Client message JSON structure validation
- [x] `APIClientTests.swift` -- Error descriptions, URL construction (health, devices, WebSocket ws/wss), Shortcuts URL scheme, URL normalization
- [x] `IntentTests.swift` -- SendNotificationError and RunServerActionError localized descriptions, endpoint URL construction

*Note: iOS tests need the PreacherTests target to be added in Xcode (File > New > Target > Unit Testing Bundle).*

#### Error Handling Audit

- [x] **Fixed: Unhandled promise rejection** in execute.ts nowait fire-and-forget (added `.catch()`)
- [x] **Fixed: Information leakage** -- Removed `detail: (err as Error).message` from all API error responses
- [x] **Fixed: Route ordering bug** -- `/notifications/definitions` routes moved before `/notifications/:name` to prevent Express matching "definitions" as a `:name` parameter
- [x] Audited all routes, middleware, and services for error handling completeness
- [x] Verified parameterized SQL queries prevent injection
- [x] Verified API key SHA-256 hashing (no plaintext storage)

#### Documentation

- [x] `README.md` -- Architecture diagram, features, quick start, project structure, API overview, tech stack
- [x] `docs/setup-guide.md` -- Prerequisites, APNs key setup, server configuration, iOS app setup, external access (Caddy/nginx/Cloudflare), troubleshooting
- [x] `docs/api-reference.md` -- Complete API docs: all endpoints with request/response schemas, WebSocket protocol, error codes

**Key files**: `vitest.config.ts`, `__tests__/setup.ts`, `__tests__/helpers/test-app.ts`, 5 repo test files, 7 integration test files, 5 iOS test files, `README.md`, `docs/setup-guide.md`, `docs/api-reference.md`.

---

## Known Limitations

- **APNs requires Apple Developer account** ($99/year) -- unavoidable for push notifications
- **iOS background execution**: Automation server mode requires app in foreground on a dedicated device (same constraint as PushCut)
- **Shortcut execution**: `shortcuts://` URL scheme opens the Shortcuts app visibly; no silent background API exists
- **External access**: Server runs HTTP locally; users need a reverse proxy (Caddy/nginx/Cloudflare Tunnel) for HTTPS and external webhook access
- **Notification actions**: iOS limits notifications to a maximum of 4 action buttons

---

## Verification Plan

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start Pulpit, create API key via dashboard | Dashboard loads, key returned |
| 2 | Create notification template, send via `curl` | SQLite log entry created |
| 3 | Configure p8 credentials, send test notification | Notification delivered to real iOS device |
| 4 | Install Preacher, enter server URL | Device appears in Pulpit dashboard |
| 5 | Send notification via API | Push notification with actions displayed on device |
| 6 | Verify WebSocket connection | Real-time online indicator in dashboard |
| 7 | Enable automation mode, trigger execute via API | Shortcut launches on device |
| 8 | Tap notification action button | URL opens / HTTP callback fires |

---

## Progress Summary

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | COMPLETE | Scaffolding (Electron + iOS projects) |
| Phase 2 | COMPLETE | Server Core (API, DB, APNs, WebSocket, Scheduler) |
| Phase 3 | COMPLETE | Server Dashboard (React UI, all management screens) |
| Phase 4 | COMPLETE | iOS Core (APNs registration, WebSocket client, rich notifications) |
| Phase 5 | COMPLETE | iOS Automation (Shortcuts, App Intents, silent push) |
| Phase 6 | COMPLETE | Testing (133 server tests) + Error Handling Audit + Documentation |

**All 6 phases complete.** The project is ready for manual E2E testing on real hardware.
