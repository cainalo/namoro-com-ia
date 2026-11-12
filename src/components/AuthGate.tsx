import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowRight, ArrowUpRight, Download, Eye, EyeOff, KeyRound, LogOut,
  Mail, ShieldCheck, Sparkles,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MoradosMark } from "@/components/MoradosMark";
import { supabase } from "@/integrations/supabase/client";

type AuthGateProps = {
  children: (session: Session) => ReactNode;
  emailRedirectTo?: () => string;
};
type AuthMode = "signin" | "signup";

export function AuthGate({ children, emailRedirectTo }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      authEventReceived = true;
      setSession(nextSession);
      setChecking(false);
    });

    const fallbackTimer = window.setTimeout(() => {
      if (active) setChecking(false);
    }, 5000);

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error("Could not restore Supabase session", error);
        if (!authEventReceived) setSession(data.session);
        setChecking(false);
      })
      .catch((error: unknown) => {
        console.error("Could not initialize Supabase authentication", error);
        if (!active) return;
        if (!authEventReceived) setSession(null);
        setChecking(false);
      });

    return () => {
      active = false;
      window.clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <main className="auth-v2-loading" aria-busy="true">
        <div className="auth-v2-loading-mark"><MoradosMark size={34} /></div>
        <span>Preparando o espaço de vocês</span>
      </main>
    );
  }

  if (!session) return <AuthForm emailRedirectTo={emailRedirectTo} />;
  return <>{children(session)}</>;
}

function AuthForm({ emailRedirectTo }: { emailRedirectTo?: () => string }) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function clearMessages() {
    setError(null);
    setNotice(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Preencha seu e-mail e sua senha para continuar.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError("Sua senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setBusy(true);
    clearMessages();
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: emailRedirectTo?.() ?? window.location.origin,
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice("Conta criada. Confira seu e-mail para confirmar o endereço antes de entrar.");
        }
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message.toLowerCase() : "";
      if (message.includes("invalid login credentials")) {
        setError("E-mail ou senha incorretos. Confira os dados e tente novamente.");
      } else if (message.includes("already registered") || message.includes("user already exists")) {
        setError("Este e-mail já tem uma conta. Entre nela.");
      } else if (message.includes("email not confirmed")) {
        setError("Confirme seu e-mail antes de entrar.");
      } else if (message.includes("password should be at least")) {
        setError("A senha escolhida é muito curta.");
      } else if (message.includes("network") || message.includes("fetch")) {
        setError("Não foi possível conectar. Verifique sua internet e tente novamente.");
      } else {
        setError("Não foi possível concluir o acesso agora. Tente novamente.");
      }
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    clearMessages();
  }

  return (
    <main className="auth-v2">
      <aside className="auth-v2-story" aria-label="Sobre o Morados">
        <div className="auth-v2-story-brand">
          <span className="auth-v2-story-mark"><MoradosMark size={34} /></span>
          <span>Morados</span>
        </div>
        <div className="auth-v2-story-copy">
          <span className="auth-v2-eyebrow"><Sparkles size={14} /> UM LUGAR FEITO A DOIS</span>
          <h2>As pequenas coisas de vocês merecem um lugar especial.</h2>
          <p>Conversas, planos, lembranças e descobertas. Tudo reunido em um espaço particular para compartilhar a vida.</p>
        </div>
        <div className="auth-v2-story-art" aria-hidden="true">
          <div className="auth-v2-art-ring auth-v2-art-ring-one" />
          <div className="auth-v2-art-ring auth-v2-art-ring-two" />
          <div className="auth-v2-art-window">
            <div className="auth-v2-art-sun" />
            <div className="auth-v2-art-hill auth-v2-art-hill-one" />
            <div className="auth-v2-art-hill auth-v2-art-hill-two" />
            <span>♡</span>
          </div>
          <div className="auth-v2-art-note">um espaço só de vocês</div>
        </div>
        <div className="auth-v2-story-footer">
          <span><ShieldCheck size={15} /> PRIVADO POR NATUREZA</span>
          <span>CONVERSAR · CUIDAR · LEMBRAR</span>
        </div>
      </aside>

      <section className="auth-v2-card" aria-labelledby="auth-v2-title">
        <div className="auth-v2-card-top">
          <div className="auth-v2-mobile-brand">
            <span className="auth-v2-mobile-mark"><MoradosMark size={27} /></span>
            <span>Morados</span>
          </div>
          <span className="auth-v2-private"><ShieldCheck size={14} /> ESPAÇO PRIVADO</span>
        </div>

        <div className="auth-v2-heading">
          <span className="auth-v2-step">{mode === "signin" ? "BOM TER VOCÊ AQUI" : "VAMOS COMEÇAR"}</span>
          <h1 id="auth-v2-title">{mode === "signin" ? "Entre no seu espaço." : "Criem o espaço de vocês."}</h1>
          <p>{mode === "signin" ? "Use sua conta para continuar de onde vocês pararam." : "Cadastre seu e-mail e escolha uma senha para abrir o espaço."}</p>
        </div>

        <form className="auth-v2-form" onSubmit={submit}>
          <div className="auth-v2-field">
            <label className="auth-v2-label" htmlFor="auth-v2-email"><Mail size={14} /> SEU E-MAIL</label>
            <div className="auth-v2-input-wrap">
              <input
                id="auth-v2-email"
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                maxLength={254}
                placeholder="voce@exemplo.com"
              />
            </div>
          </div>

          <div className="auth-v2-field">
            <label className="auth-v2-label" htmlFor="auth-v2-password"><KeyRound size={14} /> SENHA</label>
            <div className="auth-v2-input-wrap">
              <input
                id="auth-v2-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={mode === "signup" ? 8 : undefined}
                maxLength={128}
                placeholder="Sua senha"
              />
              <button
                type="button"
                className="auth-v2-clear"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {mode === "signup" && <small className="auth-v2-hint">Use pelo menos 8 caracteres.</small>}
          </div>

          {error && <p className="auth-v2-feedback is-error" role="alert">{error}</p>}
          {notice && <p className="auth-v2-feedback is-notice" role="status">{notice}</p>}

          <button type="submit" className="auth-v2-submit" disabled={busy}>
            <span>{busy ? "Conectando…" : mode === "signin" ? "Entrar no Morados" : "Criar meu acesso"}</span>
            {busy ? <span className="auth-v2-spinner" /> : <ArrowUpRight size={19} />}
          </button>
        </form>

        <div className="auth-v2-switch">
          <span>{mode === "signin" ? "Primeira vez por aqui?" : "Já tem uma conta?"}</span>
          <button type="button" onClick={() => changeMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Criar conta" : "Entrar"}
            <ArrowRight size={14} />
          </button>
        </div>

        <Link to="/download" className="auth-v2-download">
          <Download size={15} />
          <span>Instalar o aplicativo</span>
          <ArrowUpRight size={14} />
        </Link>
      </section>
    </main>
  );
}

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Could not sign out", error);
      setBusy(false);
    }
  }
  return (
    <button type="button" onClick={signOut} disabled={busy} aria-label="Sair da conta" title="Sair" className={compact ? "signout-button signout-compact" : "signout-button"}>
      <LogOut aria-hidden="true" />
      {!compact && <span>{busy ? "Saindo…" : "Sair"}</span>}
    </button>
  );
}
