/** Small fs/text helpers shared by the scripts. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

export function readJson(file, fallback = null) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        if (error.code === 'ENOENT' && fallback !== null) {
            return fallback;
        }
        throw error;
    }
}

export function writeJson(file, value) {
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/** Writes only when the content actually changes, so --check stays quiet. */
export function writeIfChanged(file, content) {
    if (fs.existsSync(file)) {
        const current = fs.readFileSync(file);
        const next = Buffer.isBuffer(content) ? content : Buffer.from(content);
        if (current.equals(next)) {
            return false;
        }
    }
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, content);
    return true;
}

export function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function sha384Base64(buffer) {
    return `sha384-${crypto.createHash('sha384').update(buffer).digest('base64')}`;
}

/** LF-normalized digest, used so a CRLF checkout does not look "modified". */
export function sha256Normalized(buffer) {
    return sha256(Buffer.from(buffer.toString('binary').replace(/\r\n/g, '\n'), 'binary'));
}

/**
 * Even more forgiving digest: ignores CRLF and trailing blank lines.
 * Used only to decide "this upstream file is already identical, leave it be",
 * so a checkout with a stray trailing newline does not rewrite the tree.
 */
export function sha256Loose(buffer) {
    const text = buffer.toString('binary')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+$/gm, '')
        .replace(/\n+$/, '');
    return sha256(Buffer.from(text, 'binary'));
}

export function detectEol(buffer) {
    return buffer.includes('\r\n') ? '\r\n' : '\n';
}

export function applyEol(buffer, eol) {
    if (eol === '\r\n') {
        return Buffer.from(buffer.toString('binary').replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'), 'binary');
    }
    return Buffer.from(buffer.toString('binary').replace(/\r\n/g, '\n'), 'binary');
}

export function trimTrailingNewlines(buffer) {
    return Buffer.from(buffer.toString('binary').replace(/[\r\n]+$/, ''), 'binary');
}

/** Recursively lists files, returning posix-style paths relative to `dir`. */
export function walkFiles(dir, base = dir) {
    const out = [];
    if (!fs.existsSync(dir)) {
        return out;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...walkFiles(full, base));
        } else if (entry.isFile()) {
            out.push(path.relative(base, full).split(path.sep).join('/'));
        }
    }
    return out;
}

export function compareVersions(a, b) {
    const parse = (value) => String(value).split(/[.+-]/).map((part) => {
        const num = parseInt(part, 10);
        return Number.isFinite(num) && String(num) === part ? num : part;
    });

    const left = parse(a);
    const right = parse(b);
    const length = Math.max(left.length, right.length);

    for (let i = 0; i < length; i += 1) {
        const l = left[i];
        const r = right[i];
        if (l === r) {
            continue;
        }
        if (l === undefined) {
            return -1;
        }
        if (r === undefined) {
            return 1;
        }
        if (typeof l === 'number' && typeof r === 'number') {
            return l - r;
        }
        // numeric segment is newer than a pre-release tag ("1.0.0" > "1.0.0-rc")
        if (typeof l === 'number') {
            return 1;
        }
        if (typeof r === 'number') {
            return -1;
        }
        return String(l) < String(r) ? -1 : 1;
    }
    return 0;
}

export function humanSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
