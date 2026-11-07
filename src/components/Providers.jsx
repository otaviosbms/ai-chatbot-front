import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import * as api from '../api.js'
import { gravar, ler, ToastContext, UUID, WorkspaceContext } from '../lib/util.js'

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

// A API não lista empresas: o navegador guarda as que o usuário criou ou conectou.
function empresasIniciais() {
  const salvas = ler('chatbot-empresas', null)
  if (salvas) return salvas
  const antiga = ler('chatbot-config', {}).empresaId
  return antiga && UUID.test(antiga) ? [{ id: antiga, nome: 'Empresa salva' }] : []
}

export function WorkspaceProvider({ children }) {
  const [empresas, setEmpresas] = useState(empresasIniciais)
  const [atualId, setAtualId] = useState(() => ler('chatbot-empresa-atual', null))

  const empresa = empresas.find((e) => e.id === atualId) ?? empresas[0] ?? null
  const empresaId = empresa?.id

  useEffect(() => gravar('chatbot-empresas', empresas), [empresas])
  useEffect(() => gravar('chatbot-empresa-atual', empresaId ?? null), [empresaId])

  const renomear = useCallback((id, nome) => {
    setEmpresas((lista) => (lista.some((e) => e.id === id && e.nome !== nome) ? lista.map((e) => (e.id === id ? { ...e, nome } : e)) : lista))
  }, [])

  // O nome de exibição vem da persona, que pode mudar em Configurações.
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

  const valor = useMemo(() => {
    const adicionar = (e) => {
      setEmpresas((lista) => [...lista.filter((x) => x.id !== e.id), e])
      setAtualId(e.id)
    }
    return {
      empresas,
      empresa,
      selecionar: setAtualId,
      renomear,
      criar: async (nome) => {
        const e = await api.criarEmpresa(nome)
        adicionar({ id: e.id, nome: e.nome })
        return e
      },
      conectar: async (id) => {
        if (!UUID.test(id)) throw new Error('Informe um ID válido, no formato UUID.')
        const lista = await api.configuracoes(id)
        if (lista.length === 0) throw new Error('Nenhuma empresa encontrada com esse ID.')
        const nome = lista.find((c) => c.modulo === 'ATENDIMENTO_GERAL')?.config?.persona?.empresaNome
        adicionar({ id, nome: nome || 'Empresa' })
      },
      esquecer: (id) => setEmpresas((lista) => lista.filter((e) => e.id !== id)),
    }
  }, [empresas, empresa, renomear])

  return <WorkspaceContext.Provider value={valor}>{children}</WorkspaceContext.Provider>
}
