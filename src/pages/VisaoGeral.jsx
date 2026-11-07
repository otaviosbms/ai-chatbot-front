import { Link } from 'react-router-dom'
import { ArrowUpRight, BookOpen, FileText, Headset, Inbox, TicketCheck, Waypoints } from 'lucide-react'
import * as api from '../api.js'
import { Badge, Esqueleto, Falha, PageHeader, Vazio } from '../components/ui.jsx'
import { relativo, STATUS_PROTOCOLO, TIPO_PROTOCOLO, useQuery, useWorkspace } from '../lib/util.js'

const MODULOS = {
  ATENDIMENTO_GERAL: 'Atendimento geral',
  SAC: 'SAC e protocolos',
  TRANSFERENCIA_HUMANA: 'Transferência humana',
  BASE_CONHECIMENTO: 'Base de conhecimento',
}

function Indicador({ to, icone: Icone, rotulo, valor, detalhe, destaque }) {
  return (
    <Link to={to} className={`indicador ${destaque ? 'destaque' : ''}`}>
      <span className="indicador-topo">
        <Icone size={15} /> {rotulo}
        <ArrowUpRight size={14} className="indicador-seta" />
      </span>
      <strong>{valor}</strong>
      <small>{detalhe}</small>
    </Link>
  )
}

function BarraProtocolos({ protocolos }) {
  const total = protocolos.length
  if (total === 0) return <p className="texto-fraco">Nenhum protocolo aberto até agora.</p>
  const partes = Object.entries(STATUS_PROTOCOLO).map(([status, s]) => ({
    status,
    ...s,
    qtd: protocolos.filter((p) => p.status === status).length,
  }))
  return (
    <div>
      <div className="barra" role="img" aria-label={partes.map((p) => `${p.rotulo}: ${p.qtd}`).join(', ')}>
        {partes
          .filter((p) => p.qtd > 0)
          .map((p) => (
            <span
              key={p.status}
              className={`barra-parte serie-${p.tom}`}
              style={{ flexGrow: p.qtd }}
              data-tip={`${p.rotulo}: ${p.qtd} de ${total}`}
            />
          ))}
      </div>
      <ul className="legenda">
        {partes.map((p) => (
          <li key={p.status}>
            <i className={`serie-${p.tom}`} />
            {p.rotulo}
            <strong>{p.qtd}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function VisaoGeral() {
  const { empresa } = useWorkspace()
  const id = empresa.id
  const { data, loading, error, refetch } = useQuery(
    async () => {
      const [fila, protocolos, artigos, documentos, agentes, configuracoes] = await Promise.all([
        api.conversasAguardandoHumano(id),
        api.protocolos(id),
        api.artigos(id),
        api.documentos(id),
        api.agentes(id),
        api.configuracoes(id),
      ])
      return { fila, protocolos, artigos, documentos, agentes, configuracoes }
    },
    [],
    { interval: 15000 },
  )

  if (loading && !data)
    return (
      <div className="pagina">
        <PageHeader titulo="Visão geral" />
        <Esqueleto linhas={4} altura={84} />
      </div>
    )
  if (!data)
    return (
      <div className="pagina">
        <PageHeader titulo="Visão geral" />
        <Falha erro={error} onRetry={refetch} />
      </div>
    )

  const { fila, protocolos, artigos, documentos, agentes, configuracoes } = data
  const pendentes = protocolos.filter((p) => p.status !== 'RESOLVIDO').length
  const etapas = agentes.flatMap((a) => a.etapas)
  const recentes = [...protocolos].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).slice(0, 5)

  return (
    <div className="pagina">
      <PageHeader titulo={empresa.nome} descricao="O que precisa da sua atenção agora." />

      <section className="indicadores" aria-label="Indicadores">
        <Indicador
          to="/atendimento"
          icone={Headset}
          rotulo="Na fila"
          valor={fila.length}
          detalhe={fila.length ? `Mais antiga ${relativo(fila[fila.length - 1].ultimaMensagemEm)}` : 'Ninguém esperando'}
          destaque={fila.length > 0}
        />
        <Indicador
          to="/protocolos"
          icone={TicketCheck}
          rotulo="Protocolos pendentes"
          valor={pendentes}
          detalhe={`${protocolos.length} no total`}
        />
        <Indicador
          to="/conhecimento"
          icone={BookOpen}
          rotulo="Artigos ativos"
          valor={artigos.filter((a) => a.ativo).length}
          detalhe={`${artigos.length} cadastrados`}
        />
        <Indicador
          to="/conhecimento"
          icone={FileText}
          rotulo="Documentos prontos"
          valor={documentos.filter((d) => d.status === 'PRONTO').length}
          detalhe={`${documentos.length} enviados`}
        />
        <Indicador
          to="/agente"
          icone={Waypoints}
          rotulo="Etapas ativas"
          valor={etapas.filter((e) => e.ativa).length}
          detalhe={`de ${etapas.length} no agente`}
        />
      </section>

      <div className="grade-2">
        <section className="cartao">
          <header className="cartao-topo">
            <h2>Fila de atendimento</h2>
            <Link to="/atendimento" className="link">
              Abrir
            </Link>
          </header>
          {fila.length === 0 ? (
            <Vazio icone={Inbox} titulo="Fila vazia">
              Quando o bot transferir uma conversa, ela aparece aqui.
            </Vazio>
          ) : (
            <ul className="lista">
              {fila.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <div>
                    <strong>{c.contatoId}</strong>
                    <small className="truncar">{c.mensagens.at(-1)?.texto}</small>
                  </div>
                  <small className="sem-quebra">{relativo(c.ultimaMensagemEm)}</small>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cartao">
          <header className="cartao-topo">
            <h2>Protocolos por status</h2>
            <Link to="/protocolos" className="link">
              Ver todos
            </Link>
          </header>
          <BarraProtocolos protocolos={protocolos} />
          {recentes.length > 0 && (
            <ul className="lista com-margem">
              {recentes.map((p) => (
                <li key={p.id}>
                  <div>
                    <strong className="mono">{p.numero}</strong>
                    <small className="truncar">
                      {TIPO_PROTOCOLO[p.tipo]} · {p.descricao}
                    </small>
                  </div>
                  <Badge tom={STATUS_PROTOCOLO[p.status].tom}>{STATUS_PROTOCOLO[p.status].rotulo}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="cartao">
        <header className="cartao-topo">
          <h2>Módulos</h2>
          <Link to="/configuracoes" className="link">
            Configurar
          </Link>
        </header>
        <ul className="modulos">
          {configuracoes.map((c) => (
            <li key={c.id}>
              <span>{MODULOS[c.modulo] ?? c.modulo}</span>
              <Badge tom={c.ativo ? 'good' : 'neutral'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
