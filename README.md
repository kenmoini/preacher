# Preacher / Pulpit

A self-hosted push notification platform for iOS. An open-source alternative to PushCut.

**Pulpit** is an Electron-based cross-platform server with a REST API, APNs integration, WebSocket support, and a React management dashboard.

**Preacher** is a SwiftUI iOS client that receives push notifications, handles actions, and supports automation server mode for running Shortcuts remotely.

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

- **Notification flow**: API request -> validate + store -> send via APNs (push) + WebSocket (real-time)
- **Automation flow**: API request -> WebSocket command to iOS -> run Shortcut -> report result back

## Features

- Rich push notifications with images, custom sounds, and action buttons
- Notification templates with named definitions
- Remote shortcut execution via WebSocket or silent push
- Automation server mode on dedicated iOS device
- API key authentication with SHA-256 hashing
- Scheduled/delayed notifications and actions
- App Intents for iOS Shortcuts integration
- React dashboard for management
- SQLite database with WAL mode

## Requirements

### Server (Pulpit)
- Node.js 20+
- macOS, Windows, or Linux

### iOS (Preacher)
- iOS 17.0+
- Xcode 15+
- Apple Developer account (required for APNs)

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/kenmoini/preacher.git
cd preacher
npm install
```

### 2. Start the server

```bash
npm run --workspace=server start
```

This launches the Electron app with the Pulpit dashboard.

### 3. Configure APNs

In the Pulpit dashboard:
1. Complete the Setup Wizard
2. Upload your `.p8` APNs key file
3. Enter your Key ID, Team ID, and Bundle ID
4. Send a test notification

### 4. Build the iOS app

Open `ios/Preacher/Preacher.xcodeproj` in Xcode, update the Bundle ID and signing, then build and run on a real device (push notifications require a physical device).

### 5. Connect

In the Preacher app, enter your server URL and device name. The app will register with the server and connect via WebSocket.

## Project Structure

```
preacher/
  package.json              # npm workspaces root
  server/                   # Pulpit - Electron server
    src/
      main/                 # Electron entry + Express server
      api/                  # REST API routes, middleware, validators
      db/                   # SQLite + migrations + repositories
      services/             # APNs, WebSocket, notifications, scheduler
      renderer/             # React dashboard
      shared/               # Types and constants
    src/__tests__/          # Vitest unit + integration tests
  ios/                      # Preacher - SwiftUI iOS app
    Preacher/
      Preacher/
        Models/             # Data models
        Views/              # SwiftUI views
        ViewModels/         # View models
        Services/           # API client, WebSocket, Keychain, etc.
        Intents/            # App Intents for Shortcuts
        Extensions/         # Swift extensions
      NotificationService/  # Rich notification extension
      PreacherTests/        # XCTest unit tests
  docs/
    setup-guide.md          # Detailed setup instructions
    api-reference.md        # Complete API documentation
```

## API Overview

All endpoints require `Authorization: Bearer <api_key>` unless noted.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Server health (no auth) |
| POST | `/api/v1/devices` | Register device (optional auth) |
| GET | `/api/v1/devices` | List devices |
| POST | `/api/v1/notifications` | Send ad-hoc notification |
| POST | `/api/v1/notifications/:name` | Send from template |
| POST | `/api/v1/execute` | Execute action/shortcut |
| GET | `/api/v1/api-keys` | List API keys |
| POST | `/api/v1/api-keys` | Create API key |

See [docs/api-reference.md](docs/api-reference.md) for the complete API documentation.

## Testing

### Server tests

```bash
cd server
npx vitest run
```

133 tests covering:
- Repository CRUD operations (5 suites)
- API integration tests with supertest (7 suites)

### iOS tests

Open the Xcode project and run tests with Cmd+U. Tests cover model encoding/decoding, Data+Hex extension, WebSocket message parsing, URL construction, and error types.

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Server app | Electron + Electron Forge + Vite |
| API | Express v5 + Zod validation |
| Database | SQLite via better-sqlite3 (WAL mode) |
| Push notifications | APNs p8 token auth via apns2 |
| Real-time | WebSocket (ws library) |
| Dashboard | React 19 + TailwindCSS v4 |
| iOS app | SwiftUI + iOS 17 |
| iOS push | UNUserNotificationCenter |
| iOS WebSocket | URLSessionWebSocketTask |
| iOS Shortcuts | App Intents framework |
| Testing | Vitest + supertest + XCTest |

## License

Apache-2.0
