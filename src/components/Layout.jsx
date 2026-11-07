import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  BookOpen,
  Check,
  ChevronsUpDown,
  Copy,
  Headset,
  LayoutDashboard,
  Link2,
  Menu,
  MessagesSquare,
  Moon,
  Plus,
  Settings2,
  Sun,
  TicketCheck,
  Waypoints,
  X,
} from 'lucide-react'
import * as api from '../api.js'
import { gravar, iniciais, ler, useQuery, useToast, useWorkspace } from '../lib/util.js'
import { Campo, Modal, Spinner } from './ui.jsx'

export function FormEmpresa({ modo, onPronto }) {
  const { criar, conectar } = useWorkspace()
  const toast = useToast()
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const nova = modo === 'criar'

  const enviar = async (e) => {
    e.preventDefault()
    const v = valor.trim()
    if (!v) return
    setEnviando(true)
    setErro('')
    try {
      if (nova) {
        await criar(v)
        toast(`Empresa "${v}" criada com agente e configurações padrão.`)
      } else {
        await conectar(v)
        toast('Empresa conectada.')
      }
      onPronto?.()
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="form-empresa">
      <Campo rotulo={nova ? 'Nome da empresa' : 'ID da empresa'}>
        {(id) => (
          <input
            id={id}
            className={nova ? '' : 'mono'}
            value={valor}
            autoFocus
            placeholder={nova ? 'Ex.: Padaria Aurora' : '00000000-0000-0000-0000-000000000000'}
            onChange={(e) => setValor(e.target.value)}
          />
        )}
      </Campo>
      {erro && (
        <p className="erro-texto" role="alert">
          {erro}
        </p>
      )}
      <button className="btn btn-primario" disabled={enviando || !valor.trim()}>
        {enviando && <Spinner />} {nova ? 'Criar empresa' : 'Conectar'}
      </button>
    </form>
  )
}

function Onboarding() {
  const [modo, setModo] = useState('criar')
  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <span className="marca-icone grande">
          <MessagesSquare size={24} />
        </span>
        <h1>Vamos configurar seu chatbot</h1>
        <p>Crie uma empresa para começar com o agente padrão, ou conecte uma que já existe na API.</p>
        <div className="onboarding-abas">
          <button className={modo === 'criar' ? 'on' : ''} onClick={() => setModo('criar')}>
            Criar nova
          </button>
          <button className={modo === 'conectar' ? 'on' : ''} onClick={() => setModo('conectar')}>
            Já tenho o ID
          </button>
        </div>
        <FormEmpresa key={modo} modo={modo} />
      </div>
    </div>
  )
}

function SeletorEmpresa() {
  const { empresas, empresa, selecionar, esquecer } = useWorkspace()
  const toast = useToast()
  const [aberto, setAberto] = useState(false)
  const [modal, setModal] = useState(null)
  const raiz = useRef(null)

  useEffect(() => {
    if (!aberto) return undefined
    const fechar = (e) => !raiz.current?.contains(e.target) && setAberto(false)
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [aberto])

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(empresa.id)
      toast('ID copiado.')
    } catch {
      toast('Não foi possível copiar o ID.', 'erro')
    }
  }

  return (
    <div className="seletor" ref={raiz}>
      <button className="seletor-botao" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <span className="avatar quadrado">{iniciais(empresa.nome)}</span>
        <span className="seletor-nome">{empresa.nome}</span>
        <ChevronsUpDown size={15} />
      </button>
      {aberto && (
        <div className="seletor-menu">
          {empresas.map((e) => (
            <div key={e.id} className="seletor-item">
              <button
                onClick={() => {
                  selecionar(e.id)
                  setAberto(false)
                }}
              >
                <span className="avatar quadrado pequeno">{iniciais(e.nome)}</span>
                <span className="seletor-nome">{e.nome}</span>
                {e.id === empresa.id && <Check size={15} />}
              </button>
              <button className="btn-icone" aria-label={`Tirar ${e.nome} desta lista`} title="Tirar desta lista" onClick={() => esquecer(e.id)}>
                <X size={14} />
              </button>
            </div>
          ))}
          <hr />
          <button className="seletor-acao" onClick={copiar}>
            <Copy size={15} /> Copiar ID da empresa atual
          </button>
          <button
            className="seletor-acao"
            onClick={() => {
              setModal('criar')
              setAberto(false)
            }}
          >
            <Plus size={15} /> Nova empresa
          </button>
          <button
            className="seletor-acao"
            onClick={() => {
              setModal('conectar')
              setAberto(false)
            }}
          >
            <Link2 size={15} /> Conectar por ID
          </button>
        </div>
      )}
      {modal && (
        <Modal titulo={modal === 'criar' ? 'Nova empresa' : 'Conectar empresa'} onClose={() => setModal(null)}>
          <FormEmpresa modo={modal} onPronto={() => setModal(null)} />
        </Modal>
      )}
    </div>
  )
}

function useTema() {
  const [tema, setTema] = useState(() => {
    const salvo = ler('chatbot-tema', null)
    if (salvo) return salvo
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => {
    document.documentElement.dataset.theme = tema
    gravar('chatbot-tema', tema)
  }, [tema])
  return [tema, () => setTema((t) => (t === 'dark' ? 'light' : 'dark'))]
}

const NAV = [
  { to: '/', rotulo: 'Visão geral', icone: LayoutDashboard, end: true },
  { to: '/simulador', rotulo: 'Simulador', icone: MessagesSquare },
  { to: '/atendimento', rotulo: 'Atendimento', icone: Headset, fila: true },
  { to: '/protocolos', rotulo: 'Protocolos', icone: TicketCheck },
  { to: '/conhecimento', rotulo: 'Conhecimento', icone: BookOpen },
  { to: '/agente', rotulo: 'Agente', icone: Waypoints },
  { to: '/configuracoes', rotulo: 'Configurações', icone: Settings2 },
]

export default function Layout() {
  const { empresa } = useWorkspace()
  if (!empresa) return <Onboarding />
  return <Painel key={empresa.id} empresaId={empresa.id} />
}

function Painel({ empresaId }) {
  const [tema, alternarTema] = useTema()
  const [menu, setMenu] = useState(false)
  const saude = useQuery(() => api.health(), [], { interval: 30000 })
  const fila = useQuery(() => api.conversasAguardandoHumano(empresaId), [], { interval: 5000 })
  const online = saude.data?.database === 'up' && !saude.error
  const naFila = fila.data?.length ?? 0

  return (
    <div className="shell">
      <div className="topo-movel">
        <button className="btn-icone" aria-label="Abrir menu" onClick={() => setMenu(true)}>
          <Menu size={20} />
        </button>
        <span className="marca-texto">Atende</span>
        {naFila > 0 && <span className="contagem forte">{naFila}</span>}
      </div>
      {menu && <div className="sidebar-fundo" onClick={() => setMenu(false)} />}

      <aside className={`sidebar ${menu ? 'aberta' : ''}`}>
        <div className="marca">
          <span className="marca-icone">
            <MessagesSquare size={17} />
          </span>
          <span className="marca-texto">Atende</span>
        </div>
        <SeletorEmpresa />
        <nav aria-label="Principal">
          {NAV.map(({ to, rotulo, icone: Icone, end, fila: temFila }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenu(false)} className={({ isActive }) => `nav-item ${isActive ? 'on' : ''}`}>
              <Icone size={17} />
              <span>{rotulo}</span>
              {temFila && naFila > 0 && <span className="contagem forte">{naFila}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-rodape">
          <span className={`api-status ${saude.loading ? '' : online ? 'on' : 'off'}`}>
            <i /> {saude.loading ? 'Verificando API' : online ? 'API conectada' : 'API indisponível'}
          </span>
          <button className="btn-icone" aria-label={tema === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'} onClick={alternarTema}>
            {tema === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </aside>

      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  )
}
