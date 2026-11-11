/**
 * IndexedDB storage helper for 3D spaceship models (.glb files).
 * Allows saving binary models locally with no size limits or cloud auth restrictions,
 * providing instant and reliable playback for user-uploaded ships.
 */

const DB_NAME = 'SpaceshipModelsDB_v1';
const DB_VERSION = 1;
const STORE_NAME = 'spaceship_models';

function openModelDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stores a model Blob or File in IndexedDB.
 * Returns an 'idb:<key>' URI string.
 */
export async function saveModelToDB(key: string, fileOrBlob: Blob | File): Promise<string> {
  const db = await openModelDB();
  const cleanKey = key.replace(/^idb:/, '');
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(fileOrBlob, cleanKey);
    req.onsuccess = () => resolve(`idb:${cleanKey}`);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves a model Blob from IndexedDB by key.
 */
export async function getModelFromDB(key: string): Promise<Blob | null> {
  try {
    const db = await openModelDB();
    const cleanKey = key.replace(/^idb:/, '');
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(cleanKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not read model from IndexedDB:', err);
    return null;
  }
}

/**
 * Resolves a model URL. If it's an 'idb:' URI, fetches the Blob and returns an Object URL.
 * Otherwise returns the original URL.
 */
export async function resolveModelUrl(url: string): Promise<string> {
  if (url && url.startsWith('idb:')) {
    const blob = await getModelFromDB(url);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    throw new Error(`Modelo no encontrado en almacenamiento local (${url})`);
  }
  return url;
}
