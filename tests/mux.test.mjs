import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { StdioTap } from "../dist/transport/stdio_tap.js";
import { NdjsonScanner } from "../dist/framing/ndjson_scanner.js";
import { WireRingBuffer } from "../dist/ringbuffer/ring.js";
import { WireDirection } from "../dist/types.js";

describe("clardan-wire-mux core tests", () => {
  it("scans chunked newline-delimited JSON frames across boundaries", () => {
    const scanner = new NdjsonScanner();
    const frames = [];
    scanner.on("frame", (f) => frames.push(f.toString("utf-8")));

    // Split packet in half
    scanner.feed(Buffer.from('{"jsonrpc":"2.0","method":"tools/'));
    scanner.feed(Buffer.from('list","id":1}\n{"jsonrpc":"2.0","result":[]}\r\n'));

    assert.equal(frames.length, 2);
    assert.deepEqual(JSON.parse(frames[0]), { jsonrpc: "2.0", method: "tools/list", id: 1 });
    assert.deepEqual(JSON.parse(frames[1]), { jsonrpc: "2.0", result: [] });
  });

  it("appends to circular ring buffer with zero allocations", () => {
    const ring = new WireRingBuffer(1024);
    const payload = Buffer.from('{"method":"ping"}');

    ring.push(WireDirection.INCOMING, payload, 1, 1000n);
    ring.push(WireDirection.OUTGOING, payload, 2, 2000n);

    const stats = ring.getStats();
    assert.equal(stats.framesStored, 2);
    assert.equal(stats.overruns, 0);
  });

  it("taps and pairs JSON-RPC request and response latency", (t, done) => {
    const tap = new StdioTap();
    const stdin = new PassThrough();
    const stdout = new PassThrough();

    tap.attach(stdin, stdout);

    let incomingChecked = false;

    tap.on("packet", (packet, envelope) => {
      if (packet.header.direction === WireDirection.INCOMING) {
        assert.equal(envelope.id, 42);
        incomingChecked = true;
      } else if (packet.header.direction === WireDirection.OUTGOING) {
        assert.equal(envelope.id, 42);
        assert.equal(typeof packet.latencyNs, "bigint");
        assert.ok(packet.latencyNs >= 0n);
        assert.ok(incomingChecked);
        done();
      }
    });

    stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 42, method: "tools/call", params: { name: "test" } }) + "\n");
    setTimeout(() => {
      stdout.write(JSON.stringify({ jsonrpc: "2.0", id: 42, result: { content: [{ type: "text", text: "ok" }] } }) + "\n");
    }, 10);
  });
});
