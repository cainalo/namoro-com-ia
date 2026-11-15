import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleUserRound, Heart, LoaderCircle, LogOut, RefreshCw, UserRound } from "lucide-react";
import { AppGeneralSettings } from "@/components/AppGeneralSettings";
import { CoupleProfile } from "@/components/CoupleProfile";
import { MoradosMark } from "@/components/MoradosMark";
import { supabase } from "@/integrations/supabase/client";
import { completeCouplePairing } from "@/lib/couple-registration";
import { getProfileMediaUrl } from "@/lib/profile-media";

type PendingPairingScreenProps = {
  userId: string;
  notice?: string | null;
  onPaired: () => void;
};

export function PendingPairingScreen({ userId, notice, onPaired }: PendingPairingScreenProps) {
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);
  const onPairedRef = useRef(onPaired);
  onPairedRef.current = onPaired;
  const [profileOpen, setProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Seu acesso individual está liberado. Estamos aguardando a confirmação do outro e-mail.");
  const [statusError, setStatusError] = useState<string | null>(null);

  const refreshStatus = useCallback(async (runPairing = false) => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    setStatusError(null);
    try {
      if (runPairing) {
        const attempt = await completeCouplePairing();
        if (attempt.error) setStatusError(attempt.error);
      }

      const [{ data: membership, error: membershipError }, { data: profile }] = await Promise.all([
        supabase.from("couple_members")
          .select("couple_id")
          .eq("user_id", userId)
          .is("ended_at", null)
          .maybeSingle(),
        supabase.from("profiles")
          .select("display_name,avatar_path")
          .eq("id", userId)
          .maybeSingle(),
      ]);
      if (membershipError) throw membershipError;
      setDisplayName(profile?.display_name?.trim() || "");
      setAvatarUrl(await getProfileMediaUrl(profile?.avatar_path ?? null));

      if (!membership?.couple_id) {
        setStatusMessage("Seu perfil pessoal está pronto. O espaço compartilhado será liberado quando a outra conta concluir a confirmação do e-mail.");
        return;
      }

      const { data: couple, error: coupleError } = await supabase
        .from("couples")
        .select("id,status")
        .eq("id", membership.couple_id)
        .maybeSingle();
      if (coupleError) throw coupleError;

      if (couple?.status === "active") {
        onPairedRef.current();
        return;
      }
      setStatusMessage("Sua conta já foi confirmada. Falta a outra pessoa confirmar o e-mail dela para ativar o espaço compartilhado.");
    } catch {
      setStatusError("Não foi possível consultar o estado do vínculo agora. Seu perfil continua disponível.");
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshStatus(true);
    const timer = window.setInterval(() => void refreshStatus(false), 8000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshStatus(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshStatus]);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) setStatusError("Não foi possível sair da conta. Tente novamente.");
  }

  if (profileOpen) {
    return (
      <main className="pending-pairing-page">
        <div className="pending-pairing-wrap">
          <button type="button" className="pending-pairing-back" onClick={() => setProfileOpen(false)}>Voltar ao meu espaço</button>
          <CoupleProfile userId={userId} />
        </div>
      </main>
    );
  }

  return (
    <main className="pending-pairing-page">
      <div className="pending-pairing-wrap">
        <header className="pending-pairing-brand">
          <span><MoradosMark size={31} /></span>
          <strong>morados</strong>
        </header>
        <section className="pending-pairing-card">
          <div className="pending-pairing-avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={34} aria-hidden="true" />}
          </div>
          <span className="pending-pairing-kicker">SEU ESPAÇO PESSOAL</span>
          <h1>{displayName ? "Tudo pronto, " + displayName + "." : "Seu perfil está pronto."}</h1>
          <p className="pending-pairing-copy">{statusMessage}</p>
          <div className="pending-pairing-status">
            <span className="pending-pairing-status-icon"><Check size={17} /></span>
            <span><strong>Seu e-mail confirmado</strong><small>Você já pode acessar e personalizar seu perfil.</small></span>
          </div>
          <div className="pending-pairing-status is-waiting">
            <span className="pending-pairing-status-icon"><Heart size={17} /></span>
            <span><strong>Espaço compartilhado</strong><small>Será ativado assim que a outra conta confirmar o próprio e-mail.</small></span>
          </div>
          {notice && <p className="pending-pairing-note">{notice}</p>}
          {statusError && <p className="pending-pairing-error" role="alert">{statusError}</p>}
          <button type="button" className="pending-pairing-primary" onClick={() => void refreshStatus(true)} disabled={checking}>
            {checking ? <LoaderCircle className="animate-spin" size={18} /> : <RefreshCw size={18} />}
            {checking ? "Verificando…" : "Verificar novamente"}
          </button>
          <button type="button" className="pending-pairing-secondary" onClick={() => setProfileOpen(true)}>
            <CircleUserRound size={18} /> Editar meu perfil
          </button>
          <AppGeneralSettings />
          <button type="button" className="pending-pairing-signout" onClick={() => void signOut()}>
            <LogOut size={17} /> Sair
          </button>
        </section>
      </div>
    </main>
  );
}
