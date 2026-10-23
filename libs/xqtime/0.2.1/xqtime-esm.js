/*
* name: 时间友好化显示（xqtime）
* version: 0.2.1
* entry: xqtime.friend(time, append)
* license: MIT
* github: https://github.com/gitguanqi/xqtime
*/
// src/xqtime.js
var MINUTE = 60;
var HOUR = MINUTE * 60;
var DAY = HOUR * 24;
var MONTH = DAY * 30;
var YEAR = DAY * 365;
var CENTURY = YEAR * 100;
var MILLENNIUM = CENTURY * 10;
var MYRIAD = MILLENNIUM * 10;
var EON = MYRIAD * 1e4;
var THRESHOLDS = [MINUTE, HOUR, DAY, MONTH, YEAR, CENTURY, MILLENNIUM, MYRIAD, EON];
var LABELS = ["刚刚", "分钟前", "小时前", "天前", "月前", "年前", "世纪前", "千年前", "万年前", "亿年前"];
var DATE_TIME_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
var DATE_TAG = "[object Date]";
function isDate(value) {
  return Object.prototype.toString.call(value) === DATE_TAG;
}
function pad(value) {
  return value < 10 ? "0" + value : String(value);
}
function padTo(value, width) {
  let text = String(value);
  while (text.length < width) text = "0" + text;
  return text;
}
function formatYear(year) {
  return year < 0 ? "-" + padTo(-year, 6) : padTo(year, 4);
}
function parseDateTimeString(text) {
  const matched = DATE_TIME_PATTERN.exec(text);
  if (!matched) {
    const parsed = Date.parse(text);
    if (Number.isNaN(parsed)) {
      throw new TypeError('xqtime: 无法解析的时间字符串 "' + text + '"');
    }
    return parsed;
  }
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const hour = matched[4] === void 0 ? 0 : Number(matched[4]);
  const minute = matched[5] === void 0 ? 0 : Number(matched[5]);
  const second = matched[6] === void 0 ? 0 : Number(matched[6]);
  const date = /* @__PURE__ */ new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(hour, minute, second, 0);
  const overflow = date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute || date.getSeconds() !== second;
  if (overflow) {
    throw new TypeError('xqtime: 时间字符串的月日时分秒超出有效范围 "' + text + '"');
  }
  return date.getTime();
}
function toTimestamp(input) {
  if (input === void 0) return Date.now();
  if (isDate(input)) {
    const value = input.getTime();
    if (!Number.isFinite(value)) {
      throw new TypeError("xqtime: 传入的 Date 无效（getTime() 为 NaN）");
    }
    return value;
  }
  if (typeof input === "number") {
    if (!Number.isFinite(input)) {
      throw new TypeError("xqtime: 时间戳必须是有限数字，收到 " + String(input));
    }
    return input;
  }
  if (typeof input === "string") {
    return parseDateTimeString(input.trim());
  }
  throw new TypeError(
    "xqtime: 不支持的时间类型 " + Object.prototype.toString.call(input) + "，请传入 Date、毫秒时间戳或时间字符串"
  );
}
function levelOf(seconds) {
  for (let index = 0; index < THRESHOLDS.length; index += 1) {
    if (seconds < THRESHOLDS[index]) return index;
  }
  return THRESHOLDS.length;
}
function formatAttached(level, timestamp) {
  const date = new Date(timestamp);
  const clock = pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
  if (level <= 2) return clock;
  const monthDay = pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  if (level <= 4) return monthDay;
  return formatYear(date.getFullYear()) + "-" + monthDay;
}
function formatDateTime(time, append) {
  const timestamp = toTimestamp(time);
  const seconds = (Date.now() - timestamp) / 1e3;
  const level = levelOf(seconds);
  const amount = level === 0 ? 0 : Math.floor(seconds / THRESHOLDS[level - 1]);
  const relative = level === 0 ? LABELS[0] : amount + LABELS[level];
  if (!append) return relative;
  return relative + "(" + formatAttached(level, timestamp) + ")";
}
var xqtime = {
  friend: formatDateTime
};
var xqtime_default = xqtime;
export {
  xqtime_default as default,
  formatDateTime as friend
};
