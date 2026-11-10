// Token de login do painel. Fica no armazenamento local para a sessão sobreviver ao fechar a aba.
const CHAVE = 'chatbot-sessao'

export function lerToken() {
  try {
    return localStorage.getItem(CHAVE) || null
  } catch {
    return null
  }
}

export function gravarToken(token) {
  try {
    localStorage.setItem(CHAVE, token)
  } catch {
    /* sem armazenamento: vale só até recarregar a página */
  }
}

export function limparToken() {
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    /* nada a limpar */
  }
}

/** Disparado quando a API recusa o token (expirou ou foi adulterado). */
export const EVENTO_SESSAO_EXPIRADA = 'chatbot-sessao-expirada'
