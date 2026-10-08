import { Readable, Writable } from "node:stream";
import { EventEmitter } from "node:events";
import { WireRingBuffer } from "../ringbuffer/ring.js";
export interface StdioTapOptions {
    bufferCapacity?: number;
    maxFrameSize?: number;
    parseJsonRpc?: boolean;
}
/**
 * Low-level transport probe for Model Context Protocol child process pipes.
 * Tees stdout/stdin streams into a circular ring buffer without blocking execution.
 */
export declare class StdioTap extends EventEmitter {
    private readonly ringBuffer;
    private readonly inScanner;
    private readonly outScanner;
    private readonly pendingRequests;
    private sequenceCounter;
    private parseJsonRpc;
    constructor(options?: StdioTapOptions);
    /**
     * Attaches stream tap directly to a child process's stdio streams.
     */
    attach(stdin: Writable, stdout: Readable): void;
    private handleFrame;
    getRingBuffer(): WireRingBuffer;
}
//# sourceMappingURL=stdio_tap.d.ts.map