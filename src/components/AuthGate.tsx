import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowRight, LogOut } from "lucide-react";
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setChecking(false);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error("Could not restore Supabase session", error);
      setSession(data.session);
      setChecking(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <main className="auth-shell" aria-busy="true">
        <span className="pair-mark auth-mark" aria-hidden="true">
          <span />
          <span />
        </span>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Informe o e-mail e a senha.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

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
          setNotice("Confira seu e-mail para confirmar a conta.");
        }
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message.toLowerCase() : "";
      if (message.includes("invalid login credentials")) {
        setError("E-mail ou senha incorretos.");
      } else if (message.includes("already registered") || message.includes("user already exists")) {
        setError("Este e-mail já tem uma conta. Entre nela.");
      } else if (message.includes("email not confirmed")) {
        setError("Confirme seu e-mail antes de entrar.");
      } else if (message.includes("password should be at least")) {
        setError("A senha escolhida é muito curta.");
      } else {
        setError("Não foi possível concluir. Confira os dados e tente novamente.");
      }
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-brand">
          <span className="pair-mark auth-mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <span>Morados</span>
        </div>

        <h1 id="auth-title">{mode === "signin" ? "Entrar" : "Criar conta"}</h1>

        <form onSubmit={submit} className="auth-form">
          <label className="auth-field">
            <span>E-mail</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
            />
          </label>

          <label className="auth-field">
            <span>Senha</span>
            <input
              type="password"
              name="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Sua senha"
            />
          </label>

          {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-feedback auth-notice" role="status">{notice}</p>}

          <button type="submit" className="auth-submit" disabled={busy}>
            <span>{busy ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}</span>
            <ArrowRight aria-hidden="true" />
          </button>
        </form>

        <div className="auth-switch">
          {mode === "signin" ? (
            <>
              <span>Primeiro acesso?</span>
              <button type="button" onClick={() => changeMode("signup")}>Criar conta</button>
            </>
          ) : (
            <>
              <span>Já tem uma conta?</span>
              <button type="button" onClick={() => changeMode("signin")}>Entrar</button>
            </>
          )}
        </div>
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
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      aria-label="Sair da conta"
      title="Sair"
      className={compact ? "signout-button signout-compact" : "signout-button"}
    >
      <LogOut aria-hidden="true" />
      {!compact && <span>{busy ? "Saindo…" : "Sair"}</span>}
    </button>
  );
}
