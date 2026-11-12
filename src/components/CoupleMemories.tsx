import { useEffect, useState, type FormEvent } from "react";
import { Download, LockKeyhole, RefreshCw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createCoupleMemory,
  deleteCoupleMemory,
  listCoupleMemories,
  updateCoupleMemory,
  type CoupleMemory,
  type MemoryVisibility,
} from "@/lib/couple-memories";

type MemoryFilter = "all" | "private" | "shared";

type MemoriesState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "database-pending" }
  | { status: "ready"; coupleId: string | null; memories: CoupleMemory[] };

function formatLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMemoryDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function isMissingMemoryTable(cause: unknown) {
  if (typeof cause !== "object" || cause === null) return false;
  const row = cause as { code?: unknown };
  return row.code === "42P01" || row.code === "PGRST205";
}

export function CoupleMemories({ userId }: { userId: string }) {
  const [state, setState] = useState<MemoriesState>({ status: "loading" });
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "offline">("connecting");
  const [visibility, setVisibility] = useState<MemoryVisibility>("private");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [memoryDate, setMemoryDate] = useState(() => formatLocalDate(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [memoryFilter, setMemoryFilter] = useState<MemoryFilter>("all");

  useEffect(() => {
    let active = true;

    async function loadMemories() {
      setState({ status: "loading" });
      setError(null);

      try {
        const { data: membership, error: membershipError } = await supabase
          .from("couple_members")
          .select("couple_id")
          .eq("user_id", userId)
          .is("ended_at", null)
          .maybeSingle();

        if (membershipError) throw membershipError;
        if (!active) return;

        let activeCoupleId: string | null = null;
        if (membership?.couple_id) {
          const { data: couple, error: coupleError } = await supabase
            .from("couples")
            .select("id, status")
            .eq("id", membership.couple_id)
            .maybeSingle();

          if (coupleError) throw coupleError;
          if (couple?.status === "active") activeCoupleId = couple.id;
        }

        if (!activeCoupleId) setVisibility("private");

        const result = await listCoupleMemories();
        if (result.error) throw result.error;
        if (!active) return;

        setState({
          status: "ready",
          coupleId: activeCoupleId,
          memories: (result.data ?? []).filter(
            (memory) =>
              memory.visibility === "private" ||
              (memory.visibility === "shared" && memory.couple_id === activeCoupleId),
          ),
        });
      } catch (cause) {
        if (!active) return;
        setState({
          status: isMissingMemoryTable(cause) ? "database-pending" : "error",
        });
      }
    }

    void loadMemories();
    return () => {
      active = false;
    };
  }, [userId, refreshKey]);

  const activeCoupleId = state.status === "ready" ? state.coupleId : null;

  useEffect(() => {
    if (!activeCoupleId) {
      setRealtimeStatus("offline");
      return;
    }

    let mounted = true;
    setRealtimeStatus("connecting");

    const channel = supabase
      .channel(`couple-memories:${activeCoupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "couple_memories",
          filter: `couple_id=eq.${activeCoupleId}`,
        },
        () => {
          if (mounted) setRefreshKey((current) => current + 1);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "couple_memories",
          filter: `couple_id=eq.${activeCoupleId}`,
        },
        () => {
          if (mounted) setRefreshKey((current) => current + 1);
        },
      )
      .subscribe((status) => {
        if (!mounted) return;
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeStatus("offline");
        }
      });

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [activeCoupleId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "ready" || busy) return;

    const normalizedBody = body.trim();
    const normalizedTitle = title.trim();
    if (!normalizedBody) {
      setError("Escreva o conteúdo da lembrança.");
      return;
    }
    if (visibility === "shared" && !state.coupleId) {
      setError("Vincule a outra conta antes de compartilhar uma lembrança.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const result = await createCoupleMemory({
        ownerId: userId,
        coupleId: visibility === "shared" ? state.coupleId : null,
        visibility,
        title: normalizedTitle || null,
        body: normalizedBody,
        memoryDate,
      });

      if (result.error) throw result.error;
      setTitle("");
      setBody("");
      setNotice("Lembrança guardada.");
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      if (isMissingMemoryTable(cause)) {
        setState({ status: "database-pending" });
      } else {
        setError("Não foi possível guardar a lembrança. Confira os dados e tente novamente.");
      }
    } finally {
      setBusy(false);
    }
  }

  function startEditing(memory: CoupleMemory) {
    if (memory.owner_id !== userId || editBusy) return;
    setEditingId(memory.id);
    setDeleteConfirmId(null);
    setDeleteError(null);
    setEditTitle(memory.title ?? "");
    setEditBody(memory.body);
    setEditDate(memory.memory_date);
    setEditError(null);
    setError(null);
  }

  function cancelEditing() {
    if (editBusy) return;
    setEditingId(null);
    setEditError(null);
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, memoryId: string) {
    event.preventDefault();
    if (editingId !== memoryId || editBusy) return;

    const normalizedBody = editBody.trim();
    if (!normalizedBody) {
      setEditError("O conteúdo da lembrança não pode ficar vazio.");
      return;
    }

    setEditBusy(true);
    setEditError(null);
    setNotice(null);

    try {
      const result = await updateCoupleMemory({
        id: memoryId,
        title: editTitle.trim() || null,
        body: normalizedBody,
        memoryDate: editDate,
      });

      if (result.error) throw result.error;
      setEditingId(null);
      setNotice("Lembrança atualizada.");
      setRefreshKey((current) => current + 1);
    } catch {
      setEditError("Não foi possível atualizar esta lembrança.");
    } finally {
      setEditBusy(false);
    }
  }

  function requestDelete(memory: CoupleMemory) {
    if (memory.owner_id !== userId || deleteBusy) return;
    setEditingId(null);
    setDeleteConfirmId(memory.id);
    setDeleteError(null);
    setError(null);
  }

  function cancelDelete() {
    if (deleteBusy) return;
    setDeleteConfirmId(null);
    setDeleteError(null);
  }

  const visibleMemories =
    state.status === "ready"
      ? state.memories.filter((memory) => {
          const matchesVisibility =
            memoryFilter === "all" || memory.visibility === memoryFilter;
          const normalizedQuery = searchQuery.trim().toLocaleLowerCase("pt-BR");
          const searchableText = `${memory.title ?? ""} ${memory.body}`.toLocaleLowerCase("pt-BR");
          return matchesVisibility && (!normalizedQuery || searchableText.includes(normalizedQuery));
        })
      : [];

  function exportVisibleMemories() {
    if (state.status !== "ready" || visibleMemories.length === 0) return;

    const exportedAt = formatLocalDate(new Date());
    const content = [
      "MEMÓRIAS — NAMORO",
      `Exportado em: ${exportedAt}`,
      `Registros: ${visibleMemories.length}`,
      "",
      ...visibleMemories.flatMap((memory, index) => [
        `${index + 1}. ${memory.title || "Lembrança sem título"}`,
        `Data: ${memory.memory_date}`,
        `Privacidade: ${memory.visibility === "shared" ? "Compartilhada" : "Privada"}`,
        "",
        memory.body,
        "",
        "—".repeat(36),
        "",
      ]),
    ].join("\n");

    const file = new Blob(["\\uFEFF", content], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `namoro-memorias-${exportedAt}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setNotice(`${visibleMemories.length} lembrança(s) exportada(s).`);
  }

  async function handleDelete(memoryId: string) {
    if (state.status !== "ready" || deleteConfirmId !== memoryId || deleteBusy) return;
    const memory = state.memories.find((item) => item.id === memoryId);
    if (!memory || memory.owner_id !== userId) return;

    setDeleteBusy(true);
    setDeleteError(null);
    setNotice(null);

    try {
      const result = await deleteCoupleMemory(memoryId);
      if (result.error) throw result.error;
      setDeleteConfirmId(null);
      setNotice("Lembrança excluída.");
      setRefreshKey((current) => current + 1);
    } catch {
      setDeleteError("Não foi possível excluir esta lembrança.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <section className="memories-screen">
      <div className="memories-toolbar">
          <span className={activeCoupleId && realtimeStatus === "connected" ? "memories-live-status is-connected" : "memories-live-status"} role="status">
            {!activeCoupleId
              ? "Biblioteca privada"
              : realtimeStatus === "connected"
                ? "Memórias compartilhadas ao vivo"
                : realtimeStatus === "connecting"
                  ? "Conectando memórias…"
                  : "Atualização manual"}
          </span>
        <div className="memories-heading-actions">
          <button
            type="button"
            className="inline-action"
            onClick={exportVisibleMemories}
            disabled={state.status !== "ready" || visibleMemories.length === 0}
          >
            <Download aria-hidden="true" />
            Exportar seleção
          </button>
          <button
            type="button"
            className="inline-action"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={state.status === "loading" || busy}
          >
            <RefreshCw aria-hidden="true" />
            Atualizar
          </button>
        </div>
      </div>

      {state.status === "loading" && (
        <p className="memories-state" role="status">Carregando lembranças…</p>
      )}

      {state.status === "database-pending" && (
        <div className="memories-state" role="status">
          <p>A estrutura de Memórias ainda está sendo preparada no banco de dados.</p>
          <button
            type="button"
            className="inline-action"
            onClick={() => setRefreshKey((current) => current + 1)}
          >
            Verificar novamente
          </button>
        </div>
      )}

      {state.status === "error" && (
        <div className="memories-state">
          <p role="alert">Não foi possível carregar as lembranças.</p>
          <button
            type="button"
            className="inline-action"
            onClick={() => setRefreshKey((current) => current + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <form className="memory-composer" onSubmit={handleSubmit}>
            <div className="memory-composer-topline">
              <strong>Guardar lembrança</strong>
              <div className="memory-visibility-switch" role="group" aria-label="Privacidade da lembrança">
                <button
                  type="button"
                  className={visibility === "private" ? "is-active" : ""}
                  aria-pressed={visibility === "private"}
                  disabled={busy}
                  onClick={() => setVisibility("private")}
                >
                  <LockKeyhole aria-hidden="true" />
                  Privada
                </button>
                <button
                  type="button"
                  className={visibility === "shared" ? "is-active" : ""}
                  aria-pressed={visibility === "shared"}
                  disabled={!state.coupleId || busy}
                  onClick={() => setVisibility("shared")}
                >
                  <Users aria-hidden="true" />
                  Compartilhada
                </button>
              </div>
            </div>

            <input
              className="memory-title-input"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Título (opcional)"
              maxLength={120}
              aria-label="Título da lembrança"
              disabled={busy}
            />

            <textarea
              className="memory-body-input"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="O que você quer guardar?"
              maxLength={5000}
              rows={4}
              required
              aria-label="Conteúdo da lembrança"
              disabled={busy}
            />

            <div className="memory-composer-footer">
              <label className="memory-date-field">
                <span>Data</span>
                <input
                  type="date"
                  value={memoryDate}
                  onChange={(event) => setMemoryDate(event.target.value)}
                  required
                  disabled={busy}
                />
              </label>
              <span className="memory-character-count">{body.length}/5000</span>
              <button
                type="submit"
                className="primary-action"
                disabled={busy || !body.trim()}
              >
                {busy ? "Guardando…" : "Guardar"}
              </button>
            </div>

            <p className="memory-privacy-note">
              {visibility === "private"
                ? "Só você poderá ver esta lembrança."
                : "As duas pessoas do casal ativo poderão ver esta lembrança."}
            </p>

            {error && <p className="memory-feedback is-error" role="alert">{error}</p>}
            {notice && <p className="memory-feedback" role="status">{notice}</p>}
          </form>

          <div className="memories-list">
            <div className="memories-list-heading">
              <h2>Guardadas</h2>
              <span>{visibleMemories.length} de {state.memories.length}</span>
            </div>

            <div className="memories-filter-bar">
              <label className="memories-search">
                <span>Buscar</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Título ou conteúdo…"
                  aria-label="Buscar lembranças por título ou conteúdo"
                />
              </label>
              <div className="memories-filter-options" role="group" aria-label="Filtrar por privacidade">
                <button
                  type="button"
                  className={memoryFilter === "all" ? "is-active" : ""}
                  aria-pressed={memoryFilter === "all"}
                  onClick={() => setMemoryFilter("all")}
                >
                  Todas
                </button>
                <button
                  type="button"
                  className={memoryFilter === "private" ? "is-active" : ""}
                  aria-pressed={memoryFilter === "private"}
                  onClick={() => setMemoryFilter("private")}
                >
                  Privadas
                </button>
                <button
                  type="button"
                  className={memoryFilter === "shared" ? "is-active" : ""}
                  aria-pressed={memoryFilter === "shared"}
                  onClick={() => setMemoryFilter("shared")}
                >
                  Compartilhadas
                </button>
              </div>
            </div>

            {state.memories.length === 0 ? (
              <p className="memories-state">Nenhuma lembrança guardada ainda.</p>
            ) : visibleMemories.length === 0 ? (
              <div className="memories-state">
                <p>Nenhuma lembrança corresponde à busca ou ao filtro.</p>
                <button
                  type="button"
                  className="inline-action"
                  onClick={() => {
                    setSearchQuery("");
                    setMemoryFilter("all");
                  }}
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              visibleMemories.map((memory) =>
                editingId === memory.id ? (
                  <form
                    className="memory-edit-form"
                    key={memory.id}
                    onSubmit={(event) => void handleUpdate(event, memory.id)}
                  >
                    <div className="memory-edit-heading">
                      <strong>Editar lembrança</strong>
                      <span>{memory.visibility === "shared" ? "Compartilhada" : "Privada"}</span>
                    </div>
                    <input
                      className="memory-title-input"
                      type="text"
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      placeholder="Título (opcional)"
                      maxLength={120}
                      aria-label="Título da lembrança"
                      disabled={editBusy}
                    />
                    <textarea
                      className="memory-body-input"
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                      maxLength={5000}
                      rows={4}
                      required
                      aria-label="Conteúdo da lembrança"
                      disabled={editBusy}
                    />
                    <div className="memory-edit-footer">
                      <label className="memory-date-field">
                        <span>Data</span>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(event) => setEditDate(event.target.value)}
                          required
                          disabled={editBusy}
                        />
                      </label>
                      <span className="memory-character-count">{editBody.length}/5000</span>
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={cancelEditing}
                        disabled={editBusy}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="primary-action"
                        disabled={editBusy || !editBody.trim()}
                      >
                        {editBusy ? "Salvando…" : "Salvar"}
                      </button>
                    </div>
                    {editError && <p className="memory-feedback is-error" role="alert">{editError}</p>}
                  </form>
                ) : (
                  <article className="memory-entry" key={memory.id}>
                    <div className="memory-entry-meta">
                      <time dateTime={memory.memory_date}>
                        {formatMemoryDate(memory.memory_date)}
                      </time>
                      <span className={memory.visibility === "shared" ? "is-shared" : "is-private"}>
                        {memory.visibility === "shared" ? "Compartilhada" : "Privada"}
                      </span>
                      {memory.owner_id === userId && (
                        <div className="memory-entry-actions">
                          <button
                            type="button"
                            className="memory-edit-action"
                            onClick={() => startEditing(memory)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="memory-delete-action"
                            onClick={() => requestDelete(memory)}
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                    {deleteConfirmId === memory.id && (
                      <div className="memory-delete-confirm" role="alert">
                        <p>Excluir esta lembrança definitivamente?</p>
                        <div>
                          <button
                            type="button"
                            className="secondary-action"
                            onClick={cancelDelete}
                            disabled={deleteBusy}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="memory-delete-confirm-action"
                            onClick={() => void handleDelete(memory.id)}
                            disabled={deleteBusy}
                          >
                            {deleteBusy ? "Excluindo…" : "Sim, excluir"}
                          </button>
                        </div>
                        {deleteError && <p className="memory-feedback is-error" role="alert">{deleteError}</p>}
                      </div>
                    )}
                    <h3>{memory.title || "Lembrança sem título"}</h3>
                    <p>{memory.body}</p>
                  </article>
                )
              )
            )}
          </div>
        </>
      )}
    </section>
  );
}
