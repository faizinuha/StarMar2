/**
 * E2E Encryption using Web Crypto API (ECDH + AES-GCM)
 */

const ALGORITHM = { name: 'ECDH', namedCurve: 'P-256' };
const AES_ALGORITHM = { name: 'AES-GCM', length: 256 };

// Generate ECDH key pair
export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(ALGORITHM, true, ['deriveKey']);
  
  const publicKeyRaw = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyRaw = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  
  return {
    publicKey: JSON.stringify(publicKeyRaw),
    privateKey: JSON.stringify(privateKeyRaw),
  };
}

// Import a public key from JWK string
async function importPublicKey(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString);
  return crypto.subtle.importKey('jwk', jwk, ALGORITHM, true, []);
}

// Import a private key from JWK string
async function importPrivateKey(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString);
  return crypto.subtle.importKey('jwk', jwk, ALGORITHM, true, ['deriveKey']);
}

// Derive shared AES key from ECDH
async function deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    AES_ALGORITHM,
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt message
export async function encryptMessage(
  plaintext: string,
  myPrivateKeyJwk: string,
  theirPublicKeyJwk: string
): Promise<string> {
  const myPrivateKey = await importPrivateKey(myPrivateKeyJwk);
  const theirPublicKey = await importPublicKey(theirPublicKeyJwk);
  const sharedKey = await deriveSharedKey(myPrivateKey, theirPublicKey);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  );
  
  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

// Decrypt message
export async function decryptMessage(
  ciphertext: string,
  myPrivateKeyJwk: string,
  theirPublicKeyJwk: string
): Promise<string> {
  try {
    const myPrivateKey = await importPrivateKey(myPrivateKeyJwk);
    const theirPublicKey = await importPublicKey(theirPublicKeyJwk);
    const sharedKey = await deriveSharedKey(myPrivateKey, theirPublicKey);
    
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  } catch {
    return '[Pesan terenkripsi - tidak dapat didekripsi]';
  }
}

// Store private key in IndexedDB (never send to server)
const DB_NAME = 'nekopaw-e2ee';
const STORE_NAME = 'keys';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storePrivateKey(userId: string, privateKey: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(privateKey, `private-${userId}`);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPrivateKey(userId: string): Promise<string | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const req = tx.objectStore(STORE_NAME).get(`private-${userId}`);
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// For group encryption: encrypt with each member's public key
export async function encryptForGroup(
  plaintext: string,
  myPrivateKeyJwk: string,
  memberPublicKeys: { userId: string; publicKey: string }[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const member of memberPublicKeys) {
    result[member.userId] = await encryptMessage(plaintext, myPrivateKeyJwk, member.publicKey);
  }
  return result;
}
