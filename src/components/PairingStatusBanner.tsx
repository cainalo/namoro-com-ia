import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, LoaderCircle, RefreshCw } from "lucide-react";
import { completeCouplePairing } from "@/lib/couple-registration";
import { supabase } from "@/integrations/supabase/client";

export function PairingStatusBanner({ userId }: { userId: string }) {
  const checkingRef = useRef(false);
  const activatedRef = useRef(false);
  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("Seu espaço pessoal está liberado. Estamos aguardando a confirmação da outra conta.");
  const [error, setError] = useState<string | null>(null);

  const verifyPairing = useCallback(async (attemptPairing = true) => {
    if (checkingRef.current || activatedRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    setError(null);

    try {
      const pairing = attemptPairing
        ? await completeCouplePairing()
        : { active: false, pending: false, error: null };

      const { data: membership, error: membershipError } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", userId)
        .is("ended_at", null)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership?.couple_id) {
        setPending(Boolean(pairing.pending));
        setMessage("Seu perfil está pronto. Assim que a outra conta confirmar o e-mail e entrar, o espaço compartilhado será conectado automaticamente.");
        return;
      }

      const { data: couple, error: coupleError } = await supabase
        .from("couples")
        .select("id,status")
        .eq("id", membership.couple_id)
        .maybeSingle();

      if (coupleError) throw coupleError;
      if (couple?.status === "active" || pairing.active) {
        activatedRef.current = true;
        setPending(false);
        window.location.reload();
        return;
      }

      const stillPending = couple?.status === "pending" || pairing.pending;
      setPending(stillPending);
      if (pairing.error) {
        setError(pairing.error);
      }
      setMessage("Seu espaço pessoal está liberado. Quando a outra pessoa confirmar o e-mail dela, o espaço compartilhado será ativado automaticamente.");
    } catch {
      setError("Não foi possível verificar o pareamento agora. Seu acesso pessoal continua funcionando.");
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [userId]);

  useEffect(() => {
    void verifyPairing(true);
    const timer = window.setInterval(() => void verifyPairing(true), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void verifyPairing(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [verifyPairing]);

  if (!pending) return null;

  return (
    <aside className="pairing-status-banner" role="status" aria-live="polite">
      <span className="pairing-status-icon"><Heart size={17} aria-hidden="true" /></span>
      <div className="pairing-status-copy">
        <strong>Seu espaço pessoal está ativo</strong>
        <span>{message}</span>
        {error && <small role="alert">{error}</small>}
      </div>
      <button type="button" onClick={() => void verifyPairing(true)} disabled={checking} aria-label="Verificar confirmação da outra conta">
        {checking ? <LoaderCircle className="animate-spin" size={17} /> : <RefreshCw size={17} />}
        <span>{checking ? "Verificando" : "Verificar"}</span>
      </button>
    </aside>
  );
}
