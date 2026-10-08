/**
 * @clardan/wire-mux - Core Protocol & Transport Types
 * Specification Reference: Model Context Protocol (MCP) 2024-11-05
 */
export declare enum WireDirection {
    INCOMING = 1,// Client -> Server (tools/call, ping, list)
    OUTGOING = 2
}
export interface WireFrameHeader {
    magic: number;
    version: number;
    direction: WireDirection;
    payloadLength: number;
    timestampNs: bigint;
    sequenceId: number;
}
export interface RawWirePacket {
    header: WireFrameHeader;
    payload: Buffer;
    latencyNs?: bigint;
}
export interface JsonRpcEnvelope {
    jsonrpc: "2.0";
    id?: string | number | null;
    method?: string;
    params?: Record<string, unknown>;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}
export interface TapTelemetryStats {
    bytesProcessed: number;
    framesCaptured: number;
    bufferOverruns: number;
    activeSubprocesses: number;
    p50LatencyMicros: number;
    p99LatencyMicros: number;
}
//# sourceMappingURL=types.d.ts.map