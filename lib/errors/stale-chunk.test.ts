import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isStaleChunkError, tentarRecarregarSeChunkDesatualizado } from "./stale-chunk";

describe("isStaleChunkError", () => {
  it("reconhece o ChunkLoadError clássico do webpack", () => {
    const erro = new Error("Loading chunk 42 failed.");
    erro.name = "ChunkLoadError";
    expect(isStaleChunkError(erro)).toBe(true);
  });

  it("reconhece a mensagem do Turbopack/Chrome para import() dinâmico", () => {
    const erro = new TypeError(
      "Failed to fetch dynamically imported module: https://app.exemplo.com/_next/static/chunks/123.js",
    );
    expect(isStaleChunkError(erro)).toBe(true);
  });

  it("reconhece a mensagem do Firefox", () => {
    const erro = new TypeError("error loading dynamically imported module: https://app.exemplo.com/x.js");
    expect(isStaleChunkError(erro)).toBe(true);
  });

  it("não confunde um erro de negócio comum com falta de chunk", () => {
    expect(isStaleChunkError(new Error("auth_permissions_unavailable: RLS instável"))).toBe(false);
  });
});

describe("tentarRecarregarSeChunkDesatualizado", () => {
  const CHAVE = "deskcomm:stale-chunk-reload-attempted";
  let reloadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.sessionStorage.clear();
    reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadSpy },
      writable: true,
    });
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("recarrega a página na primeira ocorrência e marca a sessão", () => {
    const erro = new Error("Loading chunk 7 failed.");
    erro.name = "ChunkLoadError";

    const disparou = tentarRecarregarSeChunkDesatualizado(erro);

    expect(disparou).toBe(true);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(CHAVE)).toBe("1");
  });

  it("não recarrega de novo na segunda ocorrência na mesma aba (evita loop)", () => {
    const erro = new Error("Loading chunk 7 failed.");
    erro.name = "ChunkLoadError";

    tentarRecarregarSeChunkDesatualizado(erro);
    reloadSpy.mockClear();
    const disparouDeNovo = tentarRecarregarSeChunkDesatualizado(erro);

    expect(disparouDeNovo).toBe(false);
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("não recarrega para um erro que não é de chunk desatualizado", () => {
    const disparou = tentarRecarregarSeChunkDesatualizado(new Error("algo genérico quebrou"));

    expect(disparou).toBe(false);
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
