/**
 * 审批 PIN 哈希（本地）
 * 用纯 JS 的 PBKDF2-HMAC-SHA256（@noble/hashes）替代后端的 bcryptjs，
 * 保证在局域网 http 等非安全上下文也能工作。
 * 存储字符串格式： pbkdf2$<iterations>$<saltHex>$<hashHex>
 * 说明：本地哈希仅为"不存明文"的威慑，不构成真正的安全边界。
 */

import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes, randomBytes } from '@noble/hashes/utils.js';

const ITERATIONS = 10000;
const DK_LEN = 32;

export function hashPin(pin) {
  const salt = randomBytes(16);
  const dk = pbkdf2(sha256, utf8ToBytes(String(pin)), salt, {
    c: ITERATIONS,
    dkLen: DK_LEN
  });
  return `pbkdf2$${ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(dk)}`;
}

export function verifyPin(pin, stored) {
  if (!stored) return false;
  const parts = String(stored).split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  let salt;
  try {
    salt = hexToBytes(parts[2]);
  } catch {
    return false;
  }
  const dk = pbkdf2(sha256, utf8ToBytes(String(pin)), salt, {
    c: iterations,
    dkLen: DK_LEN
  });
  return bytesToHex(dk) === parts[3];
}
