// La clave vive solo en localStorage de este navegador — nunca se envía al
// servidor. Si el propietario quiere verla en otro dispositivo, tiene que
// copiarla él mismo (ver E2eeKeyPanel) por un canal fuera de esta app.
const STORAGE_PREFIX = 'memorias-vivas:e2ee-key:';

export function saveAlbumKey(albumId: string, exportedKey: string): void {
  localStorage.setItem(STORAGE_PREFIX + albumId, exportedKey);
}

export function loadAlbumKey(albumId: string): string | null {
  return localStorage.getItem(STORAGE_PREFIX + albumId);
}
