# API Reference

Base URL: `http://localhost:26547/api/v1`

## Authentication

All endpoints require a Bearer token unless noted otherwise.

```
Authorization: Bearer pk_abc123...
```

Create API keys via `POST /api/v1/api-keys` or the Pulpit dashboard.

---

## Health

### GET /health

Check server status. **No authentication required.**

**Response** `200`
```json
{
  "name": "Pulpit",
  "version": "0.1.0",
  "status": "ok",
  "uptime": 3600
}
```

---

## Devices

### POST /devices

Register or update an iOS device. **Authentication optional** (iOS clients call this during setup).

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Device name (1-100 chars) |
| apnsToken | string | Yes | APNs device token (hex) |
| platform | string | No | Default: `ios` |

**Response** `201` (new device) or `200` (existing token)
```json
{
  "id": "uuid-string",
  "registrationToken": "64-char-hex-string"
}
```

### GET /devices

List all registered devices.

**Response** `200`
```json
[
  {
    "id": "uuid",
    "name": "Ken's iPhone",
    "platform": "ios",
    "isAutomationServer": false,
    "lastSeenAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### PUT /devices/:id

Update a device.

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | New device name |
| apnsToken | string | No | New APNs token |
| isAutomationServer | boolean | No | Enable automation mode |

**Response** `200` - Updated device object

### DELETE /devices/:id

Remove a device.

**Response** `204` No Content

---

## Notifications

### POST /notifications

Send an ad-hoc notification. At least `title` or `text` is required.

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | No* | Notification title |
| text | string | No* | Notification body |
| sound | string | No | One of: `vibrateOnly`, `system`, `subtle`, `question`, `jobDone`, `problem`, `loud`, `lasers` |
| image | string | No | Image URL |
| imageData | string | No | Base64-encoded image |
| input | string | No | Input passed to actions |
| devices | string[] | No | Target device names (default: all) |
| isTimeSensitive | boolean | No | iOS time-sensitive notification |
| delay | number | No | Delay in seconds |
| scheduleTimestamp | number | No | Unix timestamp to send at |
| id | string | No | Custom deduplication ID |
| threadId | string | No | Notification grouping ID |
| defaultAction | object | No | Default tap action |
| actions | object[] | No | Action buttons (max 4) |

*At least one of `title` or `text` must be provided.

**Action Object**
| Field | Type | Description |
|-------|------|-------------|
| name | string | Button label |
| url | string | URL to open |
| shortcut | string | Shortcut name to run |
| input | string | Per-action input |
| runOnServer | boolean | Execute on automation server |
| keepNotification | boolean | Keep notification after tap |
| urlBackgroundOptions | object | Background HTTP request config |

**Response** `200`
```json
{
  "id": "notification-log-uuid",
  "status": "sent",
  "scheduledFor": null
}
```

### POST /notifications/:name

Send a notification using a saved template. Body fields override template defaults.

**Response** `200` - Same as ad-hoc send

**Error** `404` - Template not found

### GET /notifications/definitions

List all notification templates.

**Response** `200`
```json
[
  {
    "id": "uuid",
    "name": "server-alert",
    "title": "Server Alert",
    "text": null,
    "sound": "problem",
    "imageUrl": null,
    "isTimeSensitive": true,
    "defaultAction": null,
    "actions": [],
    "threadId": null,
    "targetDevices": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /notifications/definitions

Create a notification template.

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Unique template name (1-100 chars) |
| title | string | No | Default title |
| text | string | No | Default body text |
| sound | string | No | Default sound |
| imageUrl | string | No | Default image URL |
| isTimeSensitive | boolean | No | Default time-sensitive flag |
| defaultAction | object | No | Default tap action |
| actions | object[] | No | Default action buttons (max 4) |
| threadId | string | No | Default thread ID |
| targetDevices | string[] | No | Default target devices |

**Response** `201`
```json
{
  "id": "uuid",
  "name": "server-alert",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Error** `409` - Name already exists

### PUT /notifications/definitions/:id

Update a notification template. All fields are optional.

**Response** `200`

### DELETE /notifications/definitions/:id

Delete a notification template.

**Response** `204` No Content

---

## Actions

Server actions are named configurations for shortcut execution, webhooks, or HomeKit scenes.

### GET /actions

List all server actions.

**Response** `200`
```json
[
  {
    "id": "uuid",
    "name": "run-backup",
    "shortcutName": "Backup Script",
    "targetDeviceId": null,
    "homekitScene": null,
    "webhookUrl": null,
    "timeoutSeconds": 30,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /actions

Create a server action.

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Unique action name (1-100 chars) |
| shortcutName | string | No | iOS Shortcut to run |
| targetDeviceId | string | No | Specific device UUID |
| homekitScene | string | No | HomeKit scene name |
| webhookUrl | string | No | Webhook URL to call |
| timeoutSeconds | number | No | Timeout 1-300 (default: 30) |

**Response** `201`

**Error** `409` - Name already exists

### PUT /actions/:id

Update a server action. All fields are optional.

**Response** `200`

### DELETE /actions/:id

Delete a server action.

**Response** `204` No Content

---

## Execute

### POST /execute

Execute a server action or shortcut on a connected device.

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| action | string | No* | Named action to execute |
| shortcut | string | No* | Shortcut name (direct) |
| input | string | No | Input to pass |
| delay | number | No | Delay in seconds |
| timeout | number | No | Timeout 1-300 (default: 30) |
| nowait | boolean | No | Fire-and-forget mode |

*Either `action` or `shortcut` must be provided.

**Execution priority:**
1. Webhook (if configured on the action)
2. WebSocket (if the target device is connected)
3. APNs silent push (fallback)

**Response** `200` (awaited result)
```json
{
  "success": true,
  "output": "Shortcut completed"
}
```

**Response** `202` (delayed or nowait)
```json
{
  "id": "scheduled-task-uuid",
  "status": "scheduled",
  "executeAt": "2024-01-01T01:00:00.000Z"
}
```

### DELETE /execute/:id

Cancel a scheduled execution.

**Response** `200`
```json
{
  "status": "cancelled"
}
```

**Error** `404` - Task not found or already executed

---

## API Keys

### GET /api-keys

List all API keys (values are masked).

**Response** `200`
```json
[
  {
    "id": "uuid",
    "name": "My Integration",
    "keyPrefix": "pk_abc123",
    "permissions": ["*"],
    "isActive": true,
    "lastUsedAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /api-keys

Create a new API key. The raw key is returned **only once**.

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Key name (1-100 chars) |
| permissions | string[] | No | Default: `["*"]` |

**Response** `201`
```json
{
  "id": "uuid",
  "name": "My Integration",
  "key": "pk_abc123...64hexchars",
  "keyPrefix": "pk_abc123",
  "permissions": ["*"],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### DELETE /api-keys/:id

Delete an API key.

**Response** `204` No Content

---

## Notification Log

### GET /log

Get the notification log (paginated).

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Max entries (1-200) |
| offset | number | 0 | Skip entries |

**Response** `200`
```json
{
  "entries": [
    {
      "id": "uuid",
      "definitionId": null,
      "title": "Test",
      "text": "Hello",
      "targetDevices": ["device-uuid"],
      "status": "sent",
      "scheduledFor": null,
      "sentAt": "2024-01-15T10:30:00.000Z",
      "error": null,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

---

## APNs Configuration

### GET /config/apns

Get APNs configuration status.

**Response** `200`
```json
{
  "configured": true,
  "keyId": "KEY1234567",
  "teamId": "TEAM123456",
  "bundleId": "com.example.Preacher",
  "isProduction": false,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### PUT /config/apns

Update APNs configuration.

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| keyPath | string | Yes | Path to `.p8` key file |
| keyId | string | Yes | 10-character Key ID |
| teamId | string | Yes | 10-character Team ID |
| bundleId | string | Yes | App Bundle ID |
| isProduction | boolean | No | Default: false (sandbox) |

**Response** `200`
```json
{
  "status": "updated"
}
```

### POST /config/apns/test

Send a test notification to verify APNs configuration.

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| deviceId | string | Yes | Device UUID to send to |

**Response** `200`
```json
{
  "status": "sent"
}
```

---

## WebSocket Protocol

Connect to `ws://{server}/ws` for real-time communication.

### Authentication

After connecting, send an auth message within 10 seconds:

```json
{"type": "auth", "token": "registration-token"}
```

Server responds:
```json
{"type": "auth_ok", "deviceId": "device-uuid"}
```

### Message Types

**Server -> Client:**
| Type | Description |
|------|-------------|
| `auth_ok` | Authentication successful |
| `auth_error` | Authentication failed |
| `ping` | Keepalive ping (every 30s) |
| `execute_shortcut` | Run a shortcut |
| `notification` | Real-time notification |

**Client -> Server:**
| Type | Description |
|------|-------------|
| `auth` | Authentication request |
| `pong` | Keepalive response |
| `execute_result` | Shortcut execution result |
| `status` | Automation server status |

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable error message"
}
```

Validation errors (400):
```json
{
  "error": "Validation error",
  "details": [
    {"field": "name", "message": "String must contain at least 1 character(s)"}
  ]
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async operation) |
| 204 | No Content (successful delete) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid API key) |
| 404 | Not Found |
| 409 | Conflict (duplicate name) |
| 500 | Internal Server Error |
