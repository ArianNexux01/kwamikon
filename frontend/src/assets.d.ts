// A versão instalada do Vite deixou de declarar os imports de .svg (vite/client);
// sem isto o `tsc -b` do build de produção falha.
declare module '*.svg' {
  const src: string;
  export default src;
}
