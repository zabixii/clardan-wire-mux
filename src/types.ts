/**
 * @clardan/wire-mux - Core Protocol & Transport Types
 * Specification Reference: Model Context Protocol (MCP) 2024-11-05
 */

export enum WireDirection {
  INCOMING = 0x01, // Client -> Server (tools/call, ping, list)
  OUTGOING = 0x02, // Server -> Client (200 OK, errors, notifications)
}

export interface WireFrameHeader {
  magic: number;          // 0x434D ('CM')
  version: number;        // Protocol revision (current: 1)
  direction: WireDirection;
  payloadLength: number;  // In bytes
  timestampNs: bigint;    // High-resolution monotonic clock (process.hrtime.bigint)
  sequenceId: number;     // Monotonic incrementing 32-bit frame counter
}

export interface RawWirePacket {
  header: WireFrameHeader;
  payload: Buffer;
  latencyNs?: bigint;     // Measured delta if paired with matching request ID
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
