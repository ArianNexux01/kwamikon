import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, type GalleryPhoto } from '../../lib/api';

/** Igual ao limite do backend. */
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export function Galeria() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; caption: string } | null>(null);
  const [savingCaption, setSavingCaption] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.gallery
      .list()
      .then(setPhotos)
      .catch(() => setError('Não foi possível carregar a galeria.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(selected: File | undefined) {
    setError(null);
    setNotice(null);
    if (!selected) return;
    if (!ACCEPTED.includes(selected.type)) {
      setError('Formato não suportado. Usa uma fotografia JPG, PNG ou WebP.');
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError('A fotografia tem mais de 8 MB. Reduz o tamanho antes de a carregar.');
      return;
    }
    setFile(selected);
  }

  function reset() {
    setFile(null);
    setCaption('');
    if (inputRef.current) inputRef.current.value = '';
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setNotice(null);
    setUploading(true);
    try {
      await api.gallery.upload(file, caption.trim() || undefined);
      reset();
      setNotice('Fotografia adicionada à galeria.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar a fotografia.');
    } finally {
      setUploading(false);
    }
  }

  async function saveCaption(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    setNotice(null);
    setSavingCaption(true);
    try {
      const caption = editing.caption.trim();
      await api.gallery.updateCaption(editing.id, caption);
      setPhotos((list) => list.map((p) => (p.id === editing.id ? { ...p, caption: caption || null } : p)));
      setEditing(null);
      setNotice('Legenda atualizada.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível guardar a legenda.');
    } finally {
      setSavingCaption(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    setNotice(null);
    try {
      await api.gallery.remove(id);
      setPhotos((list) => list.filter((p) => p.id !== id));
      setNotice('Fotografia removida.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível remover a fotografia.');
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-cream">Galeria</h1>
      <p className="mt-2 max-w-2xl text-sm text-cream/60">
        As fotografias aparecem na secção "Um pouco do que te espera" da página inicial, a mais recente primeiro.
        Formatos JPG, PNG ou WebP, até 8 MB. Clica na legenda de uma fotografia para a alterar.
      </p>

      <form onSubmit={upload} className="mt-6 flex flex-col gap-4 rounded border border-cream/10 bg-ink-soft p-5 sm:flex-row">
        <div className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded border border-dashed border-cream/20 bg-ink sm:w-48">
          {preview ? (
            <img src={preview} alt="Pré-visualização" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-cream/40">Sem fotografia</span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            onChange={(e) => pick(e.target.files?.[0])}
            className="text-sm text-cream/70 file:mr-3 file:rounded file:border-0 file:bg-magenta/20 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-magenta-soft"
          />
          <input
            type="text"
            placeholder="Legenda (opcional), ex.: Concurso de cosplay 2025"
            maxLength={120}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="input w-full bg-ink"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!file || uploading}
              className="cut-tag bg-yellow px-5 py-2 text-xs font-extrabold uppercase text-ink disabled:opacity-40"
            >
              {uploading ? 'A carregar…' : 'Adicionar à galeria'}
            </button>
            {file && !uploading && (
              <button type="button" onClick={reset} className="rounded border border-cream/20 px-3 py-1.5 text-xs text-cream/70 hover:text-cream">
                Cancelar
              </button>
            )}
          </div>
        </div>
      </form>

      {error && <p className="mt-4 text-sm text-magenta-soft">{error}</p>}
      {notice && <p className="mt-4 text-sm text-emerald-400">{notice}</p>}

      {loading && <p className="mt-8 text-sm text-cream/40">A carregar…</p>}
      {!loading && photos.length === 0 && (
        <p className="mt-8 text-sm text-cream/40">
          Ainda não há fotografias. Enquanto a galeria estiver vazia, a página inicial mostra as peças da identidade do
          evento.
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => (
          <figure key={photo.id} className="overflow-hidden rounded border border-cream/10 bg-ink-soft">
            <img src={photo.url} alt={photo.caption ?? 'Fotografia da galeria'} className="aspect-square w-full object-cover" loading="lazy" />
            {editing?.id === photo.id ? (
              <form onSubmit={saveCaption} className="space-y-2 p-3">
                <input
                  type="text"
                  autoFocus
                  aria-label="Legenda"
                  placeholder="Sem legenda"
                  maxLength={120}
                  value={editing.caption}
                  onChange={(e) => setEditing({ id: photo.id, caption: e.target.value })}
                  className="input w-full bg-ink text-xs"
                />
                <div className="flex gap-1">
                  <button
                    type="submit"
                    disabled={savingCaption}
                    className="rounded bg-yellow px-2 py-1 text-xs font-bold text-ink disabled:opacity-40"
                  >
                    {savingCaption ? 'A guardar…' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded px-2 py-1 text-xs text-cream/60 hover:text-cream"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <figcaption className="flex items-center justify-between gap-2 p-3">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(null);
                    setEditing({ id: photo.id, caption: photo.caption ?? '' });
                  }}
                  title="Editar legenda"
                  className="min-w-0 truncate text-left text-xs text-cream/70 underline decoration-cream/20 underline-offset-2 hover:text-cream"
                >
                  {photo.caption ?? 'Sem legenda'}
                </button>
                {confirmDelete === photo.id ? (
                  <span className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => remove(photo.id)}
                      className="rounded bg-magenta px-2 py-1 text-xs font-bold text-cream"
                    >
                      Remover
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="rounded px-2 py-1 text-xs text-cream/60 hover:text-cream"
                    >
                      Não
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(photo.id)}
                    className="shrink-0 rounded bg-magenta/20 px-2 py-1 text-xs font-bold text-magenta-soft hover:bg-magenta/30"
                  >
                    Remover
                  </button>
                )}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}
