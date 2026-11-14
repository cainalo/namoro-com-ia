export type ThisOrThatQuestion = {
  id: string;
  prompt: string;
  a: string;
  b: string;
  category: string;
};

export const thisOrThatQuestions: ThisOrThatQuestion[] = [
  { id: "viagem", prompt: "Para viajar juntos, vocês preferem…", a: "Praia e mar", b: "Montanhas e frio", category: "Viagens" },
  { id: "dia-livre", prompt: "Em um dia livre, combina mais…", a: "Sair para conhecer um lugar", b: "Ficar em casa sem pressa", category: "Rotina" },
  { id: "noite-a-dois", prompt: "Para uma noite a dois…", a: "Filme e cobertor", b: "Jogo e brincadeira", category: "Lazer" },
  { id: "cozinha", prompt: "Na cozinha, vocês escolheriam…", a: "Preparar uma receita juntos", b: "Experimentar um restaurante novo", category: "Comida" },
  { id: "lembranca", prompt: "Para guardar uma lembrança especial…", a: "Fotos e vídeos", b: "Cartas e bilhetes", category: "Memórias" },
  { id: "surpresa", prompt: "Uma surpresa gostosa seria…", a: "Um passeio inesperado", b: "Um presente escolhido com carinho", category: "Carinho" },
  { id: "viagem-ritmo", prompt: "Em uma viagem, o melhor ritmo é…", a: "Planejar cada dia", b: "Decidir na hora", category: "Viagens" },
  { id: "cafe-cha", prompt: "Para acompanhar uma conversa…", a: "Café bem quente", b: "Chá e tranquilidade", category: "Comida" },
  { id: "amanhecer", prompt: "Um momento bonito do dia…", a: "O nascer do sol", b: "O céu no fim da tarde", category: "Preferências" },
  { id: "livro-filme", prompt: "Para conhecer uma história…", a: "Ler o livro primeiro", b: "Assistir à adaptação", category: "Lazer" },
  { id: "presente-tempo", prompt: "O presente mais valioso…", a: "Tempo de qualidade", b: "Algo feito especialmente para você", category: "Carinho" },
  { id: "casa-cheiro", prompt: "Uma casa acolhedora tem…", a: "Cheiro de comida preparada", b: "Cheiro de roupa limpa e flores", category: "Casa" },
  { id: "passeio-urbano", prompt: "Um passeio de sábado…", a: "Centro histórico e museus", b: "Parque, trilha e natureza", category: "Viagens" },
  { id: "jantar", prompt: "No jantar especial…", a: "Uma receita conhecida e querida", b: "Um prato que nunca provaram", category: "Comida" },
  { id: "musica-ao-vivo", prompt: "Para ouvir música juntos…", a: "Show ao vivo", b: "Playlist em casa", category: "Lazer" },
  { id: "festa", prompt: "Uma comemoração ideal…", a: "Poucas pessoas e conversa", b: "Muita gente e animação", category: "Preferências" },
  { id: "manhã", prompt: "Uma manhã livre combina com…", a: "Caminhada e ar fresco", b: "Café demorado na cama", category: "Rotina" },
  { id: "organização", prompt: "Para organizar a semana…", a: "Agenda e horários definidos", b: "Uma lista flexível de prioridades", category: "Rotina" },
  { id: "decoração", prompt: "Na decoração da casa…", a: "Cores vivas e personalidade", b: "Tons suaves e simplicidade", category: "Casa" },
  { id: "jardim", prompt: "Um cantinho especial em casa…", a: "Jardim com plantas", b: "Biblioteca ou espaço de leitura", category: "Casa" },
  { id: "aventura", prompt: "Uma aventura de fim de semana…", a: "Acampar e dormir ao ar livre", b: "Conhecer uma cidade diferente", category: "Viagens" },
  { id: "doce-salgado", prompt: "Na hora do lanche…", a: "Uma sobremesa doce", b: "Um salgado bem feito", category: "Comida" },
  { id: "pizza", prompt: "Uma pizza perfeita…", a: "Sabores clássicos", b: "Combinações diferentes", category: "Comida" },
  { id: "cozinhar-juntos", prompt: "Cozinhar em dupla é melhor quando…", a: "Cada um cuida de uma etapa", b: "Os dois fazem tudo lado a lado", category: "Carinho" },
  { id: "jogos", prompt: "Em uma noite de jogos…", a: "Competição e estratégia", b: "Cooperação e criatividade", category: "Lazer" },
  { id: "quebra-cabeca", prompt: "Para relaxar a dois…", a: "Montar um quebra-cabeça", b: "Ouvir música e conversar", category: "Lazer" },
  { id: "praia-hora", prompt: "Na praia, vocês preferem…", a: "Chegar cedo e aproveitar o dia", b: "Ver o pôr do sol e ficar até tarde", category: "Viagens" },
  { id: "frio", prompt: "Em um dia frio…", a: "Cobertor, livro e bebida quente", b: "Passeio ao ar livre bem agasalhados", category: "Rotina" },
  { id: "chuva", prompt: "Quando começa a chover…", a: "Aproveitar o aconchego de casa", b: "Sair para caminhar na chuva", category: "Preferências" },
  { id: "fotografia", prompt: "Em uma viagem, vocês registram mais…", a: "Paisagens e lugares", b: "Pessoas e pequenos detalhes", category: "Memórias" },
  { id: "recordacao", prompt: "Uma recordação de viagem…", a: "Um objeto típico do lugar", b: "Uma fotografia impressa", category: "Memórias" },
  { id: "cartas", prompt: "Uma mensagem carinhosa…", a: "Áudio espontâneo", b: "Texto escrito com cuidado", category: "Carinho" },
  { id: "encontro", prompt: "Um encontro simples…", a: "Piquenique no parque", b: "Café em uma livraria", category: "Carinho" },
  { id: "rotina-domingo", prompt: "No domingo à noite…", a: "Preparar a semana juntos", b: "Desligar de tudo e descansar", category: "Rotina" },
  { id: "aprendizado-arte", prompt: "Aprender algo novo em dupla…", a: "Pintura ou desenho", b: "Dança ou instrumento musical", category: "Aprendizado" },
  { id: "idioma", prompt: "Se fossem estudar um idioma…", a: "Aprender com filmes e músicas", b: "Fazer exercícios e conversação", category: "Aprendizado" },
  { id: "desafio", prompt: "Um desafio para fazer juntos…", a: "Atividade física ou trilha", b: "Enigma ou jogo de lógica", category: "Aprendizado" },
  { id: "projeto", prompt: "Um projeto em comum…", a: "Criar algo com as próprias mãos", b: "Planejar uma viagem longa", category: "Sonhos" },
  { id: "casa-futura", prompt: "A casa dos sonhos teria…", a: "Um quintal amplo", b: "Uma varanda com vista", category: "Sonhos" },
  { id: "viagem-longa", prompt: "Uma viagem inesquecível…", a: "Conhecer vários lugares em pouco tempo", b: "Ficar mais dias em um só lugar", category: "Viagens" },
  { id: "mar-montanha", prompt: "Para descansar alguns dias…", a: "Uma pousada perto do mar", b: "Uma cabana na serra", category: "Viagens" },
  { id: "cultura", prompt: "Em uma cidade nova, vocês visitam primeiro…", a: "Museus e construções históricas", b: "Feiras, mercados e bairros locais", category: "Viagens" },
  { id: "animal", prompt: "Um encontro com animais seria…", a: "Observar aves e vida selvagem", b: "Visitar uma fazenda ou santuário", category: "Preferências" },
  { id: "horta", prompt: "Uma atividade para fazer em casa…", a: "Cuidar de uma horta", b: "Fazer uma pequena oficina artesanal", category: "Casa" },
  { id: "filme-genero", prompt: "Na escolha de um filme…", a: "Suspense e mistério", b: "Fantasia e aventura", category: "Lazer" },
  { id: "serie", prompt: "Uma série é melhor quando…", a: "Tem poucos episódios e termina bem", b: "Tem várias temporadas para acompanhar", category: "Lazer" },
  { id: "memoria-infancia", prompt: "Para conversar sobre a infância…", a: "Rever fotos antigas", b: "Contar histórias que quase ninguém conhece", category: "Memórias" },
  { id: "tradição", prompt: "Uma tradição para criar…", a: "Um prato especial em uma data fixa", b: "Um passeio repetido todo ano", category: "Memórias" },
  { id: "celebracao", prompt: "Uma data especial merece…", a: "Uma comemoração planejada", b: "Uma surpresa improvisada", category: "Carinho" },
  { id: "mensagem", prompt: "Durante um dia corrido…", a: "Uma mensagem curta de carinho", b: "Uma ligação rápida para conversar", category: "Carinho" },
  { id: "livraria", prompt: "Em uma livraria, vocês…", a: "Procuram um título específico", b: "Passeiam e descobrem algo inesperado", category: "Lazer" },
  { id: "arte-museu", prompt: "Em um museu, chama mais atenção…", a: "Pinturas e esculturas", b: "Objetos históricos e exposições interativas", category: "Cultura" },
  { id: "planejamento", prompt: "Para realizar um sonho…", a: "Dividir em pequenas metas", b: "Começar pelo primeiro passo e ajustar no caminho", category: "Sonhos" },
  { id: "economia", prompt: "Para juntar dinheiro para um plano…", a: "Guardar um valor fixo todo mês", b: "Economizar o que sobrar de cada mês", category: "Planos" },
  { id: "tempo-livre", prompt: "Em uma tarde sem compromissos…", a: "Fazer algo produtivo", b: "Descansar sem culpa", category: "Rotina" },
  { id: "mudanca", prompt: "Uma mudança de cenário seria…", a: "Morar perto de tudo", b: "Morar em um lugar mais tranquilo", category: "Sonhos" },
  { id: "amizade", prompt: "Uma reunião com amigos…", a: "Jantar e conversa ao redor da mesa", b: "Atividade ao ar livre e brincadeiras", category: "Preferências" },
  { id: "lembranca-futura", prompt: "Daqui a alguns anos, vocês gostariam de lembrar…", a: "Uma grande conquista compartilhada", b: "Muitos pequenos momentos do cotidiano", category: "Memórias" },
];

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function stableShuffle<T>(values: T[], seed: number): T[] {
  const random = seededRandom(seed);
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function getDailyThisOrThatRound(date = new Date(), count = 15) {
  const key = dateKey(date);
  const seed = Array.from(key).reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7);
  return stableShuffle(thisOrThatQuestions, seed).slice(0, Math.min(count, thisOrThatQuestions.length));
}

export function getFreshThisOrThatRound(recentIds: string[] = [], count = 15) {
  const recent = new Set(recentIds.slice(-45));
  let available = thisOrThatQuestions.filter((question) => !recent.has(question.id));
  if (available.length < count) {
    const lastRound = new Set(recentIds.slice(-count));
    available = thisOrThatQuestions.filter((question) => !lastRound.has(question.id));
  }
  return stableShuffle(available, Math.floor(Math.random() * 0xffffffff)).slice(0, count);
}
