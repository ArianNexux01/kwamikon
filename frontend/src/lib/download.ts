/** Guarda no computador um ficheiro recebido da API (ex.: exportação CSV). */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revogar só depois do clique ter sido processado, para o download não ser cancelado.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
