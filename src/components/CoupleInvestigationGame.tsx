import { useEffect, useState } from "react";
import {
  Archive,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileSearch,
  Fingerprint,
  MessageSquareText,
  Search,
  ShieldAlert,
  Siren,
  Sparkles,
  XCircle,
} from "lucide-react";

type InvestigationTab = "scene" | "evidence" | "interviews" | "verdict";
type SuspectId = "helena" | "beatriz" | "davi" | "rafael";

type Evidence = {
  id: string;
  title: string;
  location: string;
  time: string;
  summary: string;
  detail: string;
  implication: string;
};

type Suspect = {
  id: SuspectId;
  name: string;
  role: string;
  motive: string;
  statement: string;
  response: string;
  appearance: string;
};

const evidence: Evidence[] = [
  {
    id: "registro",
    title: "Registro da fechadura",
    location: "Arquivo do observatório",
    time: "21h12",
    summary: "A porta foi aberta com a chave-mestra número 01.",
    detail: "O sistema registra a abertura às 21h12. A chave-mestra 01 está vinculada à curadora Helena. Não houve tentativa de arrombamento e a fechadura não apresenta danos.",
    implication: "A pessoa que entrou tinha acesso à chave-mestra — ou alguém a emprestou.",
  },
  {
    id: "camera",
    title: "Imagem do corredor leste",
    location: "Câmera 04 · corredor",
    time: "21h16",
    summary: "Uma figura sai do corredor carregando uma pasta cilíndrica.",
    detail: "A imagem está granulada, mas mostra uma pessoa usando um lenço vermelho no pescoço e carregando um tubo de plantas arquitetônicas. A figura segue em direção à sala da curadoria.",
    implication: "O objeto pode ter sido escondido em um recipiente que parecia material de trabalho.",
  },
  {
    id: "cafe",
    title: "Comprovante do café",
    location: "Café da praça",
    time: "21h04",
    summary: "O pagamento foi registrado antes do desaparecimento.",
    detail: "O comprovante está no nome de Rafael. O café fica a doze minutos a pé do museu. A atendente confirmou que ele permaneceu no local até pelo menos 21h20.",
    implication: "Rafael dificilmente poderia ter aberto o arquivo às 21h12.",
  },
  {
    id: "restauro",
    title: "Livro de uso do laboratório",
    location: "Sala de conservação",
    time: "20h55–21h20",
    summary: "O equipamento de luz ultravioleta permaneceu ligado.",
    detail: "O livro automático registra o uso contínuo da cabine de conservação durante todo o intervalo crítico. A cabine só pode ser ativada com o crachá individual da restauradora Beatriz.",
    implication: "A presença de Beatriz no laboratório é sustentada por um registro independente.",
  },
  {
    id: "radio",
    title: "Gravação do rádio da segurança",
    location: "Posto de vigilância",
    time: "21h10",
    summary: "Davi informa que está na entrada principal.",
    detail: "A gravação de rádio registra Davi respondendo a uma chamada às 21h10. O sinal e o ruído ambiente coincidem com o posto da entrada. O acesso ao arquivo exige sair do posto e atravessar dois corredores.",
    implication: "A declaração do segurança é coerente com a gravação e com a localização do posto.",
  },
  {
    id: "tubo",
    title: "Tubo de plantas vazio",
    location: "Sala da curadoria",
    time: "21h32",
    summary: "O interior do tubo tem marcas recentes de tecido azul.",
    detail: "O tubo cilíndrico está sobre a mesa da curadora. Há fibras de tecido azul presas na tampa e uma pequena quantidade de pó dourado, igual ao resíduo encontrado na moldura da Carta Celeste.",
    implication: "O recipiente visto na câmera pode ter sido usado para retirar a peça sem chamar atenção.",
  },
  {
    id: "proposta",
    title: "Rascunho de proposta privada",
    location: "Computador da curadoria",
    time: "20h58",
    summary: "Uma minuta menciona a venda de um mapa astronômico raro.",
    detail: "O rascunho, salvo na conta de Helena, oferece uma peça do século XIX a um colecionador particular após o encerramento da exposição. O arquivo foi editado às 20h58 e não cita o nome da obra, mas registra dimensões idênticas às da Carta Celeste. Uma cobrança vencida de alto valor aparece anexada ao mesmo processo.",
    implication: "A proposta liga a curadora a uma possível venda privada e apresenta um motivo financeiro.",
  },
];

const suspects: Suspect[] = [
  {
    id: "helena",
    name: "Helena Duarte",
    role: "Curadora do museu",
    motive: "Tinha acesso à chave-mestra e conhecia o valor de mercado da peça.",
    statement: "Saí do museu às 20h50. Deixei o arquivo trancado e não voltei à ala leste.",
    response: "Eu disse que fui embora às 20h50, mas voltei para buscar um documento. Usei a chave-mestra. O tubo estava na minha sala porque preparo uma exposição. Não sei como o pó foi parar nele.",
    appearance: "Lenço vermelho e casaco azul-marinho.",
  },
  {
    id: "beatriz",
    name: "Beatriz Nunes",
    role: "Restauradora",
    motive: "Foi a última profissional a avaliar o estado de conservação da carta.",
    statement: "Passei a noite na sala de conservação. Não tenho chave do arquivo.",
    response: "A peça precisava de uma avaliação, mas eu não a retirei. Meu crachá ficou na cabine porque o equipamento estava em uso. O tubo de plantas é material da curadoria, não meu.",
    appearance: "Avental cinza e luvas claras.",
  },
  {
    id: "davi",
    name: "Davi Martins",
    role: "Segurança noturno",
    motive: "Conhecia os pontos cegos das câmeras e a rotina do prédio.",
    statement: "Fiquei no posto da entrada durante o intervalo. Não tenho acesso à chave-mestra.",
    response: "A câmera do corredor falha às vezes, mas eu estava na entrada. O rádio registra minha chamada. Eu poderia abrir a porta de serviço, mas o arquivo tem uma fechadura independente.",
    appearance: "Uniforme escuro e rádio preso ao ombro.",
  },
  {
    id: "rafael",
    name: "Rafael Costa",
    role: "Jornalista cultural",
    motive: "Queria uma exclusiva sobre o desaparecimento de uma obra valiosa.",
    statement: "Estava no café da praça quando perceberam o sumiço. Não entrei no arquivo.",
    response: "Eu queria uma matéria, não a carta. Pedi um café às 21h04 e fiquei esperando uma fonte. O comprovante está aí. O tubo que aparece na imagem parece material de arquiteto.",
    appearance: "Jaqueta bege e bolsa de câmera.",
  },
];

const STORAGE_KEY = "morados-investigation-case-01";

type SavedProgress = {
  reviewedEvidence: string[];
  interviewed: SuspectId[];
  selectedSuspect: SuspectId;
  verdictSuspect: string;
  verdictMethod: string;
  verdictMotive: string;
  solved: boolean;
};

const initialProgress: SavedProgress = {
  reviewedEvidence: [],
  interviewed: [],
  selectedSuspect: "helena",
  verdictSuspect: "",
  verdictMethod: "",
  verdictMotive: "",
  solved: false,
};

function loadProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialProgress;
    const saved = JSON.parse(raw) as Partial<SavedProgress>;
    return { ...initialProgress, ...saved };
  } catch {
    return initialProgress;
  }
}

export function CoupleInvestigationGame() {
  const [tab, setTab] = useState<InvestigationTab>("scene");
  const [progress, setProgress] = useState<SavedProgress>(loadProgress);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    if (progress.solved) setShowSolution(true);
  }, [progress.solved]);

  const selectedSuspect = suspects.find((suspect) => suspect.id === progress.selectedSuspect) ?? suspects[0];
  const reviewedCount = progress.reviewedEvidence.length;
  const interviewedCount = progress.interviewed.length;
  const canAccuse = reviewedCount >= 3 && interviewedCount >= 2;
  const verdictCorrect =
    progress.verdictSuspect === "helena" &&
    progress.verdictMethod === "master-key" &&
    progress.verdictMotive === "private-sale";

  const progressPercent = Math.round(
    ((reviewedCount + interviewedCount) / (evidence.length + suspects.length)) * 100,
  );

  function update(patch: Partial<SavedProgress>) {
    setProgress((current) => ({ ...current, ...patch }));
  }

  function reviewEvidence(id: string) {
    setProgress((current) => ({
      ...current,
      reviewedEvidence: current.reviewedEvidence.includes(id)
        ? current.reviewedEvidence
        : [...current.reviewedEvidence, id],
    }));
  }

  function interviewSuspect(id: SuspectId) {
    setProgress((current) => ({
      ...current,
      selectedSuspect: id,
      interviewed: current.interviewed.includes(id)
        ? current.interviewed
        : [...current.interviewed, id],
    }));
  }

  function submitVerdict() {
    if (!canAccuse || !progress.verdictSuspect || !progress.verdictMethod || !progress.verdictMotive) return;
    update({ solved: true });
    setShowSolution(true);
  }

  function resetCase() {
    localStorage.removeItem(STORAGE_KEY);
    setProgress(initialProgress);
    setTab("scene");
    setShowHint(false);
    setShowSolution(false);
  }

  return (
    <section className="investigation-game" aria-labelledby="investigation-title">
      <div className="investigation-case-cover">
        <div className="investigation-case-cover-art">
          <div className="investigation-stamp"><Fingerprint aria-hidden="true" /></div>
          <span>ARQUIVO CONFIDENCIAL · CASO 001</span>
          <h2 id="investigation-title">A Carta Celeste</h2>
          <p>O desaparecimento no Observatório Aurora</p>
          <div className="investigation-cover-meta">
            <span><Archive aria-hidden="true" /> Museu Aurora</span>
            <span><Siren aria-hidden="true" /> Furto de patrimônio</span>
          </div>
        </div>
        <div className="investigation-case-summary">
          <p className="investigation-kicker">O caso</p>
          <p>
            Às 21h30, a equipe do Museu Aurora percebeu que a Carta Celeste — um mapa astronômico
            original do século XIX — havia desaparecido do arquivo trancado. A peça estava no local
            durante a vistoria das 20h40. Quatro pessoas permaneceram no prédio naquela noite.
          </p>
          <div className="investigation-summary-stats">
            <span><strong>{reviewedCount}/{evidence.length}</strong> pistas analisadas</span>
            <span><strong>{interviewedCount}/{suspects.length}</strong> depoimentos colhidos</span>
            <span><strong>{progressPercent}%</strong> investigação</span>
          </div>
          <div className="investigation-progress"><span style={{ width: progressPercent + "%" }} /></div>
        </div>
      </div>

      <nav className="investigation-tabs" aria-label="Seções do inquérito">
        {([
          ["scene", "Cena do crime", Search],
          ["evidence", "Pistas", FileSearch],
          ["interviews", "Interrogatórios", MessageSquareText],
          ["verdict", "Conclusão", ClipboardList],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "is-active" : ""}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => setTab(id)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
            {id === "evidence" && <small>{reviewedCount}/{evidence.length}</small>}
            {id === "interviews" && <small>{interviewedCount}/4</small>}
          </button>
        ))}
      </nav>

      {tab === "scene" && (
        <div className="investigation-scene">
          <div className="investigation-section-intro">
            <span className="investigation-kicker">21h30 · Sala do observatório</span>
            <h3>O que sabemos até agora</h3>
            <p>Leia o registro inicial e escolha por onde começar a investigação.</p>
          </div>
          <div className="investigation-scene-grid">
            <article className="investigation-scene-note">
              <span>01 · Última confirmação</span>
              <strong>20h40</strong>
              <p>A Carta Celeste foi vista dentro da vitrine durante a vistoria.</p>
            </article>
            <article className="investigation-scene-note">
              <span>02 · Janela do furto</span>
              <strong>20h50–21h30</strong>
              <p>O intervalo entre a saída declarada da curadora e a descoberta do desaparecimento.</p>
            </article>
            <article className="investigation-scene-note">
              <span>03 · Acesso</span>
              <strong>Chave-mestra</strong>
              <p>O arquivo não apresenta sinais de arrombamento. A fechadura registra uma abertura.</p>
            </article>
          </div>
          <div className="investigation-first-actions">
            <button type="button" onClick={() => setTab("evidence")}><FileSearch aria-hidden="true" /> Examinar pistas</button>
            <button type="button" onClick={() => setTab("interviews")}><MessageSquareText aria-hidden="true" /> Ouvir suspeitos</button>
          </div>
          <div className="investigation-suspects-overview">
            <h3>Quatro pessoas sob investigação</h3>
            <div className="investigation-suspect-grid">
              {suspects.map((suspect) => (
                <article key={suspect.id} className={progress.interviewed.includes(suspect.id) ? "is-interviewed" : ""}>
                  <span className="investigation-suspect-avatar">{suspect.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</span>
                  <div><strong>{suspect.name}</strong><small>{suspect.role}</small></div>
                  {progress.interviewed.includes(suspect.id) && <CheckCircle2 aria-label="Depoimento colhido" />}
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "evidence" && (
        <div className="investigation-evidence-section">
          <div className="investigation-section-intro">
            <span className="investigation-kicker">Perícia e documentos</span>
            <h3>Quadro de evidências</h3>
            <p>Abra cada documento, leia os detalhes e registre o que já foi analisado.</p>
          </div>
          <div className="investigation-evidence-grid">
            {evidence.map((item, index) => {
              const reviewed = progress.reviewedEvidence.includes(item.id);
              return (
                <article key={item.id} className={reviewed ? "is-reviewed" : ""}>
                  <div className="investigation-evidence-top">
                    <span>PISTA {String(index + 1).padStart(2,"0")}</span>
                    {reviewed ? <CheckCircle2 aria-label="Analisada" /> : <Eye aria-hidden="true" />}
                  </div>
                  <h4>{item.title}</h4>
                  <p className="investigation-evidence-location">{item.location} · {item.time}</p>
                  <p>{item.summary}</p>
                  <details onToggle={(event) => event.currentTarget.open && reviewEvidence(item.id)}>
                    <summary>{reviewed ? "Rever documento" : "Examinar documento"}</summary>
                    <div className="investigation-evidence-detail">
                      <p>{item.detail}</p>
                      <p className="investigation-evidence-implication"><strong>O que isso sugere:</strong> {item.implication}</p>
                      <button type="button" onClick={() => reviewEvidence(item.id)}><CheckCircle2 aria-hidden="true" /> Registrar como analisada</button>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
          <p className="investigation-section-footnote">{reviewedCount === evidence.length ? "Todas as evidências foram examinadas. Compare os horários com os depoimentos." : "Dica: não tire conclusões apenas pelo motivo. Compare o que cada pessoa disse com os registros independentes."}</p>
        </div>
      )}

      {tab === "interviews" && (
        <div className="investigation-interviews">
          <div className="investigation-section-intro">
            <span className="investigation-kicker">Sala de entrevistas</span>
            <h3>Interrogatórios</h3>
            <p>Selecione uma pessoa para ler o depoimento inicial e as respostas às perguntas da investigação.</p>
          </div>
          <div className="investigation-interview-layout">
            <div className="investigation-suspect-list">
              {suspects.map((suspect) => (
                <button
                  key={suspect.id}
                  type="button"
                  className={progress.selectedSuspect === suspect.id ? "is-active" : ""}
                  onClick={() => interviewSuspect(suspect.id)}
                >
                  <span className="investigation-suspect-avatar">{suspect.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</span>
                  <span><strong>{suspect.name}</strong><small>{suspect.role}</small></span>
                  {progress.interviewed.includes(suspect.id) && <CheckCircle2 aria-hidden="true" />}
                </button>
              ))}
            </div>
            <article className="investigation-testimony">
              <span className="investigation-kicker">Depoimento · {selectedSuspect.role}</span>
              <h4>{selectedSuspect.name}</h4>
              <p className="investigation-appearance">{selectedSuspect.appearance}</p>
              <blockquote>“{selectedSuspect.statement}”</blockquote>
              <div className="investigation-interview-divider"><span>Após confrontação com os registros</span></div>
              <p>{selectedSuspect.response}</p>
              <div className="investigation-motive-note"><strong>Possível ligação com o caso</strong><p>{selectedSuspect.motive}</p></div>
              {!progress.interviewed.includes(selectedSuspect.id) ? (
                <button type="button" className="investigation-record-button" onClick={() => interviewSuspect(selectedSuspect.id)}>
                  <ClipboardList aria-hidden="true" /> Registrar depoimento
                </button>
              ) : (
                <span className="investigation-recorded"><CheckCircle2 aria-hidden="true" /> Depoimento registrado</span>
              )}
            </article>
          </div>
        </div>
      )}

      {tab === "verdict" && (
        <div className="investigation-verdict-section">
          <div className="investigation-section-intro">
            <span className="investigation-kicker">Relatório final</span>
            <h3>Quem levou a Carta Celeste?</h3>
            <p>Escolha um suspeito, o método usado e o motivo. Você precisa examinar pelo menos três pistas e ouvir duas pessoas antes de registrar a conclusão.</p>
          </div>
          {!canAccuse && (
            <div className="investigation-unlock-note"><ShieldAlert aria-hidden="true" /><span>Conclusão ainda bloqueada: analise {Math.max(0,3-reviewedCount)} pista(s) e colha {Math.max(0,2-interviewedCount)} depoimento(s) a mais.</span></div>
          )}
          <div className="investigation-verdict-form">
            <label>
              <span>Suspeito</span>
              <select value={progress.verdictSuspect} onChange={(event) => update({ verdictSuspect: event.target.value, solved: false })}>
                <option value="">Selecione quem você acusa</option>
                {suspects.map((suspect) => <option key={suspect.id} value={suspect.id}>{suspect.name}</option>)}
              </select>
            </label>
            <label>
              <span>Método</span>
              <select value={progress.verdictMethod} onChange={(event) => update({ verdictMethod: event.target.value, solved: false })}>
                <option value="">Como a pessoa entrou e retirou a peça?</option>
                <option value="master-key">Usou a chave-mestra e escondeu a carta no tubo de plantas</option>
                <option value="window">Entrou pela claraboia e saiu pela janela</option>
                <option value="guard-key">Pegou a chave do posto de segurança</option>
                <option value="disguise">Disfarçou a peça dentro de uma caixa de ferramentas</option>
              </select>
            </label>
            <label>
              <span>Motivo</span>
              <select value={progress.verdictMotive} onChange={(event) => update({ verdictMotive: event.target.value, solved: false })}>
                <option value="">Qual era o objetivo?</option>
                <option value="private-sale">Vender a obra discretamente para pagar uma dívida</option>
                <option value="journalistic">Criar uma notícia exclusiva para a imprensa</option>
                <option value="prank">Fazer uma brincadeira durante a exposição</option>
                <option value="protect">Retirar a carta para protegê-la de um dano</option>
              </select>
            </label>
            <button type="button" disabled={!canAccuse || !progress.verdictSuspect || !progress.verdictMethod || !progress.verdictMotive} onClick={submitVerdict}>
              <Fingerprint aria-hidden="true" /> Registrar conclusão
            </button>
          </div>

          {showSolution && (
            <article className={verdictCorrect ? "investigation-result is-correct" : "investigation-result is-incorrect"} aria-live="polite">
              {verdictCorrect ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
              <div>
                <h4>{verdictCorrect ? "Caso solucionado!" : "Conclusão incorreta"}</h4>
                <p>{verdictCorrect ? "Vocês identificaram a pessoa responsável e reconstruíram o método e o motivo." : "A acusação não explica todas as evidências. Releia os registros de acesso, a imagem do corredor e o tubo encontrado na sala da curadoria."}</p>
                <button type="button" onClick={() => setTab("evidence")}>{verdictCorrect ? "Revisar evidências" : "Voltar às evidências"}</button>
              </div>
            </article>
          )}
          {showSolution && verdictCorrect && (
            <article className="investigation-solution-report">
              <span className="investigation-kicker">Relatório da corregedoria</span>
              <h4>Helena Duarte foi responsável pelo furto.</h4>
              <p>Ela retornou ao arquivo às 21h12 usando a chave-mestra 01, apesar de afirmar que havia deixado o museu às 20h50. A câmera a registrou no corredor às 21h16, com o lenço vermelho e o tubo de plantas. A Carta Celeste foi escondida no tubo e o resíduo dourado, junto das fibras azuis, confirmou a ligação.</p>
              <p>O rascunho de proposta privada, editado às 20h58 e acompanhado de uma cobrança vencida, revela o motivo financeiro. Helena pretendia vender a peça a um colecionador para quitar a dívida. Os registros do café, do laboratório e do rádio afastam os outros três suspeitos no horário decisivo.</p>
            </article>
          )}
          {showHint && (
            <div className="investigation-hint"><Sparkles aria-hidden="true" /><p>Compare a hora da fechadura com o horário em que Helena disse ter saído. Depois procure a mesma descrição de objeto em outra evidência.</p></div>
          )}
          <button type="button" className="investigation-hint-button" onClick={() => setShowHint((value) => !value)}><Sparkles aria-hidden="true" /> {showHint ? "Ocultar dica" : "Pedir uma dica"}</button>
          {progress.solved && !showSolution && <p className="investigation-section-footnote">Sua conclusão anterior foi salva neste dispositivo.</p>}
        </div>
      )}
      <footer className="investigation-game-footer">
        <span><ShieldAlert aria-hidden="true" /> Ficção interativa · nenhum caso é real</span>
        <button type="button" onClick={resetCase}>Reiniciar caso</button>
      </footer>
    </section>
  );
}
