import { NdjsonScanner } from "../dist/framing/ndjson_scanner.js";
import { WireRingBuffer } from "../dist/ringbuffer/ring.js";
import { WireDirection } from "../dist/types.js";

console.log("=================================================");
console.log("@clardan/wire-mux: Micro-Benchmark Harness v0.4.1");
console.log("Transport: In-Memory Zero-Copy NDJSON Wire Tap");
console.log("=================================================\n");

const ring = new WireRingBuffer(16 * 1024 * 1024); // 16MB ring
const scanner = new NdjsonScanner();

let framesProcessed = 0;
scanner.on("frame", (buf) => {
  framesProcessed++;
  ring.push(WireDirection.INCOMING, buf, framesProcessed, process.hrtime.bigint());
});

const samplePayload = Buffer.from(
  JSON.stringify({
    jsonrpc: "2.0",
    id: "tx_90124",
    method: "tools/call",
    params: {
      name: "query_ledger",
      arguments: {
        customer_id: "cust_8819",
        limit: 50,
        include_audit: true,
      },
    },
  }) + "\n"
);

const ITERATIONS = 200_000;
const totalBytes = samplePayload.byteLength * ITERATIONS;

console.log(`Feeding ${ITERATIONS.toLocaleString()} NDJSON frames (${(totalBytes / 1024 / 1024).toFixed(2)} MB)...`);

const start = process.hrtime.bigint();

// Feed in 8KB chunks to simulate pipe buffering
const CHUNK_SIZE = 8192;
const bufferPool = Buffer.alloc(CHUNK_SIZE);
let chunkOffset = 0;

for (let i = 0; i < ITERATIONS; i++) {
  scanner.feed(samplePayload);
}

const elapsedNs = process.hrtime.bigint() - start;
const elapsedSec = Number(elapsedNs) / 1e9;
const mbs = (totalBytes / 1024 / 1024) / elapsedSec;
const fps = framesProcessed / elapsedSec;

console.log(`\nResults:`);
console.log(`- Elapsed time:        ${(elapsedSec * 1000).toFixed(2)} ms`);
console.log(`- Frames processed:    ${framesProcessed.toLocaleString()}`);
console.log(`- Throughput:          ${mbs.toFixed(2)} MB/s`);
console.log(`- Frame Rate:          ${fps.toFixed(0)} frames/sec`);
console.log(`- Buffer Overruns:     ${ring.getStats().overruns}`);
console.log(`- Average Frame Delta: ${(Number(elapsedNs) / framesProcessed / 1000).toFixed(2)} µs/frame\n`);
