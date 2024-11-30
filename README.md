# zen-ws

A simple and powerful WebSocket library for Node.js that handles authentication, automatic reconnection, and JSON message passing out of the box.

## Features

-  🔒 Built-in authentication support
-  🔄 Automatic ping/pong keep-alive
-  📦 Simple JSON message passing
-  🎯 TypeScript support
-  📡 Support for both CommonJS and ES Modules
-  🔌 Multiple concurrent connections per user

## Installation

```bash
npm install zen-ws
```

## Usage

### Server Setup

```typescript
import { ZenSocketServer } from 'zen-ws';
import http from 'http';

// Create HTTP server
const httpServer = http.createServer();

// Initialize WebSocket server
const wss = new ZenSocketServer({
	path: '/ws', // WebSocket endpoint path
	httpServer,
	// Authentication function - return userId if token is valid, null otherwise
	authenticateUser: async (token: string) => {
		// Implement your authentication logic here
		const userId = await validateToken(token);
		return userId;
	},
});

// Handle incoming messages
wss.onMessage = (userId: string, type: string, message: any) => {
	console.log(`Received message from ${userId}:`, { type, message });

	// Send response back to the user
	wss.sendMessage(userId, 'response', {
		status: 'ok',
		data: 'Message received',
	});
};

// Start the server
httpServer.listen(3000);
```

### Client Setup

```typescript
import { ZenSocket } from 'zen-ws';

// Initialize WebSocket client
const ws = new ZenSocket({
	url: 'ws://localhost:3000/ws',
	authToken: 'your-auth-token',
	pingInterval: 15000, // Optional: customize ping interval (default: 15s)
});

// Handle connection open
ws.onOpen = () => {
	console.log('Connected to server');

	// Send a message
	ws.send('chat', {
		message: 'Hello, server!',
		timestamp: Date.now(),
	});
};

// Handle incoming messages
ws.onMessage = (type: string, message: any) => {
	console.log('Received message:', { type, message });
};

// Handle connection close
ws.onClose = (event) => {
	console.log('Connection closed:', event.reason);
};

// Handle errors
ws.onError = (event) => {
	console.error('WebSocket error:', event);
};
```

## Message Format

Messages are automatically serialized and deserialized as JSON. The library uses a simple envelope format:

```typescript
interface Message {
	type: string; // Message type identifier
	message: any; // Your JSON payload
}
```

### Example Messages

```typescript
// Sending a chat message
ws.send('chat', {
	text: 'Hello everyone!',
	room: 'general',
});

// Sending user status
ws.send('status', {
	status: 'away',
	lastActive: Date.now(),
});

// Sending structured data
ws.send('updateProfile', {
	displayName: 'John Doe',
	preferences: {
		theme: 'dark',
		notifications: true,
	},
});
```

## Authentication

Authentication is handled via tokens passed in the WebSocket connection URL. The server validates these tokens and maintains user identity throughout the WebSocket session.

1. Client connects with an auth token:

```typescript
const ws = new ZenSocket({
	url: 'ws://localhost:3000/ws',
	authToken: 'user-jwt-token', // Your authentication token
});
```

2. Server validates the token and associates the WebSocket connection with the user:

```typescript
const wss = new ZenSocketServer({
	// ... other options
	authenticateUser: async (token) => {
		try {
			const decoded = await verifyJWT(token);
			return decoded.userId; // Return null if validation fails
		} catch (error) {
			return null;
		}
	},
});
```

## Multiple Connections

The library automatically handles multiple connections from the same user:

-  Messages sent to a userId are automatically broadcast to all active connections for that user
-  Connections are automatically cleaned up when closed
-  Each connection maintains its own ping/pong cycle

## Error Handling

The library includes built-in error handling and connection management:

-  Invalid authentication tokens result in immediate connection closure
-  Ping timeouts automatically close stale connections
-  JSON parsing errors are caught and logged
-  Connection errors trigger the onError callback

## License

MIT
