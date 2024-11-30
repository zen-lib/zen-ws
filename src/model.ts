import { JSONObject } from 'zen-json-type';

export type ZenMessage = JSONObject;

export interface ZenEnvelope {
	type: string;
	message: ZenMessage;
}

export interface ZenPing extends ZenMessage {
	payload: string;
}

export interface ZenPong extends ZenMessage {
	payload: string;
}

export interface Logger {
	debug(message: string, ...args: any[]): void;
	info(message: string, ...args: any[]): void;
	warn(message: string, ...args: any[]): void;
	error(message: string, ...args: any[]): void;
}
