/**
 * Pre-allocated circular ring buffer for zero-allocation telemetry recording.
 * Overwrites oldest frames when capacity is saturated.
 */
export class WireRingBuffer {
    buffer;
    capacity;
    headOffset = 0;
    tailOffset = 0;
    frameCount = 0;
    overruns = 0;
    // Header byte layout: 2B magic + 1B ver + 1B dir + 4B len + 8B ts + 4B seq = 20 Bytes
    static HEADER_SIZE = 20;
    static MAGIC = 0x434d;
    constructor(capacityBytes = 8 * 1024 * 1024) {
        this.capacity = capacityBytes;
        this.buffer = Buffer.allocUnsafe(capacityBytes);
    }
    /**
     * Appends an uncompressed wire frame directly into the ring buffer.
     */
    push(direction, payload, seq, timestampNs) {
        const payloadLen = payload.byteLength;
        const totalSlotSize = WireRingBuffer.HEADER_SIZE + payloadLen;
        if (totalSlotSize > this.capacity) {
            throw new Error(`Frame payload exceeds buffer capacity: ${totalSlotSize} > ${this.capacity}`);
        }
        // Handle wrap-around boundary check
        if (this.headOffset + totalSlotSize > this.capacity) {
            this.headOffset = 0;
            this.overruns++;
        }
        // Write binary frame header
        this.buffer.writeUInt16BE(WireRingBuffer.MAGIC, this.headOffset);
        this.buffer.writeUInt8(1, this.headOffset + 2); // version 1
        this.buffer.writeUInt8(direction, this.headOffset + 3);
        this.buffer.writeUInt32BE(payloadLen, this.headOffset + 4);
        this.buffer.writeBigUInt64BE(timestampNs, this.headOffset + 8);
        this.buffer.writeUInt32BE(seq, this.headOffset + 16);
        // Copy payload bytes without intermediate allocations
        this.buffer.set(payload, this.headOffset + WireRingBuffer.HEADER_SIZE);
        this.headOffset += totalSlotSize;
        this.frameCount++;
    }
    getStats() {
        return {
            framesStored: this.frameCount,
            overruns: this.overruns,
            headOffset: this.headOffset,
            capacity: this.capacity,
        };
    }
    clear() {
        this.headOffset = 0;
        this.tailOffset = 0;
        this.frameCount = 0;
        this.overruns = 0;
    }
}
//# sourceMappingURL=ring.js.map