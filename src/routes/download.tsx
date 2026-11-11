import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Apple,
  ArrowDownToLine,
  ArrowLeft,
  Check,
  Chrome,
  ExternalLink,
  Heart,
  Smartphone,
  Share,
  Wifi,
} from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Instalar Morados" },
      { name: "description", content: "Instale o Morados no Android, iPhone ou iPad." },
      { name: "theme-color", content: "#0F4C5C" },
    ],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installDone, setInstallDone] = useState(false);

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  async function installPwa() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallDone(choice.outcome === "accepted");
    setInstallPrompt(null);
  }

  return (
    <main className="download-page">
      <header className="download-topbar">
        <Link to="/" className="download-brand" aria-label="Morados — voltar ao início">
          <span className="download-brand-mark"><Heart aria-hidden="true" fill="currentColor" /></span>
          <span>Morados</span>
        </Link>
        <Link to="/" className="download-back"><ArrowLeft aria-hidden="true" /> Voltar ao site</Link>
      </header>

      <section className="download-hero">
        <div className="download-hero-copy">
          <span className="download-kicker">MORADOS NO SEU DIA A DIA</span>
          <h1>Leve o mundo de vocês <em>no bolso.</em></h1>
          <p>
            Instale o Morados no celular para abrir suas conversas, memórias,
            planos e a Casa como se fosse um aplicativo.
          </p>
          <div className="download-hero-note">
            <Wifi aria-hidden="true" />
            <span>É necessária conexão com a internet para sincronizar os dados do casal.</span>
          </div>
        </div>
        <div className="download-hero-art" aria-hidden="true">
          <div className="download-orbit download-orbit-one" />
          <div className="download-orbit download-orbit-two" />
          <div className="download-phone">
            <div className="download-phone-speaker" />
            <div className="download-phone-screen">
              <span className="download-mini-mark"><Heart fill="currentColor" /></span>
              <strong>Morados</strong>
              <span>Um espaço de vocês.</span>
              <div className="download-mini-arch">
                <div className="download-mini-heart">♡</div>
              </div>
              <i />
              <i />
            </div>
          </div>
          <span className="download-art-star">✦</span>
          <span className="download-art-dot" />
        </div>
      </section>

      <section className="download-platforms" aria-label="Escolha sua plataforma">
        <article className="download-platform-card download-android-card">
          <div className="download-platform-heading">
            <span className="download-platform-icon"><Smartphone aria-hidden="true" /></span>
            <span className="download-platform-label">ANDROID</span>
          </div>
          <h2>Instalar no Android</h2>
          <p className="download-platform-copy">
            Baixe o APK e instale diretamente no seu aparelho. O aplicativo abre
            o Morados publicado e mantém os dados sincronizados pela internet.
          </p>
          <a
            className="download-primary-button"
            href="https://github.com/cainalo/namoro-com-ia/releases/latest/download/Morados-Android.apk"
          >
            <ArrowDownToLine aria-hidden="true" />
            Baixar APK para Android
          </a>
          {installPrompt && (
            <button type="button" className="download-secondary-button" onClick={() => void installPwa()}>
              <Chrome aria-hidden="true" /> Instalar pelo navegador
            </button>
          )}
          {installDone && (
            <span className="download-install-success"><Check aria-hidden="true" /> Instalação iniciada.</span>
          )}
          <ol className="download-steps">
            <li><span>1</span> Baixe o arquivo <strong>Morados-Android.apk</strong>.</li>
            <li><span>2</span> Abra o arquivo e permita a instalação solicitada pelo Android.</li>
            <li><span>3</span> Conclua a instalação e abra o Morados.</li>
          </ol>
          <p className="download-small-note">
            Esta edição instala separadamente da versão antiga para evitar o conflito de assinatura.
            Não é necessário desinstalar o Morados anterior. Entre com a mesma conta para acessar
            os dados sincronizados.
          </p>
        </article>

        <article className="download-platform-card download-ios-card">
          <div className="download-platform-heading">
            <span className="download-platform-icon"><Apple aria-hidden="true" /></span>
            <span className="download-platform-label">IPHONE E IPAD</span>
          </div>
          <h2>Adicionar à Tela de Início</h2>
          <p className="download-platform-copy">
            No iPhone, o Morados pode ser instalado como aplicativo web pelo Safari.
            Ele ganha ícone próprio e abre em uma janela independente.
          </p>
          <a className="download-secondary-button download-safari-button" href="https://morados.netlify.app/">
            <ExternalLink aria-hidden="true" /> Abrir Morados no Safari
          </a>
          <ol className="download-steps">
            <li><span>1</span> Abra este site no <strong>Safari</strong> do iPhone ou iPad.</li>
            <li><span>2</span> Toque em <strong>Compartilhar</strong> <Share aria-hidden="true" className="download-inline-icon" />.</li>
            <li><span>3</span> Escolha <strong>Adicionar à Tela de Início</strong>.</li>
            <li><span>4</span> Confirme em <strong>Adicionar</strong>.</li>
          </ol>
          <p className="download-small-note">
            Esta instalação é uma PWA, não um arquivo IPA da App Store.
          </p>
        </article>
      </section>

      <section className="download-footnote">
        <span className="download-footnote-icon"><Heart aria-hidden="true" /></span>
        <div>
          <strong>Uma só conta em todos os aparelhos.</strong>
          <p>Entre com a mesma conta do Morados. Conversas, memórias e planos continuam sincronizados.</p>
        </div>
      </section>

      <footer className="download-footer">
        <span>Morados · Um espaço privado para duas pessoas.</span>
        <Link to="/">Voltar ao Morados</Link>
      </footer>
    </main>
  );
}
