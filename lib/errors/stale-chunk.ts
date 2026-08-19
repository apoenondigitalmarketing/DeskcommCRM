/**
 * Detecta o erro que uma aba deixada aberta durante um `update.sh` produz.
 *
 * O self-host deste produto atualiza a imagem sem avisar quem já está com o
 * app aberto (doutrina de packaging: bump de versão não pede nada do
 * operador). Uma aba aberta de antes do deploy guarda em memória os nomes dos
 * arquivos JS da build ANTERIOR; ao navegar para uma rota que só ENTÃO carrega
 * um pedaço de código sob demanda (ex.: `next/dynamic`, como o editor visual
 * de follow-up — a única rota que importa `@xyflow/react`), o browser busca um
 * arquivo que o container novo não tem mais. Não é bug de produto: é o preço
 * de atualizar sem F5. Os textos variam por engine/navegador — Turbopack
 * (Chrome/Firefox/Safari) e o `ChunkLoadError` clássico do webpack.
 */
export function isStaleChunkError(error: Error): boolean {
  const texto = `${error.name} ${error.message}`;
  return /ChunkLoadError|Loading chunk [\d]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
    texto,
  );
}

const CHAVE_JA_TENTOU_RECARREGAR = "deskcomm:stale-chunk-reload-attempted";

/**
 * Se o erro for isso, recarrega a aba UMA vez (por sessão de aba) em vez de
 * mostrar a tela genérica — o reload busca o HTML/JS atuais e resolve
 * sozinho. `sessionStorage` (não `localStorage`) trava só esta aba e só até
 * ela fechar; a segunda ocorrência na mesma aba já não tenta de novo, pra não
 * entrar em loop se a causa for outra.
 *
 * Devolve `true` quando disparou o reload — o chamador deve segurar a
 * renderização normal (e não mandar isto pro Sentry, que já sabe: é o
 * `update.sh`, não uma exceção do produto).
 */
export function tentarRecarregarSeChunkDesatualizado(error: Error): boolean {
  if (typeof window === "undefined" || !isStaleChunkError(error)) return false;
  if (window.sessionStorage.getItem(CHAVE_JA_TENTOU_RECARREGAR)) return false;
  window.sessionStorage.setItem(CHAVE_JA_TENTOU_RECARREGAR, "1");
  window.location.reload();
  return true;
}
