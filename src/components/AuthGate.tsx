import { useEffect, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MoradosMark } from "@/components/MoradosMark";
import { supabase } from "@/integrations/supabase/client";
import { applyAuthKey, normalizeAuthEmail } from "@/lib/auth-keyboard";

type AuthGateProps = {
  children: (session: Session) => ReactNode;
  emailRedirectTo?: () => string;
};
type AuthMode = "signin" | "signup";
type AuthField = "email" | "password";
type KeyboardPage = "letters" | "symbols";
type KeyAction = "backspace" | "shift" | "symbols" | "letters" | "space" | "done";
type VirtualKey = {
  label: string;
  value?: string;
  action?: KeyAction;
  tone?: "special" | "accent";
};

function characters(values: string, uppercase = false): VirtualKey[] {
  return [...values].map((value) => ({
    label: uppercase ? value.toUpperCase() : value,
    value: uppercase ? value.toUpperCase() : value,
  }));
}
const actionKey = (label: string, action: KeyAction, tone: VirtualKey["tone"] = "special"): VirtualKey => ({
  label,
  action,
  tone,
});

function getKeyboardRows(field: AuthField, page: KeyboardPage, uppercase: boolean): VirtualKey[][] {
  if (field === "email") {
    if (page === "symbols") {
      return [
        characters("1234567890"),
        characters("@#$%&*-+"),
        characters("_.-=!?"),
        [
          actionKey("ABC", "letters"),
          ...characters("()[]{}"),
          actionKey("⌫", "backspace"),
          actionKey("Pronto", "done", "accent"),
        ],
      ];
    }
    return [
      characters("qwertyuiop"),
      characters("asdfghjkl"),
      [actionKey("?123", "symbols"), ...characters("zxcvbnm"), actionKey("⌫", "backspace")],
      [...characters("@._-+"), actionKey("Pronto", "done", "accent")],
    ];
  }

  if (page === "symbols") {
    return [
      characters("1234567890"),
      characters("@#$%&*-+"),
      characters("=()/[]"),
      characters("{}!?.,:;"),
      [
        actionKey("ABC", "letters"),
        actionKey("Espaço", "space"),
        actionKey("⌫", "backspace"),
        actionKey("Pronto", "done", "accent"),
      ],
    ];
  }

  return [
    characters("1234567890"),
    characters("qwertyuiop", uppercase),
    characters("asdfghjkl", uppercase),
    [actionKey("⇧", "shift"), ...characters("zxcvbnm", uppercase), actionKey("⌫", "backspace")],
    [
      actionKey("?123", "symbols"),
      characters("@.")[0],
      actionKey("Espaço", "space"),
      characters("@.")[1],
      actionKey("Pronto", "done", "accent"),
    ],
  ];
}

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
  const [activeField, setActiveField] = useState<AuthField | null>(null);
  const [keyboardPage, setKeyboardPage] = useState<KeyboardPage>("letters");
  const [uppercase, setUppercase] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function clearMessages() {
    setError(null);
    setNotice(null);
  }
  function openKeyboard(field: AuthField) {
    setActiveField(field);
    setKeyboardPage("letters");
    setUppercase(false);
    clearMessages();
  }
  function addCharacter(value: string) {
    if (!activeField) return;
    if (activeField === "email") setEmail((current) => applyAuthKey(current, value.toLowerCase(), 254));
    else {
      setPassword((current) => applyAuthKey(current, value, 128));
      setUppercase(false);
    }
    clearMessages();
  }
  function handleVirtualKey(key: VirtualKey) {
    switch (key.action) {
      case "done":
        setActiveField(null);
        setKeyboardPage("letters");
        setUppercase(false);
        return;
      case "symbols":
        setKeyboardPage("symbols");
        return;
      case "letters":
        setKeyboardPage("letters");
        return;
      case "shift":
        setUppercase((current) => !current);
        return;
      case "space":
        addCharacter(" ");
        return;
      case "backspace":
        if (activeField === "email") setEmail((current) => applyAuthKey(current, "BACKSPACE", 254));
        if (activeField === "password") setPassword((current) => applyAuthKey(current, "BACKSPACE", 128));
        clearMessages();
        return;
      default:
        if (key.value) addCharacter(key.value);
    }
  }
  function handlePhysicalKeyboard(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      handleVirtualKey(actionKey("⌫", "backspace"));
    } else if (event.key === "Enter") {
      event.preventDefault();
      setActiveField(null);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      addCharacter(event.key);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const normalizedEmail = normalizeAuthEmail(email);
    if (!normalizedEmail || !password) {
      setError("Preencha seu e-mail e sua senha para continuar.");
      setActiveField(!normalizedEmail ? "email" : "password");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError("Sua senha precisa ter pelo menos 8 caracteres.");
      setActiveField("password");
      setKeyboardPage("letters");
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
          options: { emailRedirectTo: emailRedirectTo?.() ?? window.location.origin },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setActiveField(null);
          setNotice("Conta criada. Confira seu e-mail para confirmar o endereço antes de entrar.");
        }
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message.toLowerCase() : "";
      if (message.includes("invalid login credentials")) setError("E-mail ou senha incorretos. Confira os dados e tente novamente.");
      else if (message.includes("already registered") || message.includes("user already exists")) setError("Este e-mail já tem uma conta. Entre nela.");
      else if (message.includes("email not confirmed")) setError("Confirme seu e-mail antes de entrar.");
      else if (message.includes("password should be at least")) setError("A senha escolhida é muito curta.");
      else if (message.includes("network") || message.includes("fetch")) setError("Não foi possível conectar. Verifique sua internet e tente novamente.");
      else setError("Não foi possível concluir o acesso agora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setActiveField(null);
    setKeyboardPage("letters");
    setUppercase(false);
    clearMessages();
  }

  const keyboardRows = activeField ? getKeyboardRows(activeField, keyboardPage, uppercase) : [];

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
          <label className="auth-v2-field">
            <span className="auth-v2-label"><Mail size={14} /> SEU E-MAIL</span>
            <div className={`auth-v2-input-wrap ${activeField === "email" ? "is-active" : ""}`}>
              <input
                type="text"
                name="email"
                value={email}
                readOnly
                inputMode="none"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
                placeholder="toque para digitar seu e-mail"
                aria-label="E-mail"
                onClick={() => openKeyboard("email")}
                onFocus={() => setActiveField("email")}
                onKeyDown={handlePhysicalKeyboard}
              />
              {email && (
                <button type="button" className="auth-v2-clear" aria-label="Apagar e-mail" onClick={() => { setEmail(""); openKeyboard("email"); }}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </label>

          <label className="auth-v2-field">
            <span className="auth-v2-label"><KeyRound size={14} /> SENHA</span>
            <div className={`auth-v2-input-wrap ${activeField === "password" ? "is-active" : ""}`}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                readOnly
                inputMode="none"
                autoComplete="off"
                maxLength={128}
                placeholder="toque para digitar sua senha"
                aria-label="Senha"
                onClick={() => openKeyboard("password")}
                onFocus={() => setActiveField("password")}
                onKeyDown={handlePhysicalKeyboard}
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
          </label>

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

        {activeField && (
          <section className="auth-v2-keyboard" aria-label={`Teclado do Morados para ${activeField === "email" ? "e-mail" : "senha"}`}>
            <div className="auth-v2-keyboard-heading">
              <span>{activeField === "email" ? "DIGITANDO E-MAIL" : "DIGITANDO SENHA"}</span>
              <button type="button" onClick={() => setActiveField(null)}><Check size={14} /> Concluir</button>
            </div>
            <div className="auth-v2-keyboard-rows">
              {keyboardRows.map((row, rowIndex) => (
                <div className="auth-v2-keyboard-row" key={`${activeField}-${keyboardPage}-${rowIndex}`}>
                  {row.map((key, keyIndex) => (
                    <button
                      type="button"
                      key={`${key.label}-${keyIndex}`}
                      className={[
                        "auth-v2-key",
                        key.tone === "special" ? "is-special" : "",
                        key.tone === "accent" ? "is-accent" : "",
                        key.action === "space" ? "is-space" : "",
                      ].filter(Boolean).join(" ")}
                      aria-label={key.action === "backspace" ? "Apagar último caractere" : key.action === "space" ? "Espaço" : key.label}
                      onClick={() => handleVirtualKey(key)}
                      disabled={busy}
                    >
                      {key.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <p className="auth-v2-keyboard-footnote">O teclado é do próprio Morados. O teclado do aparelho permanece fechado.</p>
          </section>
        )}

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
