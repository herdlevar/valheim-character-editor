// Valheim ZPackage Binary Reader and Writer

export function getStableHashCode(str: string): number {
  let num1 = 5381;
  let num2 = num1;
  let i = 0;
  const n = str.length;

  const int32 = (x: number): number => (x | 0);

  while (i < n && str.charCodeAt(i) !== 0) {
    const c1 = str.charCodeAt(i);
    num1 = int32(int32(int32(num1 << 5) + num1) ^ c1);
    if (i === n - 1 || str.charCodeAt(i + 1) === 0) break;
    const c2 = str.charCodeAt(i + 1);
    num2 = int32(int32(int32(num2 << 5) + num2) ^ c2);
    i += 2;
  }
  return int32(num1 + Math.imul(num2, 1566083941));
}

export class ZPackageReader {
  private view: DataView;
  private offset: number = 0;
  private bytes: Uint8Array;
  private utf8Decoder: TextDecoder = new TextDecoder('utf-8');

  constructor(buffer: ArrayBuffer | Uint8Array) {
    if (buffer instanceof Uint8Array) {
      this.bytes = buffer;
      this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else {
      this.bytes = new Uint8Array(buffer);
      this.view = new DataView(buffer);
    }
  }

  getOffset(): number {
    return this.offset;
  }

  setOffset(offset: number): void {
    this.offset = offset;
  }

  getRemaining(): number {
    return this.bytes.byteLength - this.offset;
  }

  readByte(): number {
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  readBool(): boolean {
    return this.readByte() !== 0;
  }

  readShort(): number {
    const val = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return val;
  }

  readUShort(): number {
    const val = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return val;
  }

  readInt(): number {
    const val = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return val;
  }

  readLong(): bigint {
    const val = this.view.getBigInt64(this.offset, true);
    this.offset += 8;
    return val;
  }

  readFloat(): number {
    const val = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return val;
  }

  readVec3(): [number, number, number] {
    const x = this.readFloat();
    const y = this.readFloat();
    const z = this.readFloat();
    return [x, y, z];
  }

  readString(): string {
    let count = 0;
    let shift = 0;
    while (true) {
      const b = this.readByte();
      count |= (b & 0x7f) << shift;
      shift += 7;
      if ((b & 0x80) === 0) break;
    }
    if (count === 0) return '';
    const slice = this.bytes.subarray(this.offset, this.offset + count);
    this.offset += count;
    return this.utf8Decoder.decode(slice);
  }

  readBytes(length?: number): Uint8Array {
    const len = length !== undefined ? length : this.readInt();
    const slice = this.bytes.subarray(this.offset, this.offset + len);
    this.offset += len;
    return new Uint8Array(slice);
  }

  readDict(): Record<string, number> {
    const count = this.readInt();
    const dict: Record<string, number> = {};
    for (let i = 0; i < count; i++) {
      const k = this.readString();
      const v = this.readFloat();
      dict[k] = v;
    }
    return dict;
  }

  readStringDict(): Record<string, string> {
    const count = this.readInt();
    const dict: Record<string, string> = {};
    for (let i = 0; i < count; i++) {
      const k = this.readString();
      const v = this.readString();
      dict[k] = v;
    }
    return dict;
  }
}

export class ZPackageWriter {
  private buffer: Uint8Array;
  private view: DataView;
  private offset: number = 0;
  private utf8Encoder: TextEncoder = new TextEncoder();

  constructor(initialCapacity: number = 65536) {
    this.buffer = new Uint8Array(initialCapacity);
    this.view = new DataView(this.buffer.buffer);
  }

  private ensureCapacity(needed: number): void {
    if (this.offset + needed > this.buffer.byteLength) {
      let newSize = Math.max(this.buffer.byteLength * 2, this.offset + needed + 1024);
      const newBuf = new Uint8Array(newSize);
      newBuf.set(this.buffer.subarray(0, this.offset));
      this.buffer = newBuf;
      this.view = new DataView(this.buffer.buffer);
    }
  }

  writeByte(val: number): void {
    this.ensureCapacity(1);
    this.view.setUint8(this.offset, val & 0xff);
    this.offset += 1;
  }

  writeBool(val: boolean): void {
    this.writeByte(val ? 1 : 0);
  }

  writeShort(val: number): void {
    this.ensureCapacity(2);
    this.view.setInt16(this.offset, val, true);
    this.offset += 2;
  }

  writeUShort(val: number): void {
    this.ensureCapacity(2);
    this.view.setUint16(this.offset, val, true);
    this.offset += 2;
  }

  writeInt(val: number): void {
    this.ensureCapacity(4);
    this.view.setInt32(this.offset, val, true);
    this.offset += 4;
  }

  writeLong(val: bigint): void {
    this.ensureCapacity(8);
    this.view.setBigInt64(this.offset, val, true);
    this.offset += 8;
  }

  writeFloat(val: number): void {
    this.ensureCapacity(4);
    this.view.setFloat32(this.offset, val, true);
    this.offset += 4;
  }

  writeVec3(vec: [number, number, number]): void {
    this.writeFloat(vec[0]);
    this.writeFloat(vec[1]);
    this.writeFloat(vec[2]);
  }

  writeString(str: string): void {
    const encoded = this.utf8Encoder.encode(str);
    let n = encoded.length;
    while (n >= 0x80) {
      this.writeByte((n & 0x7f) | 0x80);
      n >>= 7;
    }
    this.writeByte(n);
    if (encoded.length > 0) {
      this.ensureCapacity(encoded.length);
      this.buffer.set(encoded, this.offset);
      this.offset += encoded.length;
    }
  }

  writeBytes(bytes: Uint8Array, writePrefix: boolean = true): void {
    if (writePrefix) {
      this.writeInt(bytes.byteLength);
    }
    this.ensureCapacity(bytes.byteLength);
    this.buffer.set(bytes, this.offset);
    this.offset += bytes.byteLength;
  }

  writeDict(dict: Record<string, number>): void {
    const keys = Object.keys(dict);
    this.writeInt(keys.length);
    for (const k of keys) {
      this.writeString(k);
      this.writeFloat(dict[k]);
    }
  }

  writeStringDict(dict: Record<string, string>): void {
    const keys = Object.keys(dict);
    this.writeInt(keys.length);
    for (const k of keys) {
      this.writeString(k);
      this.writeString(dict[k]);
    }
  }

  getBytes(): Uint8Array {
    return this.buffer.subarray(0, this.offset);
  }
}
