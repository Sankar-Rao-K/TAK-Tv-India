// Rules for citizen evidence files. Shared by the browser (early checks) and the server (final checks on the real bytes).

export type EvidenceKind = 'photo' | 'video' | 'document';
export const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const EVIDENCE_TYPES: Record<string, { kind: EvidenceKind; ext: string }> = {
  'image/jpeg': { kind: 'photo', ext: 'jpg' }, 'image/png': { kind: 'photo', ext: 'png' }, 'image/webp': { kind: 'photo', ext: 'webp' },
  'image/heic': { kind: 'photo', ext: 'heic' }, 'image/heif': { kind: 'photo', ext: 'heif' },
  'video/mp4': { kind: 'video', ext: 'mp4' }, 'video/quicktime': { kind: 'video', ext: 'mov' },
  'application/pdf': { kind: 'document', ext: 'pdf' }, [DOCX]: { kind: 'document', ext: 'docx' },
};
export const MAX_FILES = 5;
export const MB = 1024 * 1024;
export const MAX_BYTES: Record<EvidenceKind, number> = { photo: 15 * MB, video: 150 * MB, document: 15 * MB };
export const MAX_TOTAL_BYTES = 300 * MB;
export const ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,video/mp4,video/quicktime,.mov,application/pdf,.docx,' + DOCX;

const BY_EXT: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', pdf: 'application/pdf', docx: DOCX };

/** Browsers sometimes report HEIC/MOV/DOCX with an empty or generic type; fall back to the file extension. */
export function normaliseType(name: string, type: string): string {
  const t = (type || '').toLowerCase();
  if (EVIDENCE_TYPES[t]) return t;
  const ext = (name.split('.').pop() || '').toLowerCase();
  return BY_EXT[ext] || t;
}

export type CheckResult = { ok: true; type: string; kind: EvidenceKind } | { ok: false; reason: 'type' | 'size' };
export function checkFile(name: string, type: string, size: number): CheckResult {
  const t = normaliseType(name, type); const info = EVIDENCE_TYPES[t];
  if (!info) return { ok: false, reason: 'type' };
  if (size <= 0 || size > MAX_BYTES[info.kind]) return { ok: false, reason: 'size' };
  return { ok: true, type: t, kind: info.kind };
}

const ascii = (b: Uint8Array, from: number, len: number) => String.fromCharCode(...b.slice(from, from + len));
const HEIF_BRANDS = ['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1', 'heif'];
const MP4_BRANDS = ['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'm4v ', 'm4a ', 'dash', 'mmp4', '3gp4', '3gp5', '3gp6', '3g2a', 'msnv', 'f4v ', 'xavc'];
/** Every brand listed in an ISO base-media `ftyp` box (major brand + compatible brands). */
function ftypBrands(b: Uint8Array): string[] | null {
  if (b.length < 12 || ascii(b, 4, 4) !== 'ftyp') return null;
  const size = ((b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!) >>> 0;
  const end = Math.min(b.length, size >= 16 ? size : 16);
  const brands = [ascii(b, 8, 4)];
  for (let i = 16; i + 4 <= end; i += 4) brands.push(ascii(b, i, 4));
  return brands;
}

/** Works out the real file type from its first bytes (at least 64 are recommended). Returns null when unknown. */
export function detectType(b: Uint8Array): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 3) === 'PNG' && b[4] === 0x0d && b[5] === 0x0a) return 'image/png';
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'image/webp';
  if (b.length >= 5 && ascii(b, 0, 5) === '%PDF-') return 'application/pdf';
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return 'application/zip';
  const brands = ftypBrands(b);
  if (brands) {
    const major = brands[0]!;
    if (HEIF_BRANDS.includes(major)) return 'image/heic';
    if (major === 'qt  ') return 'video/quicktime';
    if (MP4_BRANDS.includes(major) || major.startsWith('3g') || major.startsWith('mp4') || major.startsWith('iso')) return 'video/mp4';
    if (brands.some((x) => HEIF_BRANDS.includes(x)) && !brands.some((x) => MP4_BRANDS.includes(x))) return 'image/heic';
    if (brands.some((x) => MP4_BRANDS.includes(x))) return 'video/mp4';
    if (brands.includes('qt  ')) return 'video/quicktime';
    return null;
  }
  // Older QuickTime files may start with another atom instead of `ftyp`.
  if (b.length >= 8 && ['moov', 'mdat', 'wide', 'free', 'skip', 'pnot'].includes(ascii(b, 4, 4))) return 'video/quicktime';
  return null;
}

/** Does the detected type agree with what the citizen's device said the file was? */
export function bytesMatch(declared: string, detected: string | null): boolean {
  if (!detected) return false;
  if (declared === detected) return true;
  if ((declared === 'image/heic' || declared === 'image/heif') && detected === 'image/heic') return true;
  if (declared === DOCX && detected === 'application/zip') return true; // a .docx is a zip package
  // Phones label many videos loosely: both MP4 and MOV are accepted as long as the bytes are a video container.
  if ((declared === 'video/mp4' || declared === 'video/quicktime') && (detected === 'video/mp4' || detected === 'video/quicktime')) return true;
  return false;
}
