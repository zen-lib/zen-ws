export type JSONPrimitive = string | number | boolean | null;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;

export interface ZenEnvelope {
	type: string;
	message: JSONValue;
}

export interface ZenPing extends JSONObject {
	payload: string;
}

export interface ZenPong extends JSONObject {
	payload: string;
}

export interface Logger {
	debug(message: string, ...args: any[]): void;
	info(message: string, ...args: any[]): void;
	warn(message: string, ...args: any[]): void;
	error(message: string, ...args: any[]): void;
}
