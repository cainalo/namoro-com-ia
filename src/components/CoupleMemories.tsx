import { useEffect, useState, type FormEvent } from "react";
import { LockKeyhole, RefreshCw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createCoupleMemory,
  listCoupleMemories,
  type CoupleMemory,
  type MemoryVisibility,
} from "@/lib/couple-memories";

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
  const [visibility, setVisibility] = useState<MemoryVisibility>("private");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [memoryDate, setMemoryDate] = useState(() => formatLocalDate(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  return (
    <section className="memories-screen" aria-labelledby="memories-title">
      <header className="memories-heading">
        <div>
          <p className="date-kicker">Lembranças de vocês</p>
          <h1 id="memories-title">Memórias</h1>
        </div>
        <button
          type="button"
          className="inline-action"
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={state.status === "loading" || busy}
        >
          <RefreshCw aria-hidden="true" />
          Atualizar
        </button>
      </header>

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
                  onClick={() => setVisibility("private")}
                >
                  <LockKeyhole aria-hidden="true" />
                  Privada
                </button>
                <button
                  type="button"
                  className={visibility === "shared" ? "is-active" : ""}
                  aria-pressed={visibility === "shared"}
                  disabled={!state.coupleId}
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

          <div className="memories-list" aria-live="polite">
            <div className="memories-list-heading">
              <h2>Guardadas</h2>
              <span>{state.memories.length}</span>
            </div>

            {state.memories.length === 0 ? (
              <p className="memories-state">Nenhuma lembrança guardada ainda.</p>
            ) : (
              state.memories.map((memory) => (
                <article className="memory-entry" key={memory.id}>
                  <div className="memory-entry-meta">
                    <time dateTime={memory.memory_date}>
                      {formatMemoryDate(memory.memory_date)}
                    </time>
                    <span className={memory.visibility === "shared" ? "is-shared" : "is-private"}>
                      {memory.visibility === "shared" ? "Compartilhada" : "Privada"}
                    </span>
                  </div>
                  <h3>{memory.title || "Lembrança sem título"}</h3>
                  <p>{memory.body}</p>
                </article>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
