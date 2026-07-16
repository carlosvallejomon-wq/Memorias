// Cifrado de extremo a extremo para álbumes de "Alta privacidad" (sección
// 3.4 del spec). Todo ocurre en el navegador con Web Crypto API: el
// servidor solo almacena bytes opacos, nunca ve la clave ni el contenido
// en claro.
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
// AES-GCM usa un IV de 12 bytes; va prefijado al blob cifrado sin problema,
// ya que en GCM el IV es público por diseño — solo la clave es secreta.
const IV_LENGTH_BYTES = 12;

export async function generateAlbumKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALGORITHM, length: KEY_LENGTH }, true, ['encrypt', 'decrypt']);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return bufferToBase64Url(raw);
}

export async function importKey(exported: string): Promise<CryptoKey> {
  const raw = base64UrlToBuffer(exported);
  return crypto.subtle.importKey('raw', raw, ALGORITHM, true, ['encrypt', 'decrypt']);
}

// Usado antes de subir un fichero (paso previo a media.requestUploadUrl):
// el binario que llega al servidor ya va cifrado.
export async function encryptBlob(file: Blob, key: CryptoKey): Promise<Blob> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const plaintext = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, plaintext);
  return new Blob([iv, new Uint8Array(ciphertext)], { type: 'application/octet-stream' });
}

// Usado al mostrar contenido: descarga el blob cifrado y lo descifra en
// memoria para generar una URL de objeto que el <img>/<video> pueda usar.
export async function decryptBlob(encrypted: Blob, key: CryptoKey, mimeType: string): Promise<Blob> {
  const buffer = await encrypted.arrayBuffer();
  const iv = buffer.slice(0, IV_LENGTH_BYTES);
  const ciphertext = buffer.slice(IV_LENGTH_BYTES);
  const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  return new Blob([plaintext], { type: mimeType });
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(base64url.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
