import { describe, expect, it } from 'vitest';
import { DOCX, bytesMatch, checkFile, detectType, normaliseType, MB } from './evidence';

const bytes = (...parts: (string | number[])[]) => new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)));
const ftyp = (major: string, ...compat: string[]) => { const size = 16 + compat.length * 4; return bytes([0, 0, 0, size], 'ftyp', major, [0, 0, 0, 0], ...compat); };

describe('evidence type detection', () => {
  it('recognises photos, PDFs and zip packages', () => {
    expect(detectType(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectType(bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectType(bytes('RIFF', [1, 2, 3, 4], 'WEBPVP8 '))).toBe('image/webp');
    expect(detectType(bytes('%PDF-1.7'))).toBe('application/pdf');
    expect(detectType(bytes([0x50, 0x4b, 0x03, 0x04]))).toBe('application/zip');
  });
  it('tells MP4, MOV and HEIC apart from the ftyp box', () => {
    expect(detectType(ftyp('isom', 'isom', 'avc1'))).toBe('video/mp4');
    expect(detectType(ftyp('mp42', 'mp41'))).toBe('video/mp4');
    expect(detectType(ftyp('qt  ', 'qt  '))).toBe('video/quicktime');
    expect(detectType(ftyp('heic', 'mif1', 'heic'))).toBe('image/heic');
    expect(detectType(ftyp('mif1', 'mif1', 'heic'))).toBe('image/heic');
    expect(detectType(bytes([0, 0, 0, 8], 'wide'))).toBe('video/quicktime');
  });
  it('rejects unknown or disguised content', () => {
    expect(detectType(bytes('<html><script>'))).toBeNull();
    expect(detectType(bytes('MZ'))).toBeNull();
    expect(bytesMatch('image/jpeg', 'application/pdf')).toBe(false);
    expect(bytesMatch('video/mp4', 'image/heic')).toBe(false);
    expect(bytesMatch('image/heic', 'video/mp4')).toBe(false);
    expect(bytesMatch('application/pdf', null)).toBe(false);
  });
  it('accepts loosely-labelled phone files', () => {
    expect(bytesMatch('video/quicktime', 'video/mp4')).toBe(true);
    expect(bytesMatch(DOCX, 'application/zip')).toBe(true);
    expect(bytesMatch('image/heif', 'image/heic')).toBe(true);
  });
});

describe('evidence limits', () => {
  it('uses the extension when the browser gives no type', () => {
    expect(normaliseType('IMG_0001.HEIC', '')).toBe('image/heic');
    expect(normaliseType('clip.MOV', 'application/octet-stream')).toBe('video/quicktime');
    expect(normaliseType('letter.docx', '')).toBe(DOCX);
  });
  it('allows 150 MB videos but not 150 MB photos', () => {
    expect(checkFile('a.mp4', 'video/mp4', 150 * MB).ok).toBe(true);
    expect(checkFile('a.mp4', 'video/mp4', 150 * MB + 1)).toEqual({ ok: false, reason: 'size' });
    expect(checkFile('a.jpg', 'image/jpeg', 20 * MB)).toEqual({ ok: false, reason: 'size' });
    expect(checkFile('a.exe', 'application/x-msdownload', 10)).toEqual({ ok: false, reason: 'type' });
    expect(checkFile('a.gif', 'image/gif', 10)).toEqual({ ok: false, reason: 'type' });
  });
});
