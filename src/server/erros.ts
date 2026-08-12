// Fonte única de copy de erro visível ao usuário.
// Ver docs/base-de-conhecimentos/frontend/padrao-erros-usuario.md.
export const MensagemDeErro = {
  NAO_AUTORIZADO: "Você precisa entrar para fazer isso",
  TERMO_OBRIGATORIO: "Escreva o termo que você quer vigiar",
  TERMO_MUITO_CURTO: "O termo precisa ter pelo menos 3 letras",
  LIMITE_DE_TERMOS: "Seu plano permite até 3 termos vigiados",
  AVISO_NAO_ENCONTRADO: "Esse aviso não existe mais",
  EMAIL_INVALIDO: "Confira o e-mail digitado",
} as const;

export type MensagemDeErro = (typeof MensagemDeErro)[keyof typeof MensagemDeErro];
