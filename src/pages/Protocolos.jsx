import { useMemo, useState } from 'react'
import { Headset, Search, TicketCheck } from 'lucide-react'
import * as api from '../api.js'
import { Thread } from '../components/Conversa.jsx'
import { Badge, Esqueleto, Falha, Modal, PageHeader, Segmented, Vazio } from '../components/ui.jsx'
import { dataHora, relativo, STATUS_PROTOCOLO, TIPO_PROTOCOLO, useQuery, useToast, useWorkspace } from '../lib/util.js'

function SeletorStatus({ protocolo, onChange }) {
  return (
    <select
      className={`select-status tom-${STATUS_PROTOCOLO[protocolo.status].tom}`}
      value={protocolo.status}
      aria-label={`Status do protocolo ${protocolo.numero}`}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(protocolo, e.target.value)}
    >
      {Object.entries(STATUS_PROTOCOLO).map(([v, s]) => (
        <option key={v} value={v}>
          {s.rotulo}
        </option>
      ))}
    </select>
  )
}

function Detalhe({ protocolo, empresaId, onStatus, onClose }) {
  const { data: conversa, loading, error } = useQuery(() => api.conversa(empresaId, protocolo.conversaId))
  return (
    <Modal titulo={`Protocolo ${protocolo.numero}`} onClose={onClose} largo>
      <dl className="dados colunas">
        <div>
          <dt>Tipo</dt>
          <dd>{TIPO_PROTOCOLO[protocolo.tipo]}</dd>
        </div>
        <div>
          <dt>Aberto em</dt>
          <dd>{dataHora(protocolo.criadoEm)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <SeletorStatus protocolo={protocolo} onChange={onStatus} />
          </dd>
        </div>
      </dl>
      <h3 className="subtitulo">Descrição</h3>
      <p className="texto-longo">{protocolo.descricao}</p>
      <h3 className="subtitulo">Conversa</h3>
      <div className="thread-caixa">
        {loading ? <Esqueleto linhas={2} /> : error ? <Falha erro={error} /> : <Thread mensagens={conversa.mensagens} />}
      </div>
    </Modal>
  )
}

export default function Protocolos() {
  const { empresa } = useWorkspace()
  const toast = useToast()
  const { data, loading, error, refetch, setData } = useQuery(() => api.protocolos(empresa.id), [], { interval: 15000 })
  const [filtro, setFiltro] = useState('TODOS')
  const [busca, setBusca] = useState('')
  const [abertoId, setAbertoId] = useState(null)

  const todos = useMemo(() => [...(data ?? [])].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)), [data])
  const termo = busca.trim().toLowerCase()
  const visiveis = todos.filter(
    (p) =>
      (filtro === 'TODOS' || p.status === filtro) &&
      (!termo || p.numero.toLowerCase().includes(termo) || p.descricao.toLowerCase().includes(termo)),
  )
  const aberto = todos.find((p) => p.id === abertoId)

  const mudarStatus = async (p, status) => {
    try {
      const novo = await api.atualizarStatusProtocolo(empresa.id, p.id, status)
      setData((lista) => lista.map((x) => (x.id === novo.id ? novo : x)))
      toast(`${p.numero}: ${STATUS_PROTOCOLO[status].rotulo.toLowerCase()}.`)
    } catch (err) {
      toast(err.message, 'erro')
    }
  }

  const opcoes = [
    { valor: 'TODOS', rotulo: 'Todos', contagem: todos.length },
    ...Object.entries(STATUS_PROTOCOLO).map(([valor, s]) => ({
      valor,
      rotulo: s.rotulo,
      contagem: todos.filter((p) => p.status === valor).length,
    })),
  ]

  return (
    <div className="pagina">
      <PageHeader titulo="Protocolos" descricao="Pedidos registrados pelo agente durante as conversas." />
      <div className="barra-filtros">
        <Segmented rotulo="Filtrar por status" valor={filtro} onChange={setFiltro} opcoes={opcoes} />
        <label className="busca">
          <Search size={15} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar número ou descrição" aria-label="Buscar protocolo" />
        </label>
      </div>

      {loading && !data ? (
        <Esqueleto linhas={5} />
      ) : error && !data ? (
        <Falha erro={error} onRetry={refetch} />
      ) : visiveis.length === 0 ? (
        <div className="cartao">
          <Vazio icone={TicketCheck} titulo={todos.length ? 'Nada encontrado' : 'Nenhum protocolo ainda'}>
            {todos.length ? 'Tente outro filtro ou termo de busca.' : 'O protocolo nasce quando a etapa de protocolo do agente é cumprida na conversa.'}
          </Vazio>
        </div>
      ) : (
        <div className="cartao sem-padding">
          <table className="tabela">
            <thead>
              <tr>
                <th>Número</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Aberto</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((p) => (
                <tr key={p.id} tabIndex={0} onClick={() => setAbertoId(p.id)} onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && setAbertoId(p.id)}>
                  <td data-rotulo="Número" className="mono forte">
                    {p.numero}
                  </td>
                  <td data-rotulo="Tipo">
                    <Badge>{TIPO_PROTOCOLO[p.tipo]}</Badge>
                  </td>
                  <td data-rotulo="Descrição" className="celula-descricao">
                    <span className="truncar">{p.descricao}</span>
                    {p.encaminhadoParaHumano && (
                      <small className="encaminhado">
                        <Headset size={12} /> Encaminhado a atendente
                      </small>
                    )}
                  </td>
                  <td data-rotulo="Aberto" className="sem-quebra fraco" title={dataHora(p.criadoEm)}>
                    {relativo(p.criadoEm)}
                  </td>
                  <td data-rotulo="Status">
                    <SeletorStatus protocolo={p} onChange={mudarStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aberto && <Detalhe protocolo={aberto} empresaId={empresa.id} onStatus={mudarStatus} onClose={() => setAbertoId(null)} />}
    </div>
  )
}
