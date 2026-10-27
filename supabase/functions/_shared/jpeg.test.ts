import { assertEquals, assertThrows } from 'jsr:@std/assert@1.0.13';
import { stripJpegMetadata } from './jpeg.ts';

const segment = (marker: number, payload: number[]) => [0xff, marker, 0, payload.length + 2, ...payload];

Deno.test('removes EXIF and comment segments, keeps JFIF and image data', () => {
  const jfif = segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0]);
  const exif = segment(0xe1, [0x45, 0x78, 0x69, 0x66, 0, 0, 1, 2, 3]);
  const comment = segment(0xfe, [0x68, 0x69]);
  const quant = segment(0xdb, [0, 1, 2]);
  const scan = [0xff, 0xda, 0, 2, 9, 9, 9, 0xff, 0xd9];
  const input = new Uint8Array([0xff, 0xd8, ...jfif, ...exif, ...comment, ...quant, ...scan]);
  assertEquals(Array.from(stripJpegMetadata(input)), [0xff, 0xd8, ...jfif, ...quant, ...scan]);
});

Deno.test('rejects non-JPEG and truncated input', () => {
  assertThrows(() => stripJpegMetadata(new Uint8Array([0x89, 0x50, 0x4e, 0x47])));
  assertThrows(() => stripJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x40, 1])));
});
