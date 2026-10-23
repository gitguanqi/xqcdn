/** npm registry access: metadata, tarball download, integrity verification. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureDir } from './fsutil.mjs';

const DEFAULT_TIMEOUT = 60_000;

function packageUrl(registry, pkg, version) {
    const name = pkg.startsWith('@') ? pkg.replace('/', '%2F') : pkg;
    return `${registry.replace(/\/$/, '')}/${name}${version ? `/${version}` : ''}`;
}

async function getJson(url) {
    const response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
    });
    if (!response.ok) {
        throw new Error(`GET ${url} -> HTTP ${response.status}`);
    }
    return response.json();
}

export async function getVersionMeta(pkg, version, registry) {
    const data = await getJson(packageUrl(registry, pkg, version));
    const dist = data.dist || {};
    return {
        name: data.name,
        version: data.version,
        license: typeof data.license === 'string' ? data.license : data.license && data.license.type,
        tarball: dist.tarball,
        integrity: dist.integrity,
        shasum: dist.shasum
    };
}

export async function getLatestVersion(pkg, registry) {
    const data = await getJson(packageUrl(registry, pkg));
    return {
        latest: data['dist-tags'] && data['dist-tags'].latest,
        license: typeof data.license === 'string' ? data.license : undefined
    };
}

function verifyIntegrity(buffer, integrity, label) {
    if (!integrity) {
        return;
    }
    const [algorithm, expected] = integrity.split('-', 2);
    if (!algorithm || !expected) {
        return;
    }
    const actual = crypto.createHash(algorithm.replace('sha', 'sha')).update(buffer).digest('base64');
    if (actual !== expected) {
        throw new Error(`integrity mismatch for ${label}: expected ${expected}, got ${actual}`);
    }
}

/**
 * Downloads a tarball, reusing `.cache/tarballs` when present.
 */
export async function downloadTarball({ url, integrity, cacheDir, cacheKey, offline = false }) {
    const cached = path.join(cacheDir, cacheKey);

    if (fs.existsSync(cached)) {
        const buffer = fs.readFileSync(cached);
        verifyIntegrity(buffer, integrity, cacheKey);
        return { buffer, fromCache: true };
    }

    if (offline) {
        throw new Error(`${cacheKey} not in cache and --offline was requested`);
    }

    const response = await fetch(url, { signal: AbortSignal.timeout(DEFAULT_TIMEOUT * 3) });
    if (!response.ok) {
        throw new Error(`GET ${url} -> HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    verifyIntegrity(buffer, integrity, cacheKey);

    ensureDir(cacheDir);
    fs.writeFileSync(cached, buffer);
    return { buffer, fromCache: false };
}
