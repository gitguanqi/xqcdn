/*! xquuid v0.1.1 | MIT | https://github.com/gitguanqi/xquuid#readme */
/**
 * xquuid 核心实现（唯一真源）
 *
 * 这个文件同时是 ESM 产物的来源和 UMD 产物的实现体：
 * build 脚本会截取 `// --- exports ---` 之前的内容，包进 UMD 工厂函数。
 * 因此该标记之前的代码不能出现 `export` / `import` 语句。
 *
 * 实现刻意保持 ES5 语法（var / function / 不用 padStart、Number.isSafeInteger 等），
 * 以便 UMD 产物仍能在缺少 polyfill 的老浏览器里直接运行。
 */
'use strict';

var MAX_SAFE_INTEGER = 9007199254740991;

// 62 位大小写字母 + 数字：随机串与 uuid 用的字符表
var BASE36_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';

// 64 进制字符表：URL 安全（不含 + / =），0-9 a-z A-Z - _
var BASE64_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_';

// 字符 -> 数值 的反查表，供解码使用
var BASE64_INDEX = {};
for (var bi = 0; bi < BASE64_CHARS.length; bi++) {
    BASE64_INDEX[BASE64_CHARS.charAt(bi)] = bi;
}

var B64_KEY_STR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
var B64_KEY_INDEX = {};
for (var bki = 0; bki < B64_KEY_STR.length; bki++) {
    B64_KEY_INDEX[B64_KEY_STR.charAt(bki)] = bki;
}

/* ------------------------------------------------------------------ *
 * 内部工具
 * ------------------------------------------------------------------ */

/** 取全局对象（浏览器 / Node / Worker 通用）。 */
function getGlobal() {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof self !== 'undefined') return self;
    if (typeof window !== 'undefined') return window;
    return null;
}

/** 是否是有限数字（不依赖 ES6 的 Number.isFinite）。 */
function isFiniteNumber(value) {
    return typeof value === 'number' && isFinite(value);
}

/** 是否是整数值（不依赖 ES6 的 Number.isInteger）。 */
function isIntegerNumber(value) {
    return isFiniteNumber(value) && Math.floor(value) === value;
}

/** 把入参规整为整数，失败即抛错。 */
function toInteger(value, name) {
    var n = typeof value === 'string' && value.trim() !== '' ? Number(value.trim()) : value;
    if (!isIntegerNumber(n)) {
        throw new TypeError(name + ': 需要一个整数，收到 ' + describe(value));
    }
    return n;
}

function describe(value) {
    if (typeof value === 'string') return JSON.stringify(value);
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'number') return String(value);
    return typeof value;
}

/** 左侧补零，替代 ES2017 的 padStart。 */
function padStart(text, width, filler) {
    var out = String(text);
    while (out.length < width) out = filler + out;
    return out;
}

/** 生成 count 个随机字节；优先用 crypto，退化到 Math.random。 */
function randomBytes(count) {
    var bytes = [];
    var g = getGlobal();
    var i;
    if (g && g.crypto && typeof g.crypto.getRandomValues === 'function' && typeof Uint8Array !== 'undefined') {
        var buffer = new Uint8Array(count);
        g.crypto.getRandomValues(buffer);
        for (i = 0; i < count; i++) bytes.push(buffer[i]);
        return bytes;
    }
    for (i = 0; i < count; i++) bytes.push(Math.floor(Math.random() * 256));
    return bytes;
}

// fileId 的毫秒内序号状态
var fileIdStamp = -1;
var fileIdSequence = 0;

/* ------------------------------------------------------------------ *
 * 随机与 ID
 * ------------------------------------------------------------------ */

/**
 * 生成随机短串（小写字母 + 数字）。
 *
 * @param {number} [len=6] 需要的字符数，必须是 >= 1 的整数
 * @returns {string} 长度为 len 的随机串，字符集为 0-9a-z
 * @throws {TypeError} len 不是 >= 1 的整数
 */
function randomId(len) {
    if (arguments.length > 1) {
        throw new TypeError('randomId: 0.1.0 起只接受一个 len 参数（旧签名 randomId(num1, num2, len) 已移除）');
    }
    if (len === undefined) len = 6;
    if (!isIntegerNumber(len) || len < 1) {
        throw new TypeError('randomId: len 必须是 >= 1 的整数，收到 ' + describe(len));
    }
    var out = '';
    for (var i = 0; i < len; i++) {
        out += BASE36_CHARS.charAt(Math.floor(Math.random() * BASE36_CHARS.length));
    }
    return out;
}

/**
 * 由 uid 派生文件 id：16 位十六进制 = 9 位毫秒时间戳 + 3 位 uid + 4 位毫秒内序号。
 *
 * 不再把时间戳与 52^10 量级的随机数相加（那样超过 2^53 会丢精度、同毫秒碰撞），
 * 改为「时间戳 + 自增序号」，同一毫秒内最多 65536 个 id 保证互不重复。
 *
 * @param {number|string} [uid=0] 参与混入的数字
 * @returns {string} 16 位十六进制字符串
 * @throws {TypeError} uid 不是有限数字
 */
function fileId(uid) {
    var seed = uid === undefined || uid === null || uid === '' ? 0 : uid;
    var n = typeof seed === 'string' ? Number(seed) : seed;
    if (!isFiniteNumber(n)) {
        throw new TypeError('fileId: uid 必须是有限数字，收到 ' + describe(uid));
    }

    var now = Date.now();
    if (now === fileIdStamp) {
        fileIdSequence = (fileIdSequence + 1) % 65536;
    } else {
        fileIdStamp = now;
        fileIdSequence = 0;
    }

    var timePart = padStart((now % 68719476736).toString(16), 9, '0');
    var uidPart = padStart((Math.abs(Math.floor(n)) % 4096).toString(16), 3, '0');
    var seqPart = padStart(fileIdSequence.toString(16), 4, '0');
    return timePart + uidPart + seqPart;
}

/**
 * 由 uid 派生短码：uid 的 64 进制（URL 安全）表示，可用 str64To10 还原。
 *
 * @param {number|string} uid 非负整数
 * @returns {string} 短码
 * @throws {TypeError|RangeError} uid 不是非负安全整数
 */
function shortId(uid) {
    return str10To64(uid);
}

/**
 * 生成 RFC 4122 v4 UUID（8-4-4-4-12 小写十六进制）。
 *
 * @returns {string} 形如 3f2b8c1a-9d4e-4f6a-b7c8-1d2e3f4a5b6c
 */
function getUuid() {
    var bytes = randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
    var hex = '';
    for (var i = 0; i < 16; i++) hex += padStart(bytes[i].toString(16), 2, '0');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' +
        hex.slice(16, 20) + '-' + hex.slice(20);
}

/**
 * getUuid 的别名，历史 API 保留。
 *
 * @returns {string} RFC 4122 v4 UUID
 */
function Guid() {
    return getUuid();
}

/* ------------------------------------------------------------------ *
 * 进制转换
 * ------------------------------------------------------------------ */

/**
 * 十进制转 64 进制（字符表 0-9a-zA-Z-_，URL 安全）。
 *
 * @param {number|string} number 0 ~ Number.MAX_SAFE_INTEGER 之间的整数
 * @returns {string} 64 进制字符串
 * @throws {TypeError|RangeError} 不是非负安全整数
 */
function str10To64(number) {
    var n = toInteger(number, 'str10To64');
    if (n < 0) {
        throw new RangeError('str10To64: 只接受非负整数，收到 ' + describe(number));
    }
    if (n > MAX_SAFE_INTEGER) {
        throw new RangeError('str10To64: 超出安全整数范围，收到 ' + describe(number));
    }
    if (n === 0) return '0';

    var radix = BASE64_CHARS.length;
    var digits = [];
    var quotient = n;
    while (quotient > 0) {
        var mod = quotient % radix;
        quotient = (quotient - mod) / radix;
        digits.push(BASE64_CHARS.charAt(mod));
    }
    return digits.reverse().join('');
}

/**
 * 64 进制转十进制。
 *
 * @param {string} number_code 由 str10To64 生成的字符串
 * @returns {number} 十进制整数
 * @throws {TypeError|RangeError} 含非法字符或结果超出安全整数范围
 */
function str64To10(number_code) {
    if (typeof number_code !== 'string') {
        throw new TypeError('str64To10: 需要字符串，收到 ' + describe(number_code));
    }
    var code = number_code.trim();
    if (code === '') {
        throw new TypeError('str64To10: 不能是空字符串');
    }
    var radix = BASE64_CHARS.length;
    var origin = 0;
    for (var i = 0; i < code.length; i++) {
        var digit = BASE64_INDEX[code.charAt(i)];
        if (digit === undefined) {
            throw new TypeError('str64To10: 非法字符 ' + describe(code.charAt(i)));
        }
        origin = origin * radix + digit;
        if (origin > MAX_SAFE_INTEGER) {
            throw new RangeError('str64To10: 结果超出安全整数范围');
        }
    }
    return origin;
}

/**
 * 十进制转十六进制。
 *
 * @param {number|string} n 整数
 * @returns {string} 十六进制字符串，负数为前导 '-'
 * @throws {TypeError} 不是整数
 */
function str10To16(n) {
    var value = toInteger(n, 'str10To16');
    if (value < 0) {
        return '-' + str10To16(-value);
    }
    return value.toString(16);
}

/**
 * 十六进制转十进制。
 *
 * @param {string} n 十六进制字符串，允许前导 '-'
 * @returns {number} 十进制整数
 * @throws {TypeError|RangeError} 非法字符或结果超出安全整数范围
 */
function str16To10(n) {
    if (typeof n !== 'string') {
        throw new TypeError('str16To10: 需要字符串，收到 ' + describe(n));
    }
    var text = n.trim();
    var sign = 1;
    if (text.charAt(0) === '-') {
        sign = -1;
        text = text.slice(1);
    }
    if (text === '' || !/^[0-9a-fA-F]+$/.test(text)) {
        throw new TypeError('str16To10: 非法的十六进制字符串 ' + describe(n));
    }
    var value = parseInt(text, 16);
    if (value > MAX_SAFE_INTEGER) {
        throw new RangeError('str16To10: 结果超出安全整数范围');
    }
    return sign * value;
}

/* ------------------------------------------------------------------ *
 * Base64（UTF-8）
 * ------------------------------------------------------------------ */

/**
 * 把 JS 字符串编码成 UTF-8 字节串（每个字符一个字节）。
 * 正确处理代理对（emoji 等 4 字节字符），不做任何换行归一化。
 *
 * @param {string} string 源字符串
 * @returns {string} 字节串
 */
function utf8Encode(string) {
    var out = '';
    for (var i = 0; i < string.length; i++) {
        var c = string.charCodeAt(i);
        if (c >= 0xd800 && c <= 0xdbff && i + 1 < string.length) {
            var low = string.charCodeAt(i + 1);
            if (low >= 0xdc00 && low <= 0xdfff) {
                c = 0x10000 + ((c - 0xd800) << 10) + (low - 0xdc00);
                i++;
            }
        }
        if (c < 0x80) {
            out += String.fromCharCode(c);
        } else if (c < 0x800) {
            out += String.fromCharCode(0xc0 | (c >> 6));
            out += String.fromCharCode(0x80 | (c & 0x3f));
        } else if (c < 0x10000) {
            out += String.fromCharCode(0xe0 | (c >> 12));
            out += String.fromCharCode(0x80 | ((c >> 6) & 0x3f));
            out += String.fromCharCode(0x80 | (c & 0x3f));
        } else {
            out += String.fromCharCode(0xf0 | (c >> 18));
            out += String.fromCharCode(0x80 | ((c >> 12) & 0x3f));
            out += String.fromCharCode(0x80 | ((c >> 6) & 0x3f));
            out += String.fromCharCode(0x80 | (c & 0x3f));
        }
    }
    return out;
}

/**
 * 把 UTF-8 字节串解码回 JS 字符串。
 *
 * @param {string} bytes 字节串
 * @returns {string} 源字符串
 * @throws {TypeError} 字节序列不是合法 UTF-8
 */
function utf8Decode(bytes) {
    var out = '';
    var i = 0;
    var len = bytes.length;
    while (i < len) {
        var b1 = bytes.charCodeAt(i);
        if (b1 < 0x80) {
            out += String.fromCharCode(b1);
            i += 1;
        } else if ((b1 & 0xe0) === 0xc0) {
            out += String.fromCharCode(((b1 & 0x1f) << 6) | readContinuation(bytes, i + 1) );
            i += 2;
        } else if ((b1 & 0xf0) === 0xe0) {
            var c3 = ((b1 & 0x0f) << 12) | (readContinuation(bytes, i + 1) << 6) | readContinuation(bytes, i + 2);
            out += String.fromCharCode(c3);
            i += 3;
        } else if ((b1 & 0xf8) === 0xf0) {
            var cp = ((b1 & 0x07) << 18) | (readContinuation(bytes, i + 1) << 12) |
                (readContinuation(bytes, i + 2) << 6) | readContinuation(bytes, i + 3);
            cp -= 0x10000;
            out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
            i += 4;
        } else {
            throw new TypeError('utf8Decode: 非法 UTF-8 起始字节 0x' + b1.toString(16));
        }
    }
    return out;
}

function readContinuation(bytes, index) {
    var b = bytes.charCodeAt(index);
    if (isNaN(b) || (b & 0xc0) !== 0x80) {
        throw new TypeError('utf8Decode: 非法的 UTF-8 续字节位置 ' + index);
    }
    return b & 0x3f;
}

/**
 * Base64 编解码器（UTF-8 语义，与标准 Base64 互通）。
 *
 * @constructor
 */
function Base64() {}

/**
 * 编码为 Base64。
 *
 * @param {string} input 源字符串
 * @returns {string} Base64 字符串（含标准 '=' 填充）
 * @throws {TypeError} input 不是字符串
 */
Base64.prototype.encode = function (input) {
    if (typeof input !== 'string') {
        throw new TypeError('Base64.encode: 需要字符串，收到 ' + describe(input));
    }
    var bytes = utf8Encode(input);
    var out = '';
    var i = 0;
    for (; i + 2 < bytes.length; i += 3) {
        var n = (bytes.charCodeAt(i) << 16) | (bytes.charCodeAt(i + 1) << 8) | bytes.charCodeAt(i + 2);
        out += B64_KEY_STR.charAt((n >> 18) & 63) + B64_KEY_STR.charAt((n >> 12) & 63) +
            B64_KEY_STR.charAt((n >> 6) & 63) + B64_KEY_STR.charAt(n & 63);
    }
    var rest = bytes.length - i;
    if (rest === 1) {
        var one = bytes.charCodeAt(i);
        out += B64_KEY_STR.charAt(one >> 2) + B64_KEY_STR.charAt((one & 3) << 4) + '==';
    } else if (rest === 2) {
        var two = (bytes.charCodeAt(i) << 8) | bytes.charCodeAt(i + 1);
        out += B64_KEY_STR.charAt(two >> 10) + B64_KEY_STR.charAt((two >> 4) & 63) +
            B64_KEY_STR.charAt((two & 15) << 2) + '=';
    }
    return out;
};

/**
 * 解码 Base64。
 *
 * @param {string} input Base64 字符串
 * @returns {string} 源字符串
 * @throws {TypeError} 含非 Base64 字符或非法 UTF-8 序列
 */
Base64.prototype.decode = function (input) {
    if (typeof input !== 'string') {
        throw new TypeError('Base64.decode: 需要字符串，收到 ' + describe(input));
    }
    // 允许换行/空格这类排版空白，其余非法字符一律报错，不再静默丢弃。
    var clean = input.replace(/[\s]+/g, '').replace(/=+$/, '');
    if (/[^A-Za-z0-9+\/]/.test(clean)) {
        throw new TypeError('Base64.decode: 含非 Base64 字符');
    }
    if (clean.length % 4 === 1) {
        throw new TypeError('Base64.decode: Base64 长度非法');
    }

    var bytes = '';
    var i = 0;
    for (; i + 3 < clean.length; i += 4) {
        var quad = (B64_KEY_INDEX[clean.charAt(i)] << 18) | (B64_KEY_INDEX[clean.charAt(i + 1)] << 12) |
            (B64_KEY_INDEX[clean.charAt(i + 2)] << 6) | B64_KEY_INDEX[clean.charAt(i + 3)];
        bytes += String.fromCharCode((quad >> 16) & 255, (quad >> 8) & 255, quad & 255);
    }
    var left = clean.length - i;
    if (left === 2) {
        var two = (B64_KEY_INDEX[clean.charAt(i)] << 18) | (B64_KEY_INDEX[clean.charAt(i + 1)] << 12);
        bytes += String.fromCharCode((two >> 16) & 255);
    } else if (left === 3) {
        var three = (B64_KEY_INDEX[clean.charAt(i)] << 18) | (B64_KEY_INDEX[clean.charAt(i + 1)] << 12) |
            (B64_KEY_INDEX[clean.charAt(i + 2)] << 6);
        bytes += String.fromCharCode((three >> 16) & 255, (three >> 8) & 255);
    }
    return utf8Decode(bytes);
};

/** @deprecated 使用 utf8Encode。 */
Base64.prototype.utf8Encode = utf8Encode;
/** @deprecated 使用 utf8Decode。 */
Base64.prototype.utf8Decode = utf8Decode;
Base64.prototype._utf8_encode = utf8Encode;
Base64.prototype._utf8_decode = utf8Decode;

var xquuid = {
    randomId: randomId,
    fileId: fileId,
    shortId: shortId,
    getUuid: getUuid,
    Guid: Guid,
    str10To64: str10To64,
    str64To10: str64To10,
    str10To16: str10To16,
    str16To10: str16To10,
    Base64: Base64
};

// --- exports ---
// 该标记以下的行只用于 ESM 产物，构建 UMD 时会被整体截断。
export { randomId, fileId, shortId, getUuid, Guid, str10To64, str64To10, str10To16, str16To10, Base64 };
export default xquuid;
