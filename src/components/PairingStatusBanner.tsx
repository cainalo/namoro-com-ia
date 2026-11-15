import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, LoaderCircle, RefreshCw } from "lucide-react";
import { completeCouplePairing } from "@/lib/couple-registration";
import { supabase } from "@/integrations/supabase/client";

export function PairingStatusBanner({ userId }: { userId: string }) {
  const checkingRef = useRef(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("Seu espaço pessoal está liberado. O espaço compartilhado será ativado quando a outra conta confirmar o e-mail.");
  const [error, setError] = useState<string | null>(null);

  const verifyPairing = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    setError(null);

    try {
      const pairing = await completeCouplePairing();
      if (pairing.error) {
        setError("Não foi possível sincronizar o pareamento agora. Você continua usando seu espaço pessoal normalmente.");
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", userId)
        .is("ended_at", null)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership?.couple_id) {
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
        setMessage("Tudo certo: as duas contas foram confirmadas. Abrindo o espaço compartilhado…");
        window.dispatchEvent(new Event("morados:pairing-completed"));
        window.location.reload();
        return;
      }

      setMessage("Seu espaço pessoal está liberado. Quando a outra pessoa confirmar o e-mail dela, o espaço compartilhado será ativado automaticamente.");
    } catch {
      setError("Não foi possível verificar agora. Seu acesso pessoal continua funcionando.");
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [userId]);

  useEffect(() => {
    void verifyPairing();
    const timer = window.setInterval(() => void verifyPairing(), 12000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void verifyPairing();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [verifyPairing]);

  return (
    <aside className="pairing-status-banner" role="status" aria-live="polite">
      <span className="pairing-status-icon"><Heart size={17} aria-hidden="true" /></span>
      <div className="pairing-status-copy">
        <strong>Seu espaço pessoal está ativo</strong>
        <span>{message}</span>
        {error && <small role="alert">{error}</small>}
      </div>
      <button type="button" onClick={() => void verifyPairing()} disabled={checking} aria-label="Verificar confirmação da outra conta">
        {checking ? <LoaderCircle className="animate-spin" size={17} /> : <RefreshCw size={17} />}
        <span>{checking ? "Verificando" : "Verificar"}</span>
      </button>
    </aside>
  );
}
