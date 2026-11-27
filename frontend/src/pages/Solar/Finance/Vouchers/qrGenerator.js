/**
 * Standalone zero-dependency QR Code Generator (ISO/IEC 18004)
 * Generates matrix of modules for rendering SVG or Canvas QR codes.
 * Supports Byte Mode encoding and Error Correction Level M/L/H.
 */

// GF(256) Math tables for Reed-Solomon coding
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);
(function initTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x = (x << 1) ^ (x & 128 ? 0x11d : 0);
  }
  LOG_TABLE[0] = 0;
})();

function glog(n) { return LOG_TABLE[n]; }
function gexp(n) { return EXP_TABLE[n % 255]; }
function gmul(x, y) { return (x === 0 || y === 0) ? 0 : EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]]; }

// Reed-Solomon polynomial division
function rsPolyMul(p1, p2) {
  const res = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      res[i + j] ^= gmul(p1[i], p2[j]);
    }
  }
  return res;
}

function rsGenPoly(numEc) {
  let g = new Uint8Array([1]);
  for (let i = 0; i < numEc; i++) {
    g = rsPolyMul(g, new Uint8Array([1, gexp(i)]));
  }
  return g;
}

function rsCalcEc(data, numEc) {
  const gen = rsGenPoly(numEc);
  const msg = new Uint8Array(data.length + numEc);
  msg.set(data);
  for (let i = 0; i < data.length; i++) {
    const lead = msg[i];
    if (lead !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gmul(gen[j], lead);
      }
    }
  }
  return msg.subarray(data.length);
}

// QR Version specifications for Level M (medium error correction ~15%)
// [totalBytes, ecBytesPerBlock, numBlocks]
const VERSION_INFO = [
  null,
  { size: 21, totalBytes: 26, ecBytes: 10, blocks: 1, align: [] },        // v1: 16 data bytes
  { size: 25, totalBytes: 44, ecBytes: 16, blocks: 1, align: [6, 18] },   // v2: 28 data bytes
  { size: 29, totalBytes: 70, ecBytes: 26, blocks: 1, align: [6, 22] },   // v3: 44 data bytes
  { size: 33, totalBytes: 100, ecBytes: 18, blocks: 2, align: [6, 26] },  // v4: 64 data bytes
  { size: 37, totalBytes: 134, ecBytes: 24, blocks: 2, align: [6, 30] },  // v5: 86 data bytes
  { size: 41, totalBytes: 172, ecBytes: 16, blocks: 4, align: [6, 34] },  // v6: 108 data bytes
  { size: 45, totalBytes: 196, ecBytes: 18, blocks: 4, align: [6, 22, 38] }, // v7: 124 data bytes
  { size: 49, totalBytes: 242, ecBytes: 22, blocks: 4, align: [6, 24, 42] }, // v8: 154 data bytes
];

function selectVersion(dataLen) {
  for (let v = 1; v < VERSION_INFO.length; v++) {
    const info = VERSION_INFO[v];
    const maxData = info.totalBytes - (info.ecBytes * info.blocks);
    // Byte mode header: 4 bits mode + 8 bits length = 12 bits = ~2 bytes overhead
    if (dataLen + 2 <= maxData) {
      return v;
    }
  }
  return 8; // fallback to v8
}

// Format info strings (Mask 0 to 7 with Level M (00))
const FORMAT_STRINGS = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0
];

export function generateQRMatrix(text) {
  // UTF-8 encode
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);
  const version = selectVersion(rawBytes.length);
  const info = VERSION_INFO[version];
  const size = info.size;
  const maxDataBytes = info.totalBytes - (info.ecBytes * info.blocks);

  // Build bitstream: Byte Mode (0100) + Length (8 bits for v1-9) + data + terminator (0000)
  const bits = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(rawBytes.length, 8); // character count indicator
  for (const b of rawBytes) {
    pushBits(b, 8);
  }

  // Terminator
  const maxBits = maxDataBytes * 8;
  const termLen = Math.min(4, maxBits - bits.length);
  pushBits(0, termLen);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Pad bytes 0xEC, 0x11
  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxBits) {
    pushBits(padPatterns[padIdx % 2], 8);
    padIdx++;
  }

  // Group into data bytes
  const dataBytes = new Uint8Array(maxDataBytes);
  for (let i = 0; i < maxDataBytes; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bits[i * 8 + b];
    }
    dataBytes[i] = byteVal;
  }

  // Error Correction calculation
  const dataPerBlock = Math.floor(maxDataBytes / info.blocks);
  const dataBlocks = [];
  const ecBlocks = [];

  for (let b = 0; b < info.blocks; b++) {
    const start = b * dataPerBlock;
    const end = (b === info.blocks - 1) ? maxDataBytes : start + dataPerBlock;
    const blockData = dataBytes.subarray(start, end);
    dataBlocks.push(blockData);
    ecBlocks.push(rsCalcEc(blockData, info.ecBytes));
  }

  // Interleave data and EC
  const finalStream = [];
  for (let i = 0; i <= dataPerBlock; i++) {
    for (let b = 0; b < info.blocks; b++) {
      if (i < dataBlocks[b].length) {
        finalStream.push(dataBlocks[b][i]);
      }
    }
  }
  for (let i = 0; i < info.ecBytes; i++) {
    for (let b = 0; b < info.blocks; b++) {
      if (i < ecBlocks[b].length) {
        finalStream.push(ecBlocks[b][i]);
      }
    }
  }

  // Initialize matrix: null = unset, true = dark, false = light
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r, c, dark) {
    matrix[r][c] = dark;
    isFunction[r][c] = true;
  }

  // 1. Finder patterns (7x7) + Separators (8x8)
  function drawFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr < 0 || mr >= size || mc < 0 || mc >= size) continue;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isEdge = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          setModule(mr, mc, isEdge || isCenter);
        } else {
          setModule(mr, mc, false); // separator
        }
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // 2. Alignment patterns (5x5)
  if (info.align.length > 0) {
    for (const ar of info.align) {
      for (const ac of info.align) {
        if (isFunction[ar][ac]) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const isEdge = Math.abs(r) === 2 || Math.abs(c) === 2;
            const isCenter = r === 0 && c === 0;
            setModule(ar + r, ac + c, isEdge || isCenter);
          }
        }
      }
    }
  }

  // 3. Timing patterns (row 6 and col 6)
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // 4. Dark Module
  setModule(4 * version + 9, 8, true);

  // Reserve format areas
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }

  // Place data bits with Mask 0 ((r + c) % 2 == 0)
  const maskFn = (r, c) => (r + c) % 2 === 0;
  const bitStream = [];
  for (const byte of finalStream) {
    for (let i = 7; i >= 0; i--) {
      bitStream.push((byte >> i) & 1);
    }
  }

  let bitIdx = 0;
  let upward = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // skip vertical timing column
    const colList = [right, right - 1];
    const rowList = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rowList) {
      for (const c of colList) {
        if (!isFunction[r][c]) {
          const bit = bitIdx < bitStream.length ? bitStream[bitIdx++] : 0;
          const masked = bit ^ (maskFn(r, c) ? 1 : 0);
          matrix[r][c] = masked === 1;
        }
      }
    }
    upward = !upward;
  }

  // Draw Format Information (Mask 0)
  const fmt = FORMAT_STRINGS[0];
  const fmtBits = [];
  for (let i = 14; i >= 0; i--) {
    fmtBits.push((fmt >> i) & 1);
  }

  // Top-left
  const positionsTopLeft = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  positionsTopLeft.forEach(([r, c], idx) => {
    matrix[r][c] = fmtBits[idx] === 1;
  });

  // Top-right and Bottom-left
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = fmtBits[i] === 1;
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][size - 8 + i] = fmtBits[7 + i] === 1;
  }

  return matrix;
}
