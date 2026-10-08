/**
 * @clardan/wire-mux
 * Low-overhead stream demultiplexer, circular ring-buffer telemetry probe,
 * and zero-copy JSON-RPC 2.0 framing layer for Model Context Protocol (MCP) transports.
 *
 * Core engine powering the Clardan Desktop IDE (https://clardan.com).
 */

export * from "./types.js";
export * from "./ringbuffer/ring.js";
export * from "./framing/ndjson_scanner.js";
export * from "./transport/stdio_tap.js";
