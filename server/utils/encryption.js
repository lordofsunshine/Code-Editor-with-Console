import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

export function generateProjectKey() {
  return crypto.randomBytes(32).toString('hex');
}

export function encryptData(data, key) {
  if (!Buffer.isBuffer(data)) {
    throw new Error('Data must be a Buffer');
  }
  if (!key || typeof key !== 'string' || key.length < 32) {
    throw new Error('Invalid encryption key');
  }
  
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = deriveKey(key, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  return Buffer.concat([salt, iv, tag, encrypted]);
}

export function decryptData(encryptedData, key) {
  if (!Buffer.isBuffer(encryptedData)) {
    throw new Error('Encrypted data must be a Buffer');
  }
  if (!key || typeof key !== 'string' || key.length < 32) {
    throw new Error('Invalid encryption key');
  }
  
  const minLength = SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
  if (encryptedData.length < minLength) {
    throw new Error('Invalid encrypted data');
  }
  
  const salt = encryptedData.slice(0, SALT_LENGTH);
  const iv = encryptedData.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = encryptedData.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = encryptedData.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  
  const derivedKey = deriveKey(key, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(tag);
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function hashProjectId(projectId) {
  if (!projectId || (!Number.isInteger(projectId) && typeof projectId !== 'string')) {
    throw new Error('Invalid project ID');
  }
  return crypto.createHash('sha256').update(String(projectId)).digest('hex');
}

export function hashFileName(fileName, projectKey) {
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('Invalid file name');
  }
  if (!projectKey || typeof projectKey !== 'string') {
    throw new Error('Invalid project key');
  }
  return crypto.createHmac('sha256', projectKey).update(fileName).digest('hex');
}

