import { useMemo, useState, type ChangeEvent } from "react";
import {
  Bell,
  Check,
  File,
  Image as ImageIcon,
  Images,
  LoaderCircle,
  Music2,
  Palette,
  Search,
  SlidersHorizontal,
  Volume2,
  Vibrate,
  Video,
} from "lucide-react";
import type { CoupleMessage } from "@/lib/couple-messages";
import {
  type ConversationAppearance,
  type ConversationNotificationPreferences,
} from "@/lib/couple-conversation-settings";
import { MAX_COUPLE_MEDIA_BYTES, uploadCoupleMedia } from "@/lib/couple-media";
import { SecondaryPageChrome, type SecondaryPageSection } from "@/components/SecondaryPageChrome";

type SettingsTab = "general" | "appearance" | "media" | "notifications";
type MediaFilter = "all" | "image" | "video" | "audio" | "file";

type Props = {
  userId: string;
  coupleId: string;
  messages: CoupleMessage[];
  mediaUrls: Record<string, string>;
  appearance: ConversationAppearance;
  notifications: ConversationNotificationPreferences;
  backgroundImageUrl: string | null;
  backgroundImageError: string | null;
  savingAppearance: boolean;
  savingNotifications: boolean;
  appearanceSyncAvailable: boolean;
  notificationsSyncAvailable: boolean;
  hasOlderMessages: boolean;
  loadingOlderMessages: boolean;
  onBack: () => void;
  onAppearanceChange: (next: ConversationAppearance) => void;
  onNotificationsChange: (next: ConversationNotificationPreferences) => void;
  onLoadMore: () => void;
  onSearchMessages: () => void;
  onNavigate: (section: SecondaryPageSection) => void;
};

const tabs: { id: SettingsTab; label: string; description: string; Icon: typeof Palette }[] = [
  { id: "general", label: "Geral", description: "Resumo e ajustes principais", Icon: SlidersHorizontal },
  { id: "appearance", label: "Personalização", description: "Tema e aparência das mensagens", Icon: Palette },
  { id: "media", label: "Mídias", description: "Fotos, vídeos, áudios e arquivos", Icon: Images },
  { id: "notifications", label: "Notificações", description: "Preferências desta conta", Icon: Bell },
];

const wallpaperOptions: { id: ConversationAppearance["wallpaper"]; title: string; detail: string }[] = [
  { id: "paper", title: "Papel delicado", detail: "Creme suave" },
  { id: "petals", title: "Pétalas", detail: "Flores discretas" },
  { id: "confetti", title: "Confetes", detail: "Formas coloridas" },
  { id: "night", title: "Noite", detail: "Escuro e estrelado" },
];

function formatMediaDate(value: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return "";
  }
}

export function CoupleConversationSettings({
  userId,
  coupleId,
  messages,
  mediaUrls,
  appearance,
  notifications,
  backgroundImageUrl,
  backgroundImageError,
  savingAppearance,
  savingNotifications,
  appearanceSyncAvailable,
  notificationsSyncAvailable,
  hasOlderMessages,
  loadingOlderMessages,
  onBack,
  onAppearanceChange,
  onNotificationsChange,
  onLoadMore,
  onSearchMessages,
  onNavigate,
}: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const [uploadingBackground, setUploadingBackground] = useState(false);

  const media = useMemo(
    () => messages.filter((message) => Boolean(message.attachment_path)),
    [messages],
  );
  const visibleMedia = media.filter((message) => mediaFilter === "all" || message.message_type === mediaFilter);

  async function handleBackgroundFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setBackgroundError("Escolha uma imagem para o papel de parede.");
      return;
    }
    if (file.size > MAX_COUPLE_MEDIA_BYTES) {
      setBackgroundError("A imagem ultrapassa o limite de 35 MB.");
      return;
    }
    setUploadingBackground(true);
    setBackgroundError(null);
    try {
      const result = await uploadCoupleMedia({ coupleId, userId, scope: "chat", file });
      if (result.error || !result.path) throw result.error ?? new Error("upload_failed");
      onAppearanceChange({ ...appearance, wallpaper: "photo", backgroundImagePath: result.path });
    } catch (error) {
      setBackgroundError(error instanceof Error ? error.message : "Não foi possível salvar a foto.");
    } finally {
      setUploadingBackground(false);
    }
  }

  const toggleNotification = (key: keyof ConversationNotificationPreferences) => {
    onNotificationsChange({ ...notifications, [key]: !notifications[key] });
  };

  return (
    <SecondaryPageChrome
      title="Configurações da conversa"
      onBack={onBack}
      backLabel="Voltar à conversa"
      rightAction={(
        <button type="button" className="topbar-icon-button" onClick={onBack} aria-label="Concluir configurações" title="Concluir">
          <Check aria-hidden="true" />
        </button>
      )}
      activeSection="home"
      onNavigate={onNavigate}
      scrollKey="conversation-settings"
      contentClassName="conversation-settings-page"
      scrollableContent
      brandCenter
    >
      <section className="conversation-settings-body" aria-label="Configurações da conversa">
        <div className="conversation-settings-page-heading">
          <div>
            <span>ESPAÇO DO CASAL</span>
            <h1>Configurações da conversa</h1>
          </div>
          <div className="conversation-settings-save-state" role="status">
            {(savingAppearance || savingNotifications) ? <LoaderCircle aria-hidden="true" /> : <Check aria-hidden="true" />}
            {(savingAppearance || savingNotifications) ? "Salvando" : appearanceSyncAvailable && notificationsSyncAvailable ? "Sincronizado" : "Salvo neste aparelho"}
          </div>
        </div>
        <div className="conversation-settings-layout">
        <nav className="conversation-settings-tabs" aria-label="Seções das configurações">
          {tabs.map(({ id, label, Icon }) => (
            <button
              type="button"
              key={id}
              className={activeTab === id ? "is-active" : ""}
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="conversation-settings-content">
          {activeTab === "general" && (
            <div className="conversation-settings-section">
              <div className="conversation-settings-intro">
                <span>CONTROLE DA CONVERSA</span>
                <h2>Um espaço com a cara de vocês.</h2>
                <p>Organize a aparência, encontre tudo o que já compartilharam e ajuste as preferências desta conversa.</p>
              </div>
              <div className="conversation-settings-overview-grid">
                <button type="button" onClick={() => setActiveTab("appearance")}>
                  <span className="conversation-settings-overview-icon"><Palette aria-hidden="true" /></span>
                  <strong>Personalização</strong>
                  <small>Tema, cores, fonte e formato dos balões</small>
                </button>
                <button type="button" onClick={() => setActiveTab("media")}>
                  <span className="conversation-settings-overview-icon"><Images aria-hidden="true" /></span>
                  <strong>Mídias compartilhadas</strong>
                  <small>{media.length} arquivo(s) nas mensagens carregadas</small>
                </button>
                <button type="button" onClick={() => setActiveTab("notifications")}>
                  <span className="conversation-settings-overview-icon"><Bell aria-hidden="true" /></span>
                  <strong>Notificações</strong>
                  <small>{notifications.enabled ? "Alertas habilitados" : "Alertas silenciados"}</small>
                </button>
              </div>
              <div className="conversation-settings-card">
                <h3>Ações rápidas</h3>
                <button type="button" className="conversation-settings-search" onClick={onSearchMessages}><Search aria-hidden="true" /> Pesquisar mensagens</button>
                <button type="button" className="conversation-settings-search" onClick={() => setActiveTab("media")}><Images aria-hidden="true" /> Ver mídias compartilhadas</button>
              </div>
              <div className="conversation-settings-info-card">
                <strong>Privacidade</strong>
                <p>Esta conversa continua privada entre as duas pessoas vinculadas ao casal. As personalizações de aparência são compartilhadas quando a sincronização da conta está disponível.</p>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="conversation-settings-section">
              <div className="conversation-settings-intro">
                <span>PERSONALIZAÇÃO</span>
                <h2>Escolha o clima da conversa.</h2>
                <p>O tema e o estilo dos balões podem ser ajustados sem alterar o conteúdo das mensagens.</p>
              </div>

              <div className="conversation-settings-card">
                <h3>Tema de fundo</h3>
                <div className="conversation-settings-wallpapers">
                  {wallpaperOptions.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={"conversation-settings-wallpaper wallpaper-" + option.id + (appearance.wallpaper === option.id ? " is-selected" : "")}
                      onClick={() => onAppearanceChange({ ...appearance, wallpaper: option.id, backgroundImagePath: null })}
                      aria-pressed={appearance.wallpaper === option.id}
                    >
                      <span className="conversation-settings-wallpaper-preview" />
                      <strong>{option.title}</strong>
                      <small>{option.detail}</small>
                      {appearance.wallpaper === option.id && <Check aria-hidden="true" />}
                    </button>
                  ))}
                </div>
                <div className="conversation-settings-photo-row">
                  <div>
                    <strong>Usar uma foto como fundo</strong>
                    <small>{appearance.backgroundImagePath ? "Imagem personalizada selecionada" : "Envie uma imagem da galeria"}</small>
                  </div>
                  <label className="conversation-settings-upload">
                    {uploadingBackground ? <LoaderCircle aria-hidden="true" /> : <ImageIcon aria-hidden="true" />}
                    {uploadingBackground ? "Enviando…" : "Escolher foto"}
                    <input type="file" accept="image/*" onChange={(event) => void handleBackgroundFile(event)} disabled={uploadingBackground} />
                  </label>
                  {appearance.backgroundImagePath && (
                    <button type="button" className="conversation-settings-text-action" onClick={() => onAppearanceChange({ ...appearance, wallpaper: "paper", backgroundImagePath: null })}>
                      Remover foto
                    </button>
                  )}
                </div>
                {backgroundError && <p className="conversation-settings-error" role="alert">{backgroundError}</p>}
                {backgroundImageError && <p className="conversation-settings-error" role="alert">{backgroundImageError}</p>}
                {appearance.wallpaper === "photo" && (
                  <div className="conversation-settings-photo-adjustments">
                    <label className="conversation-settings-range">
                      <span><strong>Brilho da foto</strong><output>{appearance.backgroundBrightness}%</output></span>
                      <input
                        type="range"
                        min={40}
                        max={160}
                        step={5}
                        value={appearance.backgroundBrightness}
                        onChange={(event) => onAppearanceChange({ ...appearance, backgroundBrightness: Number(event.target.value) })}
                      />
                    </label>
                    <label className="conversation-settings-range">
                      <span><strong>Opacidade da foto</strong><output>{appearance.backgroundOpacity}%</output></span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={appearance.backgroundOpacity}
                        onChange={(event) => onAppearanceChange({ ...appearance, backgroundOpacity: Number(event.target.value) })}
                      />
                    </label>
                  </div>
                )}
                {backgroundImageUrl && appearance.wallpaper === "photo" && (
                  <div className="conversation-settings-background-thumb">
                    <img src={backgroundImageUrl} alt="Prévia do fundo personalizado" />
                  </div>
                )}
              </div>

              <div className="conversation-settings-card">
                <h3>Cartões de mensagem</h3>
                <div className="conversation-settings-colors">
                  <label>
                    <span>Sua mensagem</span>
                    <input type="color" value={appearance.ownBubbleColor} onChange={(event) => onAppearanceChange({ ...appearance, ownBubbleColor: event.target.value })} />
                  </label>
                  <label>
                    <span>Mensagem recebida</span>
                    <input type="color" value={appearance.otherBubbleColor} onChange={(event) => onAppearanceChange({ ...appearance, otherBubbleColor: event.target.value })} />
                  </label>
                  <label>
                    <span>Cor do texto</span>
                    <input type="color" value={appearance.messageTextColor} onChange={(event) => onAppearanceChange({ ...appearance, messageTextColor: event.target.value })} />
                  </label>
                </div>
                <label className="conversation-settings-range">
                  <span><strong>Arredondamento dos cartões</strong><output>{appearance.bubbleRadius}px</output></span>
                  <input
                    type="range"
                    min={10}
                    max={30}
                    step={1}
                    value={appearance.bubbleRadius}
                    onChange={(event) => onAppearanceChange({ ...appearance, bubbleRadius: Number(event.target.value) })}
                  />
                </label>
                <label className="conversation-settings-select">
                  <span>Fonte das mensagens</span>
                  <select
                    value={appearance.messageFont}
                    onChange={(event) => onAppearanceChange({ ...appearance, messageFont: event.target.value as ConversationAppearance["messageFont"] })}
                  >
                    <option value="system">Moderna</option>
                    <option value="serif">Editorial</option>
                    <option value="rounded">Arredondada</option>
                  </select>
                </label>
                <div className="conversation-settings-preview">
                  <span>PRÉVIA</span>
                  <div className="conversation-settings-preview-bubble is-other" style={{ backgroundColor: appearance.otherBubbleColor, color: appearance.messageTextColor, borderRadius: appearance.bubbleRadius, fontFamily: appearance.messageFont === "serif" ? "Georgia, serif" : appearance.messageFont === "rounded" ? "Trebuchet MS, sans-serif" : "system-ui, sans-serif" }}>
                    Oi! Como foi seu dia?
                  </div>
                  <div className="conversation-settings-preview-bubble is-own" style={{ backgroundColor: appearance.ownBubbleColor, color: appearance.messageTextColor, borderRadius: appearance.bubbleRadius, fontFamily: appearance.messageFont === "serif" ? "Georgia, serif" : appearance.messageFont === "rounded" ? "Trebuchet MS, sans-serif" : "system-ui, sans-serif" }}>
                    Foi melhor agora. ❤️
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "media" && (
            <div className="conversation-settings-section">
              <div className="conversation-settings-intro">
                <span>ARQUIVOS COMPARTILHADOS</span>
                <h2>Memórias desta conversa.</h2>
                <p>Veja as mídias anexadas às mensagens. A lista acompanha as mensagens já carregadas no histórico.</p>
              </div>
              <div className="conversation-settings-media-filters">
                {([
                  ["all", "Tudo"],
                  ["image", "Fotos"],
                  ["video", "Vídeos"],
                  ["audio", "Áudios"],
                  ["file", "Arquivos"],
                ] as [MediaFilter, string][]).map(([id, label]) => (
                  <button type="button" key={id} className={mediaFilter === id ? "is-active" : ""} onClick={() => setMediaFilter(id)}>{label}</button>
                ))}
              </div>
              {visibleMedia.length === 0 ? (
                <div className="conversation-settings-empty-media">
                  <Images aria-hidden="true" />
                  <strong>Nenhuma mídia nesta categoria</strong>
                  <span>Quando vocês compartilharem arquivos, eles aparecerão aqui.</span>
                </div>
              ) : (
                <div className="conversation-settings-media-grid">
                  {visibleMedia.map((message) => {
                    const url = mediaUrls[message.id];
                    return (
                      <article key={message.id} className="conversation-settings-media-item">
                        {message.message_type === "image" ? (
                          url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={message.attachment_name || "Foto compartilhada"} loading="lazy" /></a> : <span className="conversation-settings-media-placeholder"><ImageIcon aria-hidden="true" /></span>
                        ) : message.message_type === "video" ? (
                          url ? <video src={url} controls playsInline preload="metadata" /> : <span className="conversation-settings-media-placeholder"><Video aria-hidden="true" /></span>
                        ) : message.message_type === "audio" ? (
                          <div className="conversation-settings-audio-item"><Music2 aria-hidden="true" />{url ? <audio src={url} controls preload="metadata" /> : <span>Carregando áudio…</span>}</div>
                        ) : (
                          <a className="conversation-settings-file-item" href={url || undefined} target="_blank" rel="noreferrer" download={message.attachment_name || undefined}>
                            <File aria-hidden="true" />
                            <span>{message.attachment_name || "Arquivo"}</span>
                          </a>
                        )}
                        <footer><strong>{message.attachment_name || (message.message_type === "image" ? "Foto" : message.message_type === "video" ? "Vídeo" : message.message_type === "audio" ? "Áudio" : "Arquivo")}</strong><small>{formatMediaDate(message.created_at)}</small></footer>
                      </article>
                    );
                  })}
                </div>
              )}
              {hasOlderMessages && (
                <button type="button" className="conversation-settings-load-more" onClick={onLoadMore} disabled={loadingOlderMessages}>
                  {loadingOlderMessages ? <LoaderCircle aria-hidden="true" /> : null}
                  {loadingOlderMessages ? "Carregando…" : "Carregar mídias anteriores"}
                </button>
              )}
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="conversation-settings-section">
              <div className="conversation-settings-intro">
                <span>AVISOS</span>
                <h2>Escolha como prefere ser avisado.</h2>
                <p>Estas preferências ficam vinculadas à sua conta e podem ser alteradas a qualquer momento.</p>
              </div>
              <div className="conversation-settings-card conversation-settings-notifications">
                <label>
                  <span className="conversation-settings-setting-icon"><Bell aria-hidden="true" /></span>
                  <span><strong>Notificações da conversa</strong><small>Preferência geral para mensagens novas</small></span>
                  <input type="checkbox" checked={notifications.enabled} onChange={() => toggleNotification("enabled")} />
                </label>
                <label>
                  <span className="conversation-settings-setting-icon"><Volume2 aria-hidden="true" /></span>
                  <span><strong>Som</strong><small>Permitir avisos sonoros quando disponíveis</small></span>
                  <input type="checkbox" checked={notifications.sound} onChange={() => toggleNotification("sound")} disabled={!notifications.enabled} />
                </label>
                <label>
                  <span className="conversation-settings-setting-icon"><Vibrate aria-hidden="true" /></span>
                  <span><strong>Vibração</strong><small>Permitir retorno tátil quando disponível</small></span>
                  <input type="checkbox" checked={notifications.vibration} onChange={() => toggleNotification("vibration")} disabled={!notifications.enabled} />
                </label>
                <label>
                  <span className="conversation-settings-setting-icon"><Images aria-hidden="true" /></span>
                  <span><strong>Prévia da mensagem</strong><small>Mostrar o conteúdo nos avisos compatíveis</small></span>
                  <input type="checkbox" checked={notifications.previews} onChange={() => toggleNotification("previews")} disabled={!notifications.enabled} />
                </label>
              </div>
              <p className="conversation-settings-note">As preferências ficam salvas. A entrega de notificações push em segundo plano depende da configuração do serviço de notificações do aplicativo.</p>
            </div>
          )}
        </div>
        </div>
      </section>
    </SecondaryPageChrome>
  );
}
