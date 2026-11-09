// Chave e modelo da OpenAI de quem usa o painel. Ficam só neste navegador:
// na sessão por padrão, ou no armazenamento local se a pessoa pedir para lembrar.
const CHAVE = 'chatbot-openai'

function armazenamentos() {
  try {
    return [sessionStorage, localStorage]
  } catch {
    return []
  }
}

export function lerCredencial() {
  for (const area of armazenamentos()) {
    try {
      const valor = JSON.parse(area.getItem(CHAVE))
      if (valor?.apiKey && valor?.model) return valor
    } catch {
      /* armazenamento indisponível ou valor antigo: ignora */
    }
  }
  return null
}

export function gravarCredencial(credencial, lembrar) {
  limparCredencial()
  try {
    ;(lembrar ? localStorage : sessionStorage).setItem(CHAVE, JSON.stringify(credencial))
  } catch {
    /* sem armazenamento: vale só enquanto a página estiver aberta */
  }
}

export function limparCredencial() {
  for (const area of armazenamentos()) {
    try {
      area.removeItem(CHAVE)
    } catch {
      /* nada a limpar */
    }
  }
}

// No modo servidor a API usa a chave do .env: o navegador não manda nada.
let modoCliente = false
export function definirModoCliente(ativo) {
  modoCliente = ativo
}

/** Cabeçalhos que a API lê em cada requisição. Sem credencial explícita, só no modo cliente. */
export function cabecalhosCredencial(credencial) {
  if (!credencial && !modoCliente) return {}
  credencial ??= lerCredencial()
  if (!credencial) return {}
  return {
    ...(credencial.apiKey ? { 'x-llm-api-key': credencial.apiKey } : {}),
    ...(credencial.model ? { 'x-llm-model': credencial.model } : {}),
  }
}

