type ZipFile = {
  path: string;
  content: string;
};

const encoder = new TextEncoder();

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(output: number[], value: number) {
  output.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(output: number[], value: number) {
  output.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function writeBytes(output: number[], bytes: Uint8Array) {
  for (const byte of bytes) output.push(byte);
}

export function createZip(files: ZipFile[]) {
  const output: number[] = [];
  const central: number[] = [];
  const records: { pathBytes: Uint8Array; bytes: Uint8Array; crc: number; offset: number }[] = [];

  for (const file of files) {
    const pathBytes = encoder.encode(file.path);
    const bytes = encoder.encode(file.content);
    const crc = crc32(bytes);
    const offset = output.length;
    records.push({ pathBytes, bytes, crc, offset });

    writeUint32(output, 0x04034b50);
    writeUint16(output, 20);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint32(output, crc);
    writeUint32(output, bytes.length);
    writeUint32(output, bytes.length);
    writeUint16(output, pathBytes.length);
    writeUint16(output, 0);
    writeBytes(output, pathBytes);
    writeBytes(output, bytes);
  }

  const centralOffset = output.length;
  for (const record of records) {
    writeUint32(central, 0x02014b50);
    writeUint16(central, 20);
    writeUint16(central, 20);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, record.crc);
    writeUint32(central, record.bytes.length);
    writeUint32(central, record.bytes.length);
    writeUint16(central, record.pathBytes.length);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, 0);
    writeUint32(central, record.offset);
    writeBytes(central, record.pathBytes);
  }

  writeBytes(output, Uint8Array.from(central));
  writeUint32(output, 0x06054b50);
  writeUint16(output, 0);
  writeUint16(output, 0);
  writeUint16(output, records.length);
  writeUint16(output, records.length);
  writeUint32(output, central.length);
  writeUint32(output, centralOffset);
  writeUint16(output, 0);

  return Buffer.from(output);
}
