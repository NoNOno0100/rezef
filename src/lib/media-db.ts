const DB_NAME = "retzef-media";
const STORE = "blobs";
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putMedia(key: string, dataUrl: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(dataUrl, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getMedia(key: string): Promise<string | undefined> {
  const db = await openDb();
  const value = await new Promise<string | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
}

export async function delMedia(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function delMany(keys: string[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const k of keys) store.delete(k);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

const mem = new Map<string, string>();

export async function resolveMedia(key?: string): Promise<string | undefined> {
  if (!key) return undefined;
  const cached = mem.get(key);
  if (cached) return cached;
  const stored = await getMedia(key);
  if (stored) mem.set(key, stored);
  return stored;
}

export async function saveMedia(key: string, dataUrl: string): Promise<string> {
  mem.set(key, dataUrl);
  await putMedia(key, dataUrl);
  return key;
}

export function peekMedia(key?: string): string | undefined {
  if (!key) return undefined;
  return mem.get(key);
}

export function primeMedia(key: string, dataUrl: string) {
  mem.set(key, dataUrl);
}
