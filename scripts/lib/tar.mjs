/**
 * Minimal, dependency-free tar reader (ustar + pax long names).
 *
 * We only need to pull a handful of files out of npm tarballs, and we never
 * touch the filesystem with the archive's own paths, so this stays small on
 * purpose: no symlink support, no permission bits, paths are validated by
 * the caller before use.
 */
import zlib from 'node:zlib';

function readString(buf, offset, length) {
    const slice = buf.subarray(offset, offset + length);
    const end = slice.indexOf(0);
    return slice.subarray(0, end === -1 ? slice.length : end).toString('utf8');
}

function parseSize(buf) {
    // some writers emit base-256 for big values; all npm tarballs use octal
    const raw = readString(buf, 124, 12).trim();
    const parsed = parseInt(raw, 8);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function readTarGz(buffer) {
    const data = zlib.gunzipSync(buffer);
    const entries = new Map();
    let offset = 0;
    let pendingPath = null;

    while (offset + 512 <= data.length) {
        const header = data.subarray(offset, offset + 512);
        if (header.every((byte) => byte === 0)) {
            break;
        }

        const name = readString(header, 0, 100);
        const prefix = readString(header, 345, 155);
        const size = parseSize(header);
        const type = String.fromCharCode(header[156]) || '0';
        const bodyStart = offset + 512;
        const body = data.subarray(bodyStart, bodyStart + size);

        if (type === 'x' || type === 'X') {
            // pax extended header: "123 path=some/long/path\n"
            const record = body.toString('utf8');
            const match = record.match(/(?:^|\n)\d+ path=([^\n]*)\n/);
            if (match) {
                pendingPath = match[1];
            }
        } else if (type === 'L') {
            pendingPath = body.toString('utf8').replace(/\0+$/, '');
        } else if (type === 'g') {
            // global pax header, ignored
        } else if (type === '0' || type === '\0') {
            const fullPath = pendingPath || (prefix ? `${prefix}/${name}` : name);
            pendingPath = null;
            if (!fullPath.endsWith('/')) {
                entries.set(fullPath, body);
            }
        } else {
            pendingPath = null;
        }

        offset = bodyStart + Math.ceil(size / 512) * 512;
    }

    return entries;
}

/** Strips the leading "package/" segment npm uses. */
export function normalizeEntryPath(path) {
    return path.replace(/^package\//, '');
}
