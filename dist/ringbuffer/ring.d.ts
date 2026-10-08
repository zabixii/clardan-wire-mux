import { WireDirection } from "../types.js";
/**
 * Pre-allocated circular ring buffer for zero-allocation telemetry recording.
 * Overwrites oldest frames when capacity is saturated.
 */
export declare class WireRingBuffer {
    private readonly buffer;
    private readonly capacity;
    private headOffset;
    private tailOffset;
    private frameCount;
    private overruns;
    static readonly HEADER_SIZE = 20;
    static readonly MAGIC = 17229;
    constructor(capacityBytes?: number);
    /**
     * Appends an uncompressed wire frame directly into the ring buffer.
     */
    push(direction: WireDirection, payload: Uint8Array, seq: number, timestampNs: bigint): void;
    getStats(): {
        framesStored: number;
        overruns: number;
        headOffset: number;
        capacity: number;
    };
    clear(): void;
}
//# sourceMappingURL=ring.d.ts.map