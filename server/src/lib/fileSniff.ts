// multer's fileFilter only sees the client-supplied Content-Type, which is
// trivially spoofable (spec section 23: "protection contre les uploads
// malveillants", "validation des fichiers"). This checks the file's actual
// magic bytes against what it claims to be, so a relabeled executable
// can't ride through as "application/pdf".
//
// Not implemented: AV/malware scanning of the file contents — that needs
// an external scanning service (e.g. ClamAV or a cloud provider) this
// environment doesn't have. Flagged, not faked.
export function sniffedMimeType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;
  if (buffer.subarray(0, 4).toString('ascii') === '%PDF') return 'application/pdf';
  if (buffer.subarray(0, 3).toString('hex') === 'ffd8ff') return 'image/jpeg';
  if (buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'image/png';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') return 'image/heic'; // HEIC/HEIF ISO-BMFF family
  return null;
}

export function matchesClaimedType(buffer: Buffer, claimedMimeType: string): boolean {
  if (claimedMimeType === 'text/plain') return true; // no reliable magic bytes for plain text
  const sniffed = sniffedMimeType(buffer);
  // Strict equality only — a file must sniff as exactly what it claims to
  // be. (The ftyp/ISO-BMFF check above is a family match used only to
  // recognize HEIC; it must not be used to wave through other claimed
  // types.)
  return sniffed === claimedMimeType;
}
