import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  BookOpen,
  ChevronsUpDown,
  Copy,
  Headset,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Moon,
  Settings2,
  Sun,
  TicketCheck,
  Waypoints,
} from 'lucide-react'
import * as api from '../api.js'
import { gravar, iniciais, ler, useCredencial, useQuery, useToast, useWorkspace } from '../lib/util.js'
import Login from '../pages/Login.jsx'
import ConectarOpenAI from './ConectarOpenAI.jsx'
import { Spinner } from './ui.jsx'

function ContaMenu() {
  const { empresa, usuario, sair } = useWorkspace()
  const toast = useToast()
  const [aberto, setAberto] = useState(false)
  const raiz = useRef(null)

  useEffect(() => {
    if (!aberto) return undefined
    const fechar = (e) => !raiz.current?.contains(e.target) && setAberto(false)
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [aberto])

  // O ID ainda é usado por quem integra o canal de atendimento (enviarMensagem).
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(empresa.id)
      toast('ID da empresa copiado.')
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
          <p className="fraco truncar" style={{ padding: '4px 6px', fontSize: 12 }} title={usuario.email}>
            {usuario.email}
          </p>
          <hr />
          <button className="seletor-acao" onClick={copiar}>
            <Copy size={15} /> Copiar ID da empresa
          </button>
          <button className="seletor-acao" onClick={sair}>
            <LogOut size={15} /> Sair
          </button>
        </div>
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

function ModeloConectado() {
  const { llm, credencial, desconectar } = useCredencial()
  if (llm.modo === 'servidor') {
    return (
      <div className={`modelo-conectado ${llm.servidorConfigurado ? '' : 'alerta'}`}>
        <KeyRound size={15} />
        <span className="truncar mono" title={llm.modelo ?? ''}>
          {llm.servidorConfigurado ? llm.modelo : 'Chave do servidor ausente'}
        </span>
      </div>
    )
  }
  return (
    <div className="modelo-conectado">
      <KeyRound size={15} />
      <span className="truncar mono" title={credencial.model}>
        {credencial.model}
      </span>
      <button className="link" onClick={desconectar}>
        Trocar
      </button>
    </div>
  )
}

function SemApi({ erro, onRetry }) {
  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <span className="marca-icone grande">
          <MessagesSquare size={24} />
        </span>
        <h1>Não foi possível falar com a API</h1>
        <p>{erro?.message ?? 'Confira se a API está no ar e tente de novo.'}</p>
        <button className="btn btn-primario" onClick={onRetry}>
          Tentar de novo
        </button>
      </div>
    </div>
  )
}

export default function Layout() {
  const { estado, erro, recarregar: recarregarSessao, empresa } = useWorkspace()
  const { llm, recarregar, credencial } = useCredencial()
  if (llm.estado === 'carregando' || estado === 'carregando') {
    return (
      <div className="onboarding" aria-busy="true">
        <Spinner size={22} />
      </div>
    )
  }
  if (llm.estado === 'erro') return <SemApi erro={llm.erro} onRetry={recarregar} />
  if (estado === 'erro') return <SemApi erro={erro} onRetry={recarregarSessao} />
  if (estado === 'anonimo' || !empresa) return <Login />
  if (llm.modo === 'cliente' && !credencial) return <ConectarOpenAI />
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
        <ContaMenu />
        <nav aria-label="Principal">
          {NAV.map(({ to, rotulo, icone: Icone, end, fila: temFila }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenu(false)} className={({ isActive }) => `nav-item ${isActive ? 'on' : ''}`}>
              <Icone size={17} />
              <span>{rotulo}</span>
              {temFila && naFila > 0 && <span className="contagem forte">{naFila}</span>}
            </NavLink>
          ))}
        </nav>
        <ModeloConectado />
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
