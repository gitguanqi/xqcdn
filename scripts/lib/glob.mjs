/**
 * Tiny glob matcher for manifest file rules.
 *
 * Supported syntax (deliberately small):
 *   dist/jquery.min.js     exact path
 *   styles/*.css           "*" matches inside a single path segment
 *   webfonts/*             everything directly inside a directory
 *   **\/jquery.min.js      "**" matches across segments
 */

function segmentToRegExp(segment) {
    const escaped = segment.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
    return new RegExp(`^${escaped}$`);
}

export function matchPath(path, pattern) {
    const pathParts = path.split('/');
    const patternParts = pattern.split('/');
    return matchParts(pathParts, 0, patternParts, 0);
}

function matchParts(pathParts, pi, patternParts, si) {
    if (si === patternParts.length) {
        return pi === pathParts.length;
    }
    if (patternParts[si] === '**') {
        for (let skip = pi; skip <= pathParts.length; skip += 1) {
            if (matchParts(pathParts, skip, patternParts, si + 1)) {
                return true;
            }
        }
        return false;
    }
    if (pi >= pathParts.length) {
        return false;
    }
    if (!segmentToRegExp(patternParts[si]).test(pathParts[pi])) {
        return false;
    }
    return matchParts(pathParts, pi + 1, patternParts, si + 1);
}

/**
 * Resolves the archive members a manifest rule points at.
 *
 * @param {Map<string, Buffer>} entries normalized archive entries
 * @param {string} pattern glob or exact path
 * @returns {Array<{path: string, data: Buffer}>}
 */
export function selectEntries(entries, pattern) {
    const result = [];
    for (const [path, data] of entries) {
        if (matchPath(path, pattern)) {
            result.push({ path, data });
        }
    }
    return result;
}

/** Basename lookup used when a manifest rule omits the source path. */
export function selectByBasename(entries, basename) {
    const result = [];
    for (const [path, data] of entries) {
        if (path.split('/').pop() === basename) {
            result.push({ path, data });
        }
    }
    result.sort((a, b) => a.path.length - b.path.length);
    return result;
}

/**
 * Packages often ship the same basename twice (src/jquery.js and
 * dist/jquery.js). When a manifest rule does not name the source path we
 * prefer the shipped build: paths under dist/ win, test/source trees lose.
 */
export function scoreCandidate(path) {
    const segments = path.split('/');
    let score = -segments.length * 5;

    if (segments[0] === 'dist') {
        score += 60;
    } else if (segments.includes('dist')) {
        score += 40;
    }
    if (segments.includes('build') || segments.includes('bundles')) {
        score += 20;
    }
    if (['src', 'lib-src', 'test', 'tests', 'spec', 'examples', 'example', 'docs'].includes(segments[0])) {
        score -= 80;
    }
    return score;
}

/**
 * Returns the single best candidate, or null when two candidates tie
 * (the caller then asks for an explicit "from").
 */
export function pickBest(candidates) {
    if (candidates.length <= 1) {
        return candidates[0] || null;
    }
    const scored = candidates
        .map((candidate) => ({ candidate, score: scoreCandidate(candidate.path) }))
        .sort((a, b) => b.score - a.score || a.candidate.path.length - b.candidate.path.length);

    if (scored.length > 1 && scored[0].score === scored[1].score) {
        return null;
    }
    return scored[0].candidate;
}
