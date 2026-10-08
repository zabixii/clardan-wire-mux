import { EventEmitter } from "node:events";
import { NdjsonScanner } from "../framing/ndjson_scanner.js";
import { WireRingBuffer } from "../ringbuffer/ring.js";
import { WireDirection } from "../types.js";
/**
 * Low-level transport probe for Model Context Protocol child process pipes.
 * Tees stdout/stdin streams into a circular ring buffer without blocking execution.
 */
export class StdioTap extends EventEmitter {
    ringBuffer;
    inScanner;
    outScanner;
    pendingRequests = new Map();
    sequenceCounter = 0;
    parseJsonRpc;
    constructor(options = {}) {
        super();
        this.ringBuffer = new WireRingBuffer(options.bufferCapacity ?? 8 * 1024 * 1024);
        this.inScanner = new NdjsonScanner(options.maxFrameSize);
        this.outScanner = new NdjsonScanner(options.maxFrameSize);
        this.parseJsonRpc = options.parseJsonRpc ?? true;
        this.inScanner.on("frame", (buf) => this.handleFrame(WireDirection.INCOMING, buf));
        this.outScanner.on("frame", (buf) => this.handleFrame(WireDirection.OUTGOING, buf));
    }
    /**
     * Attaches stream tap directly to a child process's stdio streams.
     */
    attach(stdin, stdout) {
        // Intercept outbound client writes (requests to server)
        const origWrite = stdin.write.bind(stdin);
        stdin.write = (chunk, encoding, cb) => {
            if (Buffer.isBuffer(chunk)) {
                this.inScanner.feed(chunk);
            }
            else if (typeof chunk === "string") {
                this.inScanner.feed(Buffer.from(chunk, typeof encoding === "string" ? encoding : "utf-8"));
            }
            return origWrite(chunk, encoding, cb);
        };
        // Intercept inbound server output (responses from server)
        stdout.on("data", (chunk) => {
            this.outScanner.feed(chunk);
        });
    }
    handleFrame(direction, rawBuffer) {
        const timestampNs = process.hrtime.bigint();
        const seq = ++this.sequenceCounter;
        this.ringBuffer.push(direction, rawBuffer, seq, timestampNs);
        let latencyNs;
        let envelope = null;
        if (this.parseJsonRpc) {
            try {
                envelope = JSON.parse(rawBuffer.toString("utf-8"));
                if (envelope && envelope.id !== undefined && envelope.id !== null) {
                    if (direction === WireDirection.INCOMING) {
                        // Track request issue timestamp
                        this.pendingRequests.set(envelope.id, timestampNs);
                    }
                    else if (direction === WireDirection.OUTGOING) {
                        // Calculate round-trip latency delta
                        const issuedAt = this.pendingRequests.get(envelope.id);
                        if (issuedAt !== undefined) {
                            latencyNs = timestampNs - issuedAt;
                            this.pendingRequests.delete(envelope.id);
                        }
                    }
                }
            }
            catch {
                // Non-JSON diagnostic frames or unparsed logs
            }
        }
        const packet = {
            header: {
                magic: WireRingBuffer.MAGIC,
                version: 1,
                direction,
                payloadLength: rawBuffer.byteLength,
                timestampNs,
                sequenceId: seq,
            },
            payload: rawBuffer,
            latencyNs,
        };
        this.emit("packet", packet, envelope);
    }
    getRingBuffer() {
        return this.ringBuffer;
    }
}
//# sourceMappingURL=stdio_tap.js.map