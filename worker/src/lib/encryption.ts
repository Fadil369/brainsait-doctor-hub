/**
 * Encryption Library
 * AES-GCM encryption for PHI data using Web Crypto API
 */

// Encrypt data using AES-GCM
export async function encrypt(key: string, plaintext: string): Promise<string> {
  try {
    // Derive key from secret
    const cryptoKey = await deriveKey(key);

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      data
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return as base64 with prefix
    return 'encrypted:' + btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Encryption failed');
  }
}

// Decrypt data
export async function decrypt(key: string, ciphertext: string): Promise<string> {
  try {
    // Remove prefix
    const base64Data = ciphertext.replace('encrypted:', '');

    // Decode base64
    const combined = new Uint8Array(
      atob(base64Data)
        .split('')
        .map((c) => c.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Derive key
    const cryptoKey = await deriveKey(key);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      encrypted
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Decryption failed');
  }
}

// Derive AES key from string
async function deriveKey(keyString: string): Promise<CryptoKey> {
  // Hash the key string to get consistent length
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString);

  const hash = await crypto.subtle.digest('SHA-256', keyData);

  return await crypto.subtle.importKey(
    'raw',
    hash,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}
