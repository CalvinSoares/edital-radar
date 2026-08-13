// Tradutor — 1ª fatia: checklist determinística “serve pra mim?”.
// Sem LLM. Itens fixos; tipagem leve por modalidade do título.

export type RespostaChecklist = "sim" | "nao" | "nao_sei";

export type ItemChecklist = {
  id: string;
  pergunta: string;
  dica?: string;
  /** Link de ajuda opcional (ex.: verificar CNPJ no Certidão Zero). */
  ajuda?: { href: string; rotulo: string };
};

export type ModalidadeEdital = "chamamento" | "credenciamento" | "fomento" | "generico";

export function detectarModalidade(titulo: string): ModalidadeEdital {
  const t = titulo.toLowerCase();
  if (/credenciamento/.test(t)) return "credenciamento";
  if (/chamamento/.test(t)) return "chamamento";
  if (/fomento|colabora/.test(t)) return "fomento";
  return "generico";
}

const BASE: ItemChecklist[] = [
  {
    id: "osc",
    pergunta: "Sua entidade é uma ONG/OSC com CNPJ ativo?",
    dica: "A maioria dos editais de fomento exige organização da sociedade civil.",
    ajuda: {
      href: "https://certidao-zero.vercel.app",
      rotulo: "Não tem certeza? Cheque a situação e sanções da sua entidade no Certidão Zero",
    },
  },
  {
    id: "causa",
    pergunta: "A causa do edital combina com o que vocês fazem de verdade?",
    dica: "Se for só “parecido”, anote o que falta antes de investir tempo.",
  },
  {
    id: "territorio",
    pergunta: "A área geográfica do edital cobre onde vocês atuam?",
  },
  {
    id: "prazo",
    pergunta: "Dá tempo de montar a documentação até o prazo?",
    dica: "Se o prazo for curto, priorize o que já está em dia (certidões, estatuto).",
  },
  {
    id: "docs",
    pergunta: "Estatuto, ata da diretoria e certidões estão em dia?",
  },
];

const EXTRA_POR_MODALIDADE: Partial<Record<ModalidadeEdital, ItemChecklist[]>> = {
  chamamento: [
    {
      id: "publico",
      pergunta: "Vocês se encaixam no público-alvo descrito (tipo de OSC / público atendido)?",
    },
  ],
  credenciamento: [
    {
      id: "capacidade",
      pergunta: "Conseguem cumprir o serviço/capacidade técnica pedida no credenciamento?",
    },
  ],
  fomento: [
    {
      id: "contrapartida",
      pergunta: "Se houver contrapartida ou meta de atendimento, vocês conseguem cumprir?",
    },
  ],
};

export function montarChecklist(titulo: string): ItemChecklist[] {
  const modalidade = detectarModalidade(titulo);
  return [...BASE, ...(EXTRA_POR_MODALIDADE[modalidade] ?? [])];
}

/** Heurística simples: maioria “não” → provavelmente não serve; senão “vale olhar”. */
export function resumirChecklist(
  itens: ItemChecklist[],
  respostas: Record<string, RespostaChecklist>,
): { tom: "positivo" | "atencao" | "negativo" | "incompleto"; texto: string } {
  const valores = itens.map((i) => respostas[i.id]).filter(Boolean) as RespostaChecklist[];
  if (valores.length < itens.length) {
    return { tom: "incompleto", texto: "Responda todos os itens para ver o resumo." };
  }
  const naos = valores.filter((v) => v === "nao").length;
  const sims = valores.filter((v) => v === "sim").length;
  if (naos >= 2) {
    return {
      tom: "negativo",
      texto: "Pelo que você marcou, este edital provavelmente não encaixa agora. Guarde só se quiser acompanhar a retificação.",
    };
  }
  if (sims >= itens.length - 1) {
    return {
      tom: "positivo",
      texto: "Sinais bons: vale ler a publicação na fonte e listar os documentos pedidos.",
    };
  }
  return {
    tom: "atencao",
    texto: "Há dúvidas. Leia o trecho de elegibilidade na fonte antes de montar pasta.",
  };
}
