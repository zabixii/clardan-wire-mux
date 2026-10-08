import { RawWirePacket, WireFrameHeader, WireDirection } from "../types.js";

/**
 * Pre-allocated circular ring buffer for zero-allocation telemetry recording.
 * Overwrites oldest frames when capacity is saturated.
 */
export class WireRingBuffer {
  private readonly buffer: Buffer;
  private readonly capacity: number;
  private headOffset = 0;
  private tailOffset = 0;
  private frameCount = 0;
  private overruns = 0;

  // Header byte layout: 2B magic + 1B ver + 1B dir + 4B len + 8B ts + 4B seq = 20 Bytes
  public static readonly HEADER_SIZE = 20;
  public static readonly MAGIC = 0x434d;

  constructor(capacityBytes: number = 8 * 1024 * 1024) {
    this.capacity = capacityBytes;
    this.buffer = Buffer.allocUnsafe(capacityBytes);
  }

  /**
   * Appends an uncompressed wire frame directly into the ring buffer.
   */
  public push(
    direction: WireDirection,
    payload: Uint8Array,
    seq: number,
    timestampNs: bigint
  ): void {
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

  public getStats(): { framesStored: number; overruns: number; headOffset: number; capacity: number } {
    return {
      framesStored: this.frameCount,
      overruns: this.overruns,
      headOffset: this.headOffset,
      capacity: this.capacity,
    };
  }

  public clear(): void {
    this.headOffset = 0;
    this.tailOffset = 0;
    this.frameCount = 0;
    this.overruns = 0;
  }
}
