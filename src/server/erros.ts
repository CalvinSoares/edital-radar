// Fonte única de copy de erro visível ao usuário.
// Ver docs/base-de-conhecimentos/frontend/padrao-erros-usuario.md.
export const MensagemDeErro = {
  NAO_AUTORIZADO: "Você precisa entrar para fazer isso",
  TERMO_OBRIGATORIO: "Escreva o que você quer acompanhar (nome da ONG, bairro, causa…)",
  TERMO_MUITO_CURTO: "Escreva pelo menos 3 letras",
  LIMITE_DE_TERMOS: "Você já cadastrou o máximo de assuntos por enquanto",
  LIMITE_DE_TERMOS_RADAR: "Você já cadastrou o máximo de assuntos por enquanto",
  AVISO_NAO_ENCONTRADO: "Esse aviso não existe mais",
  EMAIL_INVALIDO: "Confira o e-mail digitado",
  ADMIN_SENHA_INVALIDA: "Senha de admin inválida",
  ADMIN_OFF: "Backoffice não configurado (ADMIN_SECRET)",
  PERFIL_INCOMPLETO: "Escolha pelo menos uma causa e uma região",
  PLANO_RADAR_NECESSARIO: "Salve o perfil com causa e região para receber avisos por perfil",
  LIMITE_EQUIPE: "Sua equipe já tem 3 pessoas (máximo)",
  CONVITE_INVALIDO: "Esse convite não funciona mais",
  SEM_ASSENTO: "A federação não tem assento livre",
  SO_DONO: "Só quem criou a equipe pode fazer isso",
  VISTA_SOMENTE_LEITURA: "Na vista admin você só olha — não altera dados do assinante",
  RATE_LIMIT: "Muitas tentativas. Espere um minuto e tente de novo",
} as const;

export type MensagemDeErro = (typeof MensagemDeErro)[keyof typeof MensagemDeErro];
