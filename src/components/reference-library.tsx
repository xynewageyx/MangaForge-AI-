import { useEffect, useState } from "react";

type Reference = { id: string; name: string; type: string; blob: Blob; createdAt: number; category?: string };
const DB = "mangaforge-references";
const STORE = "images";
const CATEGORIES = ["Action / Kampf", "Dark Fantasy", "Romantik / Alltag", "Horror / Mystery", "Schwarzweiß + Farbeffekte", "Charakterdesign", "Sonstiges"] as const;
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function transact<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
export function ReferenceLibrary() {
  const [items, setItems] = useState<Reference[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<string>("Action / Kampf");
  const [filter, setFilter] = useState<string>("Alle");
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    void transact<Reference[]>("readonly", (s) => s.getAll()).then((result) => { if (alive) setItems(result); }).catch(() => { if (alive) setError("Lokale Bilddatenbank konnte nicht geöffnet werden."); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    const created: Record<string, string> = {};
    for (const item of items) created[item.id] = URL.createObjectURL(item.blob);
    setUrls(created);
    return () => { Object.values(created).forEach((url) => URL.revokeObjectURL(url)); };
  }, [items]);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError("");
    try {
      const added: Reference[] = [];
      for (const file of Array.from(files)) {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) continue;
        if (file.size > 12 * 1024 * 1024) { setError("Einige Bilder sind größer als 12 MB und wurden übersprungen."); continue; }
        const item: Reference = { id: crypto.randomUUID(), name: file.name, type: file.type, blob: file, createdAt: Date.now(), category };
        await transact<IDBValidKey>("readwrite", (s) => s.put(item));
        added.push(item);
      }
      setItems((prev) => [...prev, ...added]);
    } catch { setError("Speichern fehlgeschlagen. Prüfe den freien Speicher deines Browsers."); }
    finally { setBusy(false); }
  }
  async function updateCategory(item: Reference, nextCategory: string) {
    try {
      const updated = { ...item, category: nextCategory };
      await transact<IDBValidKey>("readwrite", (s) => s.put(updated));
      setItems((prev) => prev.map((entry) => entry.id === item.id ? updated : entry));
    } catch { setError("Kategorie konnte nicht gespeichert werden."); }
  }
  async function remove(id: string) {
    try { await transact<undefined>("readwrite", (s) => s.delete(id)); setItems((prev) => prev.filter((item) => item.id !== id)); }
    catch { setError("Bild konnte nicht gelöscht werden."); }
  }
  return <section className="space-y-3">
    <h2 className="text-base font-bold">Meine Manga-Referenzbilder</h2>
    <p className="text-sm text-muted-foreground">Bilder bleiben lokal in diesem Browser auf deinem Gerät gespeichert. Kein Cloud-Upload, keine automatische KI-Analyse. Sichere deine Originaldateien zusätzlich.</p>
    <label htmlFor="reference-category" className="block text-sm font-semibold">Kategorie für neue Bilder</label>
    <select id="reference-category" value={category} onChange={(e) => setCategory(e.target.value)}
      className="min-h-12 w-full rounded-md border bg-background px-3 text-sm">
      {CATEGORIES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
    </select>
    <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-md border px-4 py-2 text-sm font-bold">
      {busy ? "Bilder werden gespeichert …" : "Referenzbilder hochladen"}
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy}
        onChange={(e) => { void upload(e.currentTarget.files); e.currentTarget.value = ""; }} />
    </label>
    <p className="text-xs text-muted-foreground">{items.length} Bilder gespeichert · JPG, PNG oder WebP · maximal 12 MB pro Bild</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <label htmlFor="reference-filter" className="block text-sm font-semibold">Bilder filtern</label>
    <select id="reference-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="min-h-12 w-full rounded-md border bg-background px-3 text-sm">
      <option value="Alle">Alle Kategorien</option>
      {CATEGORIES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
    </select>
    <div className="grid grid-cols-2 gap-3">
      {items.filter((item) => filter === "Alle" || (item.category ?? "Sonstiges") === filter).map((item) => <div key={item.id} className="overflow-hidden rounded-md border">
        {urls[item.id] && <img src={urls[item.id]} alt={item.name} className="aspect-square w-full object-cover" />}
        <div className="space-y-2 p-2">
          <p className="truncate text-xs" title={item.name}>{item.name}</p>
          <select aria-label={`Kategorie für ${item.name}`} value={item.category ?? "Sonstiges"}
            onChange={(e) => void updateCategory(item, e.target.value)}
            className="min-h-11 w-full rounded border bg-background px-1 text-xs">
            {CATEGORIES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
          <button type="button" onClick={() => void remove(item.id)} className="min-h-11 w-full rounded border px-2 text-xs">Bild entfernen</button>
        </div>
      </div>)}
    </div>
  </section>;
}
