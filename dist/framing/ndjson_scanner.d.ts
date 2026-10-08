import { EventEmitter } from "node:events";
/**
 * High-performance byte scanner for Model Context Protocol stdio framing.
 * MCP transports enforce newline-delimited JSON-RPC 2.0 payloads.
 */
export declare class NdjsonScanner extends EventEmitter {
    private scratch;
    private scratchLen;
    private maxFrameSize;
    constructor(maxFrameSize?: number);
    feed(chunk: Buffer): void;
    private ensureScratch;
    reset(): void;
}
//# sourceMappingURL=ndjson_scanner.d.ts.map