import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { callCoupleRpc, isRecord } from "@/lib/couple-rpc";

type Couple = {
  id: string;
  status: "pending" | "active";
};

type Invitation = {
  url: string;
  expiresAt: string;
};

type CoupleSetupProps = {
  userId: string;
};

function formatExpiry(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function invitationErrorMessage(message: string, code?: string) {
  const normalized = message.toLowerCase();
  if (code === "PGRST202" || normalized.includes("could not find the function")) {
    return "O serviço de convite ainda está sendo publicado. Tente novamente.";
  }
  if (normalized.includes("account_already_linked")) {
    return "Esta conta já está vinculada a outro espaço.";
  }
  if (normalized.includes("already belongs to a current couple")) {
    return "Esta conta já tem um espaço iniciado.";
  }
  return "Não foi possível concluir. Tente novamente.";
}

export function CoupleSetup({ userId }: CoupleSetupProps) {
  const [couple, setCouple] = useState<Couple | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadCouple() {
      setLoading(true);
      setError(null);

      const { data: membership, error: membershipError } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", userId)
        .is("ended_at", null)
        .maybeSingle();

      if (!active) return;
      if (membershipError) {
        setError("Não foi possível carregar o espaço.");
        setLoading(false);
        return;
      }

      if (!membership) {
        setCouple(null);
        setInvitation(null);
        setLoading(false);
        return;
      }

      const { data, error: coupleError } = await supabase
        .from("couples")
        .select("id, status")
        .eq("id", membership.couple_id)
        .maybeSingle();

      if (!active) return;
      if (coupleError || !data) {
        setError("Não foi possível carregar o espaço.");
      } else {
        setCouple({
          id: data.id,
          status: data.status === "active" ? "active" : "pending",
        });
        // The raw link is intentionally never recovered from the database.
        setInvitation(null);
      }
      setLoading(false);
    }

    void loadCouple();
    return () => {
      active = false;
    };
  }, [userId, reloadKey]);

  async function createCouple() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const { data, error: createError } = await supabase.rpc("create_couple", {});
      if (createError) {
        setError(invitationErrorMessage(createError.message, createError.code));
        return;
      }
      if (!data) {
        setError("Não foi possível criar o espaço. Tente novamente.");
        return;
      }
      setCouple({ id: data, status: "pending" });
      setInvitation(null);
      setNotice("Espaço criado. Agora gere o convite.");
    } catch {
      setError("Não foi possível criar o espaço. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function createInvitation() {
    if (!couple || couple.status !== "pending" || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const { data, error: rpcError } = await callCoupleRpc(
        "create_couple_invitation",
        { p_couple_id: couple.id },
      );
      if (rpcError) {
        setError(invitationErrorMessage(rpcError.message, rpcError.code));
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!isRecord(row) || typeof row.token !== "string" || typeof row.expires_at !== "string") {
        setError("O convite não pôde ser criado. Tente novamente.");
        return;
      }

      const url = new URL(`/invite/${encodeURIComponent(row.token)}`, window.location.origin).toString();
      setInvitation({ url, expiresAt: row.expires_at });
      setNotice("Link pronto para compartilhar.");
    } catch {
      setError("O convite não pôde ser criado. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvitation() {
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation.url);
      setNotice("Link copiado.");
      setError(null);
    } catch {
      setError("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  async function shareInvitation() {
    if (!invitation) return;
    if (typeof navigator.share !== "function") {
      await copyInvitation();
      return;
    }

    try {
      await navigator.share({
        title: "Convite para nosso espaço",
        text: "Entre no nosso espaço compartilhado.",
        url: invitation.url,
      });
      setNotice("Convite compartilhado.");
      setError(null);
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setError("Não foi possível compartilhar o convite.");
    }
  }

  async function revokeInvitation() {
    if (!couple || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const { data, error: rpcError } = await callCoupleRpc(
        "revoke_couple_invitation",
        { p_couple_id: couple.id },
      );
      if (rpcError) {
        setError(invitationErrorMessage(rpcError.message, rpcError.code));
        return;
      }
      setInvitation(null);
      setNotice(data === true ? "Convite revogado." : "Não havia convite ativo.");
    } catch {
      setError("Não foi possível revogar o convite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="couple-setup" aria-labelledby="couple-setup-title">
      <div className="section-heading">
        <h2 id="couple-setup-title">Espaço de vocês</h2>
      </div>

      {loading ? (
        <p className="couple-setup-copy" role="status">Carregando…</p>
      ) : error && !couple ? (
        <div className="couple-setup-content">
          <p className="couple-feedback couple-feedback-error" role="alert">{error}</p>
          <button type="button" className="inline-action" onClick={() => setReloadKey((key) => key + 1)}>
            Tentar novamente
          </button>
        </div>
      ) : couple?.status === "active" ? (
        <p className="couple-setup-copy">Vocês já estão conectados.</p>
      ) : couple?.status === "pending" ? (
        <div className="couple-setup-content">
          {invitation ? (
            <>
              <label className="couple-link-field">
                <span>Link de convite</span>
                <input value={invitation.url} readOnly aria-label="Link de convite" />
              </label>
              <p className="couple-setup-copy">Válido até {formatExpiry(invitation.expiresAt)}.</p>
              <div className="couple-setup-actions">
                <button type="button" className="primary-action" onClick={copyInvitation} disabled={busy}>
                  Copiar link
                </button>
                <button type="button" className="secondary-action" onClick={shareInvitation} disabled={busy}>
                  Compartilhar
                </button>
              </div>
              <div className="couple-setup-secondary-actions">
                <button type="button" className="inline-action" onClick={createInvitation} disabled={busy}>
                  Gerar novo link
                </button>
                <button type="button" className="inline-action couple-danger-action" onClick={revokeInvitation} disabled={busy}>
                  Revogar
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="couple-setup-copy">Seu espaço está aguardando a outra pessoa.</p>
              <button type="button" className="primary-action" onClick={createInvitation} disabled={busy}>
                {busy ? "Aguarde…" : "Gerar link de convite"}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="couple-setup-content">
          <button type="button" className="primary-action" onClick={createCouple} disabled={busy}>
            {busy ? "Aguarde…" : "Criar nosso espaço"}
          </button>
        </div>
      )}

      {error && couple && <p className="couple-feedback couple-feedback-error" role="alert">{error}</p>}
      {notice && <p className="couple-feedback" role="status">{notice}</p>}
    </section>
  );
}
