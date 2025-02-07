import { ZenMessage, ZenPong } from './model';
export * from './model';

export interface ZenSocketOptions {
	url: string;
	authToken: string;
	pingInterval?: number;
}

export class ZenSocket {
	public onOpen: ((event: Event) => void) | null = null;
	public onMessage: ((typeId: string, message: ZenMessage) => void) | null = null;
	public onClose: ((event: CloseEvent) => void) | null = null;
	public onError: ((event: Event) => void) | null = null;

	private ws: WebSocket;
	private pingInterval: number = 15000;
	private pingTimer: number | null = null;
	private currentPingPayload: string | null = null;

	constructor({ url, authToken, pingInterval }: ZenSocketOptions) {
		const ws = new WebSocket(`${url}?auth=${authToken}`);
		ws.onopen = this.handleOpen;
		ws.onmessage = this.handleMessage;
		ws.onclose = this.handleClose;
		ws.onerror = this.handleError;
		this.ws = ws;
		if (pingInterval) {
			this.pingInterval = pingInterval;
		}
		this.startPingInterval();
	}

	public send(typeId: string, message: ZenMessage) {
		this.ws.send(JSON.stringify({ type: typeId, message }));
	}

	private handleOpen = (event: Event) => {
		this.onOpen?.(event);
	};

	private handleMessage = (event: MessageEvent) => {
		try {
			const messageStr = event.data.toString();
			const parsedMessage = JSON.parse(messageStr) as {
				type: string;
				message: ZenMessage;
			};

			if (!parsedMessage.type || typeof parsedMessage.type !== 'string') {
				throw new Error('Invalid message format: missing or invalid type');
			}

			if (parsedMessage.type === 'pong') {
				const pongMessage = parsedMessage.message as ZenPong;
				if (pongMessage.payload !== this.currentPingPayload) {
					console.error('Invalid pong payload - closing connection');
					this.ws.close(1000, 'Invalid pong payload');
					return;
				}
				this.currentPingPayload = null; // Reset ping payload after valid pong
				return;
			}
			this.onMessage?.(parsedMessage.type, parsedMessage.message);
		} catch (error) {
			console.error(`ZenSocket: Failed to process message:`, error);
		}
	};

	private handleClose = (event: CloseEvent) => {
		this.clearPingTimeout();
		this.currentPingPayload = null;
		this.onClose?.(event);
	};

	private handleError = (event: Event) => {
		this.onError?.(event);
	};

	private startPingInterval = () => {
		this.clearPingTimeout();
		this.pingTimer = window.setInterval(this.sendPing, this.pingInterval);
	};

	private sendPing = () => {
		try {
			if (this.currentPingPayload !== null) {
				console.error('Previous ping not responded to - closing connection');
				this.ws.close(1000, 'Ping timeout');
				return;
			}

			const randomBytes = new Uint8Array(10);
			crypto.getRandomValues(randomBytes);
			const payload = btoa(String.fromCharCode(...randomBytes));
			this.currentPingPayload = payload;

			this.send('ping', { payload });
		} catch (error) {
			console.error('ZenSocket: Failed to send ping:', error);
		}
	};

	private clearPingTimeout = () => {
		if (this.pingTimer) {
			clearInterval(this.pingTimer);
			this.pingTimer = null;
		}
	};
}
