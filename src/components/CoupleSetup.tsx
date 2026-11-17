import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { completeCouplePairing } from "@/lib/couple-registration";

type Couple = { id: string; status: "pending" | "active" };

export function CoupleSetup({ userId }: { userId: string }) {
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
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
        if (!membership) {
          setCouple(null);
          setLoading(false);
          return;
        }
        const { data, error: coupleError } = await supabase
          .from("couples")
          .select("id,status")
          .eq("id", membership.couple_id)
          .maybeSingle();
        if (coupleError) throw coupleError;
        if (!active) return;
        setCouple(data ? { id: data.id, status: data.status === "active" ? "active" : "pending" } : null);
      } catch {
        if (active) setError("Não foi possível carregar o vínculo agora.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [userId, reloadKey]);

  async function verifyPairing() {
    if (checking) return;
    setChecking(true);
    setError(null);
    setNotice(null);
    try {
      const result = await completeCouplePairing();
      if (result.connected) {
        setNotice("As duas contas foram confirmadas e já estão conectadas.");
        window.dispatchEvent(new Event("morados:couple-updated"));
      } else if (result.pending) {
        setNotice("O vínculo será concluído automaticamente quando os dois e-mails estiverem confirmados e cada pessoa entrar na própria conta.");
      } else {
        setNotice("Não há um pareamento automático pendente nesta conta. Nos novos cadastros, informe os dois e-mails juntos na criação do casal.");
      }
      setReloadKey((key) => key + 1);
    } catch {
      setError("Não foi possível verificar o vínculo agora. Tente novamente.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="couple-setup" aria-labelledby="couple-setup-title">
      <div className="section-heading"><h2 id="couple-setup-title">Espaço de vocês</h2></div>
      {loading ? (
        <p className="couple-setup-copy" role="status">Verificando vínculo…</p>
      ) : error && !couple ? (
        <div className="couple-setup-content">
          <p className="couple-feedback couple-feedback-error" role="alert">{error}</p>
          <button type="button" className="inline-action" onClick={() => setReloadKey((key) => key + 1)}>Tentar novamente</button>
        </div>
      ) : couple?.status === "active" ? (
        <div className="couple-setup-content">
          <p className="couple-setup-copy">As duas contas já estão conectadas.</p>
          <button type="button" className="inline-action" onClick={() => setReloadKey((key) => key + 1)}>Atualizar status</button>
        </div>
      ) : (
        <div className="couple-setup-content">
          <p className="couple-setup-copy">
            Seu espaço já está pronto. Você pode publicar e conversar agora; quando a outra pessoa confirmar o próprio e-mail e entrar na conta dela, encontrará tudo o que você compartilhou.
          </p>
          <button type="button" className="primary-action" onClick={() => void verifyPairing()} disabled={checking}>
            {checking ? "Verificando…" : "Atualizar status do vínculo"}
          </button>
        </div>
      )}
      {error && couple && <p className="couple-feedback couple-feedback-error" role="alert">{error}</p>}
      {notice && <p className="couple-feedback" role="status">{notice}</p>}
    </section>
  );
}
