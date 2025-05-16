declare module 'buffer-layout' {
  export interface Layout<T = any> {
    span: number;
    decode(b: Buffer, offset?: number): T;
    encode(src: T, b: Buffer, offset?: number): number;
  }
  export const u8: Layout<number>;
  export const s8: Layout<number>;
  export const u16: Layout<number>;
  export const s16: Layout<number>;
  export const u32: Layout<number>;
  export const s32: Layout<number>;
  export const f32: Layout<number>;
  export const f64: Layout<number>;
  export function struct<T>(fields: any[], property?: string, decodePrefixes?: any): Layout<T>;
  // Add any other types or exports as needed
}

declare module 'bn.js' {
  class BN {
    constructor(value: number | string | number[] | Buffer, base?: number, endian?: string);
    toString(base?: number): string;
    toNumber(): number;
    toArray(endian?: string, length?: number): number[];
    toBuffer(endian?: string, length?: number): Buffer;
    // Add more methods as needed
  }
  namespace BN {
    type Endianness = 'le' | 'be';
  }
  export = BN;
}

declare module '@sinonjs/fake-timers'; 