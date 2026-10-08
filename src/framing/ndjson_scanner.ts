import { EventEmitter } from "node:events";

/**
 * High-performance byte scanner for Model Context Protocol stdio framing.
 * MCP transports enforce newline-delimited JSON-RPC 2.0 payloads.
 */
export class NdjsonScanner extends EventEmitter {
  private scratch: Buffer;
  private scratchLen = 0;
  private maxFrameSize: number;

  constructor(maxFrameSize: number = 16 * 1024 * 1024) {
    super();
    this.maxFrameSize = maxFrameSize;
    this.scratch = Buffer.allocUnsafe(64 * 1024); // Initial 64KB buffer
  }

  public feed(chunk: Buffer): void {
    let start = 0;

    for (let i = 0; i < chunk.length; i++) {
      if (chunk[i] === 0x0a) { // '\n' LF
        let frame: Buffer;

        if (this.scratchLen > 0) {
          const sliceLen = i - start;
          this.ensureScratch(this.scratchLen + sliceLen);
          chunk.copy(this.scratch, this.scratchLen, start, i);
          this.scratchLen += sliceLen;

          // Strip trailing '\r' if present
          let finalLen = this.scratchLen;
          if (finalLen > 0 && this.scratch[finalLen - 1] === 0x0d) {
            finalLen--;
          }

          frame = Buffer.allocUnsafe(finalLen);
          this.scratch.copy(frame, 0, 0, finalLen);
          this.scratchLen = 0;
        } else {
          let end = i;
          if (end > start && chunk[end - 1] === 0x0d) { // Strip CR
            end--;
          }
          frame = chunk.subarray(start, end);
        }

        start = i + 1;

        if (frame.length > 0) {
          this.emit("frame", frame);
        }
      }
    }

    // Retain trailing partial data in scratch buffer
    if (start < chunk.length) {
      const remaining = chunk.length - start;
      this.ensureScratch(this.scratchLen + remaining);
      chunk.copy(this.scratch, this.scratchLen, start, chunk.length);
      this.scratchLen += remaining;

      if (this.scratchLen > this.maxFrameSize) {
        this.emit("error", new Error(`Frame length ${this.scratchLen} exceeds limit ${this.maxFrameSize}`));
        this.scratchLen = 0;
      }
    }
  }

  private ensureScratch(needed: number): void {
    if (needed > this.scratch.length) {
      let nextSize = this.scratch.length * 2;
      while (nextSize < needed) {
        nextSize *= 2;
      }
      const nextBuf = Buffer.allocUnsafe(nextSize);
      this.scratch.copy(nextBuf, 0, 0, this.scratchLen);
      this.scratch = nextBuf;
    }
  }

  public reset(): void {
    this.scratchLen = 0;
  }
}
