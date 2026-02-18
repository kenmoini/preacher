# Setup Guide

Complete instructions for setting up the Preacher/Pulpit push notification platform.

## Prerequisites

### Apple Developer Account

You need an Apple Developer account ($99/year) to:
- Generate APNs authentication keys
- Sign the iOS app for push notification capability
- Deploy to physical iOS devices

### APNs Key (p8)

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Click **Keys** -> **Create a Key**
3. Name it (e.g., "Pulpit APNs") and check **Apple Push Notifications service (APNs)**
4. Download the `.p8` file (you can only download it once!)
5. Note the **Key ID** (10 characters)
6. Note your **Team ID** from the [Membership page](https://developer.apple.com/account#MembershipDetailsCard)

### Development Tools

- **Node.js 20+** (for the server)
- **Xcode 15+** (for the iOS app)
- **npm** (included with Node.js)

## Server Setup (Pulpit)

### 1. Install dependencies

```bash
cd ios-preacher
npm install
```

Dependencies are hoisted to the root `node_modules/` via npm workspaces.

### 2. Start in development mode

```bash
npm run --workspace=server start
```

This launches the Electron app with hot-reload. The Express API server starts on port **26547** by default.

### 3. Initial configuration

On first launch, the Setup Wizard will guide you through:

1. **APNs Configuration**
   - Select your `.p8` key file
   - Enter the Key ID (10 characters from the Apple Developer Portal)
   - Enter your Team ID (10 characters)
   - Enter your Bundle ID (e.g., `com.yourname.Preacher`)
   - Choose environment (Sandbox for development, Production for App Store)

2. **API Key**
   - Generate your first API key
   - Copy and save it securely (shown only once)

3. **Test notification**
   - After connecting an iOS device, send a test notification to verify the setup

### 4. Verify the server

```bash
curl http://localhost:26547/api/v1/health
```

Expected response:
```json
{
  "name": "Pulpit",
  "version": "0.1.0",
  "status": "ok",
  "uptime": 42
}
```

## iOS App Setup (Preacher)

### 1. Open in Xcode

Open `ios/Preacher/Preacher.xcodeproj` in Xcode.

### 2. Configure signing

1. Select the **Preacher** target
2. Go to **Signing & Capabilities**
3. Select your team
4. Change the Bundle ID to match what you configured in Pulpit (e.g., `com.yourname.Preacher`)
5. Do the same for the **NotificationService** extension target

### 3. Verify capabilities

Ensure these capabilities are enabled:
- **Push Notifications**
- **Background Modes** -> Remote notifications

### 4. Build and run

Connect a physical iOS device (push notifications don't work on the simulator) and build (Cmd+R).

### 5. Connect to server

1. Enter your Pulpit server URL (e.g., `http://192.168.1.100:26547`)
2. Enter a device name
3. Grant notification permission when prompted
4. The app will register with the server and connect via WebSocket

## External Access

The server runs HTTP locally. For external access (webhooks, remote management), set up a reverse proxy:

### Caddy (recommended)

```
pulpit.yourdomain.com {
    reverse_proxy localhost:26547
}
```

### Cloudflare Tunnel

```bash
cloudflared tunnel --url http://localhost:26547
```

### nginx

```nginx
server {
    listen 443 ssl;
    server_name pulpit.yourdomain.com;

    location / {
        proxy_pass http://localhost:26547;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

The WebSocket upgrade headers are important for the `/ws` endpoint.

## Automation Server Mode

To use a dedicated iOS device as an automation server:

1. Enable **Automation Server Mode** in the Preacher app
2. Keep the app in the foreground (screen auto-lock is disabled while active)
3. Shortcuts can now be triggered remotely via the API:

```bash
curl -X POST http://localhost:26547/api/v1/execute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"shortcut": "Morning Routine"}'
```

## Sending Notifications

### Ad-hoc notification

```bash
curl -X POST http://localhost:26547/api/v1/notifications \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hello!",
    "text": "Your first push notification",
    "sound": "system"
  }'
```

### Using templates

1. Create a template:
```bash
curl -X POST http://localhost:26547/api/v1/notifications/definitions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "server-alert",
    "title": "Server Alert",
    "sound": "problem",
    "isTimeSensitive": true
  }'
```

2. Send using the template:
```bash
curl -X POST http://localhost:26547/api/v1/notifications/server-alert \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Disk usage at 95%"}'
```

## Troubleshooting

### Notifications not arriving

1. Check APNs configuration in the dashboard
2. Verify the Bundle ID matches between server config and Xcode project
3. Ensure the device is registered (check Devices in the dashboard)
4. Try sending a test notification from the dashboard
5. Check that the `.p8` key hasn't been revoked

### WebSocket not connecting

1. Verify the server URL is accessible from the iOS device
2. Check firewall rules (port 26547)
3. If using HTTPS, ensure WebSocket upgrade headers are proxied correctly
4. Check the connection error message in the Preacher app

### Shortcuts not executing

1. Ensure Automation Server Mode is enabled
2. Keep the Preacher app in the foreground
3. Verify the shortcut name matches exactly (case-sensitive)
4. Check the Recent Executions list for error details
