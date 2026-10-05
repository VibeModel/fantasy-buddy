/**
 * id / 设备码 / 验证码生成
 * 在非安全上下文（局域网 http）下 crypto.randomUUID 不可用，故带手写回退。
 */

function manualUuidV4() {
  // RFC 4122 v4
  const bytes = new Uint8Array(16);
  const g = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto : null;
  if (g) {
    g.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

export function uuid() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return manualUuidV4();
}

const DEVICE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** 稳定 6 位设备码 */
export function deviceCode() {
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += DEVICE_ALPHABET[Math.floor(Math.random() * DEVICE_ALPHABET.length)];
  }
  return out;
}

/** 6 位数字验证码 */
export function sixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
