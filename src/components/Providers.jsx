import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import * as api from '../api.js'
import { definirModoCliente, gravarCredencial, lerCredencial, limparCredencial } from '../lib/credencial.js'
import { gravarToken, lerToken, limparToken, EVENTO_SESSAO_EXPIRADA } from '../lib/sessao.js'
import { CredencialContext, ToastContext, WorkspaceContext } from '../lib/util.js'

// O modo vem da API (LLM_MODO no .env dela): cliente pede a chave, servidor usa a do .env.
export function CredencialProvider({ children }) {
  const [credencial, setCredencial] = useState(lerCredencial)
  const [llm, setLlm] = useState({ estado: 'carregando' })

  const buscar = useCallback(
    () =>
      api.configuracaoLlm().then(
        (config) => {
          definirModoCliente(config.modo === 'cliente')
          setLlm({ estado: 'pronto', ...config })
        },
        (erro) => setLlm({ estado: 'erro', erro }),
      ),
    [],
  )

  useEffect(() => {
    buscar()
  }, [buscar])

  const carregar = useCallback(() => {
    setLlm({ estado: 'carregando' })
    buscar()
  }, [buscar])

  const valor = useMemo(
    () => ({
      llm,
      recarregar: carregar,
      credencial,
      conectar: (nova, lembrar) => {
        gravarCredencial(nova, lembrar)
        setCredencial(nova)
      },
      desconectar: () => {
        limparCredencial()
        setCredencial(null)
      },
    }),
    [credencial, llm, carregar],
  )
  return <CredencialContext.Provider value={valor}>{children}</CredencialContext.Provider>
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const seq = useRef(0)

  const toast = useCallback((mensagem, tipo = 'ok') => {
    const id = ++seq.current
    setToasts((t) => [...t, { id, mensagem, tipo }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tipo === 'erro' ? 6000 : 3000)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tipo}`}>
            {t.tipo === 'erro' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{t.mensagem}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Conta logada. A empresa vem do login: não há mais lista de empresas nem ID para digitar.
export function WorkspaceProvider({ children }) {
  const [estado, setEstado] = useState(() => (lerToken() ? 'carregando' : 'anonimo'))
  const [erro, setErro] = useState(null)
  const [conta, setConta] = useState(null)
  const [aberto, setAberto] = useState(false)

  const aplicar = useCallback((sessao) => {
    gravarToken(sessao.token)
    setConta({ usuario: sessao.usuario, empresa: sessao.empresa })
    setEstado('logado')
  }, [])

  const sair = useCallback(() => {
    limparToken()
    setConta(null)
    setEstado('anonimo')
  }, [])

  const buscar = useCallback(() => {
    api.sessaoAtual().then(aplicar, (err) => {
      if (err.code === 'NAO_AUTENTICADO') sair()
      else {
        setErro(err)
        setEstado('erro')
      }
    })
  }, [aplicar, sair])

  // Ao abrir, valida o token guardado (o estado inicial já é "carregando" quando há um).
  useEffect(() => {
    if (lerToken()) buscar()
  }, [buscar])

  const recarregar = useCallback(() => {
    if (!lerToken()) {
      setEstado('anonimo')
      return
    }
    setEstado('carregando')
    buscar()
  }, [buscar])

  // A API recusou o token em qualquer chamada: volta para o login.
  useEffect(() => {
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, sair)
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, sair)
  }, [sair])

  // Só a tela de login precisa saber se o cadastro está aberto.
  useEffect(() => {
    if (estado !== 'anonimo') return
    api.registroAberto().then(setAberto, () => setAberto(false))
  }, [estado])

  // O nome de exibição vem da persona, que pode mudar em Configurações.
  const empresaId = conta?.empresa.id
  const renomear = useCallback((id, nome) => {
    setConta((c) => (c && c.empresa.id === id && c.empresa.nome !== nome ? { ...c, empresa: { ...c.empresa, nome } } : c))
  }, [])

  useEffect(() => {
    if (!empresaId) return undefined
    let ativo = true
    api
      .configuracoes(empresaId)
      .then((lista) => {
        const nome = lista.find((c) => c.modulo === 'ATENDIMENTO_GERAL')?.config?.persona?.empresaNome
        if (ativo && nome) renomear(empresaId, nome)
      })
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [empresaId, renomear])

  const valor = useMemo(
    () => ({
      estado,
      erro,
      recarregar,
      empresa: conta?.empresa ?? null,
      usuario: conta?.usuario ?? null,
      registroAberto: aberto,
      renomear,
      sair,
      entrar: async (email, senha) => aplicar(await api.entrar(email, senha)),
      registrar: async (nomeEmpresa, email, senha) => aplicar(await api.registrar(nomeEmpresa, email, senha)),
    }),
    [estado, erro, recarregar, conta, aberto, renomear, sair, aplicar],
  )

  return <WorkspaceContext.Provider value={valor}>{children}</WorkspaceContext.Provider>
}
