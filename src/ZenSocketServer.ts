import {
	WebSocket,
	WebSocketServer,
	MessageEvent,
	CloseEvent,
	ErrorEvent,
	ServerOptions,
} from 'ws';
import { parse } from 'url';
import { JSONValue, Logger, ZenEnvelope, ZenPing, ZenPong } from './model';
import http from 'http';

interface ZenSocketServerOptions {
	path: string;
	httpServer: http.Server;
	authenticateUser: (token: string) => Promise<string | null>;
	wssOptions?: ServerOptions;
	logger?: Logger;
}

export default class ZenSocketServer {
	public wss: WebSocketServer;

	public onMessage:
		| ((userId: string, typeId: string, message: JSONValue) => void)
		| null = null;
	public onClose: ((event: CloseEvent) => void) | null = null;
	public onError: ((event: ErrorEvent) => void) | null = null;

	private userIdToWs: Map<string, Set<WebSocket>> = new Map();
	private wsToUserId: Map<WebSocket, string> = new Map();
	private authenticateUser: (token: string) => Promise<string | null>;
	private logger?: Logger;

	constructor({
		authenticateUser,
		httpServer,
		path,
		wssOptions,
		logger,
	}: ZenSocketServerOptions) {
		this.wss = new WebSocketServer(wssOptions || { noServer: true });
		this.authenticateUser = authenticateUser;
		this.logger = logger;
		this.wss.on('connection', this.handleNewConnection);
		httpServer.on('upgrade', (request, socket, head) => {
			const { url } = request;
			this.logger?.info('WebSocket upgrade attempt', url?.split('?')[0]);
			if (url?.startsWith(path)) {
				this.wss.handleUpgrade(request, socket, head, (ws) => {
					this.wss.emit('connection', ws, request);
				});
			}
		});
	}

	public sendMessage = (
		userId: string,
		typeId: string,
		message: JSONValue
	) => {
		const userConnections = this.userIdToWs.get(userId);
		if (!userConnections || userConnections.size === 0) {
			return false;
		}
		const envelope: ZenEnvelope = { type: typeId, message };
		for (const ws of userConnections) {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify(envelope));
			}
		}
	};

	private handleNewConnection = async (
		ws: WebSocket,
		request: any
	): Promise<void> => {
		try {
			const { query } = parse(request.url!, true);
			const token = query.auth as string;

			if (!token) {
				ws.close(1008, 'Missing authentication token');
				return;
			}
			const userId = await this.authenticateUser?.(token);

			if (!userId) {
				ws.close(1008, 'Invalid authentication token');
				return;
			}
			if (!this.userIdToWs.has(userId)) {
				this.userIdToWs.set(userId, new Set());
			}
			this.userIdToWs.get(userId)!.add(ws);
			this.wsToUserId.set(ws, userId);

			this.logger?.info('ZenSocketServer', `Client connected: ${userId}`);

			ws.onmessage = this.handleMessage;
			ws.onclose = this.handleClose;
			ws.onerror = this.handleError;
		} catch (error) {
			this.logger?.error('ZenSocketServer', 'connection error:', error);
			ws.close(1008, 'Authentication failed');
		}
	};

	private handleMessage = (event: MessageEvent) => {
		const { data, target: ws } = event;
		const userId = this.wsToUserId.get(ws);
		if (!userId) {
			return;
		}
		try {
			const messageStr = data.toString();
			const parsedMessage = JSON.parse(messageStr) as ZenEnvelope;

			if (!parsedMessage.type || typeof parsedMessage.type !== 'string') {
				throw new Error('Invalid message format: missing or invalid type');
			}

			if (parsedMessage.type === 'ping') {
				const ping = parsedMessage.message as ZenPing;
				const pong: ZenPong = { payload: ping.payload };
				this.sendMessage(userId, 'pong', pong);
				return;
			}
			this.onMessage?.(userId, parsedMessage.type, parsedMessage.message);
		} catch (error) {
			console.error(`Failed to process message:`, error);
		}
	};

	private handleClose = (event: CloseEvent) => {
		const { target: ws } = event;
		const userId = this.wsToUserId.get(ws);
		if (!userId) {
			return;
		}
		this.wsToUserId.delete(ws);
		const userConnections = this.userIdToWs.get(userId);
		if (userConnections) {
			userConnections.delete(ws);
			if (userConnections.size === 0) {
				this.userIdToWs.delete(userId);
			}
		}
	};

	private handleError = (event: ErrorEvent) => {
		const { target: ws } = event;
		console.error(`WebSocket error:`, event.error);
	};
}
