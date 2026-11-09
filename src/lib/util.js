import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// Armazenamento local: pode falhar em janela privada, então nunca lança.
export function ler(chave, padrao) {
  try {
    return JSON.parse(localStorage.getItem(chave)) ?? padrao
  } catch {
    return padrao
  }
}

export function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    /* sem armazenamento: segue só em memória */
  }
}

// Contextos globais
export const WorkspaceContext = createContext(null)
export const useWorkspace = () => useContext(WorkspaceContext)
export const CredencialContext = createContext(null)
export const useCredencial = () => useContext(CredencialContext)
export const ToastContext = createContext(() => {})
export const useToast = () => useContext(ToastContext)

// Busca dados, opcionalmente em intervalo. Polling pausa com a aba oculta.
export function useQuery(fn, deps = [], { interval } = {}) {
  const [estado, setEstado] = useState({ data: null, loading: true, error: null })
  const fnRef = useRef(fn)
  const seq = useRef(0)

  useEffect(() => {
    fnRef.current = fn
  })

  const refetch = useCallback(async () => {
    const id = ++seq.current
    try {
      const data = await fnRef.current()
      if (id === seq.current) setEstado({ data, loading: false, error: null })
      return data
    } catch (error) {
      if (id === seq.current) setEstado((s) => ({ ...s, loading: false, error }))
      return undefined
    }
  }, [])

  useEffect(() => {
    refetch()
    if (!interval) return undefined
    const t = setInterval(() => {
      if (!document.hidden) refetch()
    }, interval)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch, interval, ...deps])

  const setData = useCallback((atualizar) => {
    seq.current++ // descarta resposta em voo, que traria o valor antigo
    setEstado((s) => ({ ...s, data: typeof atualizar === 'function' ? atualizar(s.data) : atualizar }))
  }, [])

  return { ...estado, refetch, setData }
}

// Formatação
const pad = (n) => String(n).padStart(2, '0')

export function hora(iso) {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function dataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function relativo(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const dias = Math.floor(h / 24)
  return dias === 1 ? 'ontem' : `há ${dias} dias`
}

export const iniciais = (texto = '') =>
  texto
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?'

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Rótulos da API
export const ESTADOS = {
  BOT: { rotulo: 'Com o bot', tom: 'info' },
  AGUARDANDO_HUMANO: { rotulo: 'Na fila', tom: 'warn' },
  HUMANO: { rotulo: 'Com atendente', tom: 'accent' },
  ENCERRADA: { rotulo: 'Encerrada', tom: 'neutral' },
}

export const STATUS_PROTOCOLO = {
  ABERTO: { rotulo: 'Aberto', tom: 'warn' },
  EM_ANDAMENTO: { rotulo: 'Em andamento', tom: 'info' },
  RESOLVIDO: { rotulo: 'Resolvido', tom: 'good' },
}

export const TIPO_PROTOCOLO = { RECLAMACAO: 'Reclamação', DUVIDA: 'Dúvida', SOLICITACAO: 'Solicitação' }

export const TIPO_ARTIGO = { PERGUNTA_RESPOSTA: 'Pergunta e resposta', INSTRUCAO: 'Instrução' }

export const STATUS_DOCUMENTO = {
  PROCESSANDO: { rotulo: 'Processando', tom: 'info' },
  PRONTO: { rotulo: 'Pronto', tom: 'good' },
  ERRO: { rotulo: 'Erro', tom: 'bad' },
}

export const TIPO_SLOT = { texto: 'Texto', email: 'E-mail', telefone: 'Telefone', cpf: 'CPF', numero: 'Número' }
