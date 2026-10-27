// S-24: strips EXIF (including GPS), XMP, ICC and comment segments from a JPEG.
// The app already re-encodes uploads to JPEG; this guarantees no metadata reaches `media`
// even if a client is modified. Throws on anything that is not a well-formed baseline JPEG.

const SOI = 0xd8;
const SOS = 0xda;
const EOI = 0xd9;

function isStandalone(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);
}

/** APP1-APP15 (EXIF, XMP, ICC, vendor data) and COM. APP0 (JFIF) is kept. */
function isMetadata(marker: number): boolean {
  return (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
}

export function stripJpegMetadata(input: Uint8Array): Uint8Array<ArrayBuffer> {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== SOI) throw new Error('Not a JPEG');
  const out: Uint8Array[] = [input.subarray(0, 2)];
  let i = 2;
  while (i < input.length) {
    if (input[i] !== 0xff) throw new Error('Corrupt JPEG');
    const marker = input[i + 1];
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (isStandalone(marker)) {
      out.push(input.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (marker === EOI) {
      out.push(input.subarray(i, i + 2));
      break;
    }
    const length = (input[i + 2] << 8) | input[i + 3];
    if (length < 2 || i + 2 + length > input.length) throw new Error('Corrupt JPEG');
    if (marker === SOS) {
      // Entropy-coded data runs to the end of the file; copy it as is.
      out.push(input.subarray(i));
      break;
    }
    if (!isMetadata(marker)) out.push(input.subarray(i, i + 2 + length));
    i += 2 + length;
  }

  const size = out.reduce((n, part) => n + part.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of out) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
