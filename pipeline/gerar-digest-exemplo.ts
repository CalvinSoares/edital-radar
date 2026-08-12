// Gera um digest de exemplo (HTML) com dados reais do DOE para inspeção
// visual do e-mail durante o desenvolvimento.
//   pnpm tsx pipeline/gerar-digest-exemplo.ts [caminho-de-saida.html]

import { writeFileSync } from "node:fs";
import { selecionarDigests, type AlertaPendente } from "../src/server/alerta/selecionar";
import { renderizarDigest } from "../src/server/alerta/render";

const saida = process.argv[2] ?? "out/digest-exemplo.html";

const base = {
  assinanteId: "as-1",
  email: "ong@exemplo.org",
  descadastroToken: "11111111-1111-1111-1111-111111111111",
};

const pendentes: AlertaPendente[] = [
  {
    ...base,
    alertaId: "a1",
    termo: "chamamento publico",
    titulo:
      "PROGRAMA SP PRODUZ RESULTADO PRÉVIO DO EDITAL SDE/SDER Nº 01/2026 - CHAMAMENTO PÚBLICO PARA FOMENTO DE CADEIAS PRODUTIVAS LOCAIS",
    trecho:
      "…torna público o RESULTADO PRELIMINAR DA HABILITAÇÃO JURÍDICA E DO ENQUADRAMENTO NA CATEGORIA DE INOVAÇÃO INDUSTRIAL do Edital SDE/SCDER nº 01/2026 - Chamamento Público para fomento de cadeias produtivas locais…",
    slug: "executivo/secretaria-de-desenvolvimento-economico/programa-sp-produz-resultado",
    dataPublicacao: new Date("2026-08-12T04:00:00Z"),
  },
  {
    ...base,
    alertaId: "a2",
    termo: "termo de fomento",
    titulo:
      "RETIFICAÇÃO DO EXTRATO DE ADITAMENTO AO TERMO DE FOMENTO SCTI/CCTI Nº 011/2024, DE 11 DE AGOSTO DE 2026",
    trecho:
      "RETIFICAÇÃO DO EXTRATO DE ADITAMENTO AO TERMO DE FOMENTO SCTI/CCTI Nº 011/2024, celebrado entre o Estado e a organização parceira, com vigência até 2027…",
    slug: "executivo/secretaria-de-ciencia-tecnologia-e-inovacao/retificacao-do-extrato",
    dataPublicacao: new Date("2026-08-12T04:10:00Z"),
  },
];

const [digest] = selecionarDigests(pendentes);
const email = renderizarDigest(digest!, "2026-08-12", "https://editalradar.com.br");
writeFileSync(saida, email.html, "utf8");
console.log(`assunto: ${email.assunto}`);
console.log(`html salvo em: ${saida}`);
