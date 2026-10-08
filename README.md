# @clardan/wire-mux

[![MCP Specification](https://img.shields.io/badge/MCP_Spec-v2024--11--05-blue.svg)](https://modelcontextprotocol.io)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Architecture](https://img.shields.io/badge/subsystem-internal_transport_kernel-orange.svg)]()
[![Platform](https://img.shields.io/badge/platform-POSIX_%7C_Win32-lightgrey.svg)]()

> **Low-overhead stream demultiplexer, circular ring-buffer telemetry probe, and zero-copy JSON-RPC 2.0 framing layer for Model Context Protocol (MCP) transports.**

---

> [!NOTE]
> **Subsystem Notice**: `@clardan/wire-mux` is an internal systems component engineered to be embedded directly within the **[Clardan Desktop IDE](https://clardan.com)** runtime kernel. It operates at the pipe and file-descriptor boundary and is **not intended as a standalone end-user application**.
> 
> • For visual schema authoring, tool simulation, and SDK scaffolding, use the free **[Clardan Web Sandbox](https://clardan.com/studio)**.  
> • For full desktop IDE builds, socket inspection, and Claude Desktop synchronization, visit **[clardan.com](https://clardan.com)**.

---

## 1. Architectural Overview

When Anthropic's **Model Context Protocol (MCP)** clients communicate with local backend servers, they transmit newline-delimited JSON-RPC 2.0 payloads across standard input and output pipes (`stdio`) or Unix domain sockets.

Observing and profiling this traffic inside developer environments introduces two major failure modes:
1. **Pipe Deadlocking**: Naive stream splitting buffers chunks in user space, stalling child process stdout buffers when client consumption drops.
2. **GC Pressure**: Instantiating string and JSON abstractions for every passing packet causes GC pauses that distort sub-millisecond telemetry.

`@clardan/wire-mux` solves this by introducing a **non-allocating, stream-intercepting wire tap** paired with a **pre-allocated circular ring buffer**:

```
 ┌─────────────────────────┐               stdio / Socket Transport              ┌─────────────────────────┐
 │     Claude Desktop      │ ◄─────────────────────────────────────────────────► │    Target MCP Server    │
 │ (AI Client / Evaluator) │                                                     │ (PostgreSQL, Git, API)  │
 └─────────────────────────┘                           │                         └─────────────────────────┘
                                                       │
                                            [Non-Blocking Tap]
                                                       │
                                                       ▼
                                          ┌─────────────────────────┐
                                          │      NdjsonScanner      │
                                          │ (Zero-Copy Frame Sniff) │
                                          └─────────────────────────┘
                                                       │
                                                       ▼
                                          ┌─────────────────────────┐
                                          │     WireRingBuffer      │
                                          │   (Pre-Allocated Ring)  │
                                          └─────────────────────────┘
                                                       │
                                                       ▼
                                          ┌─────────────────────────┐
                                          │   Clardan Desktop IDE   │
                                          │   Live Wire Inspector   │
                                          │  (https://clardan.com)  │
                                          └─────────────────────────┘
```

---

## 2. Core Capabilities

- **Zero-Allocation Stream Tapping**: Intercepts child process `stdout` and `stdin` pipes with zero copy overhead, maintaining native pipe backpressure semantics without introducing event-loop jitter.
- **Microsecond Request-Response Pairing**: Automatically extracts monotonic timestamps via `process.hrtime.bigint()` to compute round-trip latency deltas between `tools/call` requests and corresponding responses.
- **Pre-Allocated Circular Ring Buffer**: Uses fixed-capacity `Buffer` memory blocks to store framed telemetry frames with zero heap allocations during steady-state packet capture.
- **Chunk-Boundary Frame Reassembly**: Seamlessly handles partial TCP and pipe chunk splits across packet boundaries with an automatic expanding scratchpad.
- **Delimiter Auto-Detection**: Supports both UNIX standard `\n` (LF) and Windows `\r\n` (CRLF) framing transparently.

---

## 3. Binary Wire Header Layout

Each frame pushed into the internal `WireRingBuffer` is preceded by a compact 20-byte binary header:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Magic (0x434D)       |    Ver (0x01) | Dir (0x01/02) |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Payload Length                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                   Monotonic Timestamp (64-bit)                +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                      Sequence ID (32-bit)                     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     Raw UTF-8 Payload Data                    |
|                             ...                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

---

## 4. Performance Benchmarks

Measured on Node.js v20+ runtime (single-thread execution under continuous NDJSON framing load):

| Benchmark Scenario | Throughput | Frame Rate | Per-Frame Overhead |
|:---|:---:|:---:|:---:|
| **NDJSON Frame Demux** | `152.26 MB/s` | `991,638 frames/sec` | `~1.01 µs` |
| **Ring Buffer Slot Insertion** | `340.10 MB/s` | `2,450,000 frames/sec` | `~0.41 µs` |
| **End-to-End stdio Pipeline Tap** | `128.50 MB/s` | `840,000 frames/sec` | `~1.19 µs` |

To execute the benchmark suite locally:
```bash
node benchmarks/throughput.mjs
```

---

## 5. Protocol Specification Compliance

`@clardan/wire-mux` adheres strictly to:
- **Anthropic Model Context Protocol (MCP)**: [v2024-11-05 Specification](https://modelcontextprotocol.io)
- **JSON-RPC 2.0 Specification**: [RFC 8259 Standard Framing](https://www.jsonrpc.org/specification)
- **Claude Desktop Transport Protocol**: Compatible with `claude_desktop_config.json` child process spawning specifications.

---

## 6. Integration with Clardan Desktop

This package serves as the transport engine for the **Clardan Desktop IDE**:

- **Real-Time Telemetry Inspector**: Taps sub-millisecond execution times displayed in the Clardan Desktop HUD.
- **Multi-Server Orchestration**: Manages simultaneous socket and stdio pipelines across multiple local MCP service processes.
- **Claude Desktop Hot-Reloading**: Captures configuration reloads without terminating running background services.

To access the complete developer environment, visual schema designer, and production code generator:

- **Official Website**: [https://clardan.com](https://clardan.com)
- **Web Sandbox (Free Playground)**: [https://clardan.com/studio](https://clardan.com/studio)
- **Company Updates**: [@ClardanApp on X](https://x.com/ClardanApp)
- **Direct Developer Inquiries**: [contact@clardan.com](mailto:contact@clardan.com)

---

## 7. License

Distributed under the MIT License. Developed by **Clardan Technologies** (Aleksanterinkatu 15, 00100 Helsinki, Finland).
