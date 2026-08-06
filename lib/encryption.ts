import crypto from 'crypto';

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length !== 32) throw new Error('ENCRYPTION_KEY must be set and be exactly 32 characters')
  return key
}

export function encryptValue(value: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(getEncryptionKey()),
    iv
  );

  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptValue(encrypted: string): string {
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(getEncryptionKey()),
    iv
  );

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
