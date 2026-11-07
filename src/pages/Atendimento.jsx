import { useEffect, useState } from 'react'
import { ArrowLeft, Bot, CheckCheck, Headset, Inbox, Info, Send } from 'lucide-react'
import * as api from '../api.js'
import { DadosColetados, Thread } from '../components/Conversa.jsx'
import { Badge, Confirmar, Esqueleto, Falha, Segmented, Vazio } from '../components/ui.jsx'
import {
  dataHora,
  ESTADOS,
  gravar,
  iniciais,
  ler,
  relativo,
  STATUS_PROTOCOLO,
  TIPO_PROTOCOLO,
  useQuery,
  useToast,
  useWorkspace,
} from '../lib/util.js'

export default function Atendimento() {
  const { empresa } = useWorkspace()
  const toast = useToast()
  const empresaId = empresa.id
  const chave = `chatbot-atendimentos:${empresaId}`

  const [aba, setAba] = useState('fila')
  const [selecionadaId, setSelecionadaId] = useState(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [detalhes, setDetalhes] = useState(false)
  const [encerrando, setEncerrando] = useState(false)

  // A API só lista conversas em AGUARDANDO_HUMANO. Depois da primeira resposta a conversa
  // vira HUMANO e sai dessa lista, então este navegador guarda quais está atendendo.
  const [assumidas, setAssumidas] = useState(() => ler(chave, []))
  useEffect(() => gravar(chave, assumidas), [chave, assumidas])

  const { data, loading, error, refetch } = useQuery(
    async () => {
      const [fila, resultados] = await Promise.all([
        api.conversasAguardandoHumano(empresaId),
        Promise.allSettled(assumidas.map((id) => api.conversa(empresaId, id))),
      ])
      const atendendo = resultados
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value)
        .filter((c) => c.estado === 'HUMANO')
      return { fila, atendendo }
    },
    [assumidas],
    { interval: 4000 },
  )

  const fila = data?.fila ?? []
  const atendendo = data?.atendendo ?? []
  const lista = aba === 'fila' ? fila : atendendo
  const atual = [...fila, ...atendendo].find((c) => c.id === selecionadaId) ?? null

  const { data: protocolos } = useQuery(() => (selecionadaId ? api.protocolos(empresaId) : Promise.resolve([])), [selecionadaId])
  const { data: agentes } = useQuery(() => api.agentes(empresaId))
  const vinculados = (protocolos ?? []).filter((p) => p.conversaId === selecionadaId)
  const etapas = agentes?.flatMap((a) => a.etapas)

  const responder = async (e) => {
    e.preventDefault()
    const msg = texto.trim()
    if (!msg || !atual || enviando) return
    setEnviando(true)
    setTexto('')
    try {
      await api.responderComoAtendente(empresaId, atual.id, msg)
      setAssumidas((a) => (a.includes(atual.id) ? a : [...a, atual.id]))
      setAba('atendendo')
      await refetch()
    } catch (err) {
      setTexto(msg)
      toast(err.message, 'erro')
    } finally {
      setEnviando(false)
    }
  }

  const soltar = (id) => {
    setAssumidas((a) => a.filter((x) => x !== id))
    setSelecionadaId(null)
  }

  const devolver = async () => {
    try {
      await api.devolverConversaAoBot(empresaId, atual.id)
      soltar(atual.id)
      toast('Conversa devolvida ao bot.')
    } catch (err) {
      toast(err.message, 'erro')
    }
  }

  const encerrar = async () => {
    try {
      await api.encerrarConversa(empresaId, atual.id)
      soltar(atual.id)
      setEncerrando(false)
      toast('Conversa encerrada.')
    } catch (err) {
      toast(err.message, 'erro')
    }
  }

  return (
    <div className={`tela-cheia inbox ${atual ? 'com-selecao' : ''} ${detalhes ? 'com-detalhes' : ''}`}>
      <section className="inbox-lista">
        <header>
          <h1>Atendimento</h1>
          <Segmented
            rotulo="Filtrar conversas"
            valor={aba}
            onChange={setAba}
            opcoes={[
              { valor: 'fila', rotulo: 'Na fila', contagem: fila.length },
              { valor: 'atendendo', rotulo: 'Comigo', contagem: atendendo.length },
            ]}
          />
        </header>
        {loading && !data ? (
          <Esqueleto linhas={4} altura={60} />
        ) : error && !data ? (
          <Falha erro={error} onRetry={refetch} />
        ) : lista.length === 0 ? (
          <Vazio icone={Inbox} titulo={aba === 'fila' ? 'Fila vazia' : 'Nenhuma conversa com você'}>
            {aba === 'fila' ? 'Conversas transferidas pelo bot aparecem aqui.' : 'Responda uma conversa da fila para assumir.'}
          </Vazio>
        ) : (
          <ul className="conversas">
            {lista.map((c) => (
              <li key={c.id}>
                <button className={c.id === selecionadaId ? 'on' : ''} onClick={() => setSelecionadaId(c.id)}>
                  <span className="avatar">{iniciais(c.contatoId)}</span>
                  <span className="conversa-info">
                    <span className="conversa-linha">
                      <strong className="truncar">{c.contatoId}</strong>
                      <small className="sem-quebra">{relativo(c.ultimaMensagemEm)}</small>
                    </span>
                    <small className="truncar">{c.mensagens.at(-1)?.texto ?? 'Sem mensagens'}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="painel-chat inbox-thread">
        {!atual ? (
          <Vazio icone={Headset} titulo="Selecione uma conversa">
            Sua primeira resposta assume o atendimento.
          </Vazio>
        ) : (
          <>
            <header className="chat-topo">
              <button className="btn-icone so-movel" aria-label="Voltar" onClick={() => setSelecionadaId(null)}>
                <ArrowLeft size={18} />
              </button>
              <div className="chat-topo-titulo">
                <h2 className="truncar">{atual.contatoId}</h2>
                <Badge tom={ESTADOS[atual.estado].tom}>{ESTADOS[atual.estado].rotulo}</Badge>
              </div>
              <div className="chat-acoes">
                <button className="btn btn-sm" onClick={devolver}>
                  <Bot size={15} /> <span className="esconde-pequeno">Devolver ao bot</span>
                </button>
                <button className="btn btn-sm" onClick={() => setEncerrando(true)}>
                  <CheckCheck size={15} /> <span className="esconde-pequeno">Encerrar</span>
                </button>
                <button className="btn-icone so-medio" aria-label="Detalhes" aria-pressed={detalhes} onClick={() => setDetalhes((d) => !d)}>
                  <Info size={18} />
                </button>
              </div>
            </header>
            <Thread mensagens={atual.mensagens} lado={['ATENDENTE', 'BOT']} />
            <form className="composer" onSubmit={responder}>
              <textarea
                rows={1}
                value={texto}
                aria-label="Resposta"
                placeholder={atual.estado === 'HUMANO' ? 'Escreva uma resposta…' : 'Responda para assumir o atendimento…'}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) responder(e)
                }}
              />
              <button className="btn btn-primario btn-enviar" aria-label="Enviar" disabled={enviando || !texto.trim()}>
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </section>

      {atual && (
        <aside className="painel-lateral inbox-detalhes">
          <section>
            <h2>Contato</h2>
            <dl className="dados">
              <div>
                <dt>Identificador</dt>
                <dd>{atual.contatoId}</dd>
              </div>
              <div>
                <dt>Canal</dt>
                <dd>{atual.canal}</dd>
              </div>
              <div>
                <dt>Início</dt>
                <dd>{dataHora(atual.criadoEm)}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h2>Dados coletados</h2>
            <DadosColetados conversa={atual} etapas={etapas} />
          </section>
          <section>
            <h2>Protocolos</h2>
            {vinculados.length === 0 ? (
              <p className="texto-fraco">Nenhum nesta conversa.</p>
            ) : (
              <ul className="lista">
                {vinculados.map((p) => (
                  <li key={p.id}>
                    <div>
                      <strong className="mono">{p.numero}</strong>
                      <small>{TIPO_PROTOCOLO[p.tipo]}</small>
                    </div>
                    <Badge tom={STATUS_PROTOCOLO[p.status].tom}>{STATUS_PROTOCOLO[p.status].rotulo}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      )}

      {encerrando && (
        <Confirmar titulo="Encerrar conversa" rotulo="Encerrar" onConfirm={encerrar} onClose={() => setEncerrando(false)}>
          <p>
            A conversa com <strong>{atual?.contatoId}</strong> será encerrada. Se o cliente escrever de novo, uma nova conversa é aberta.
          </p>
        </Confirmar>
      )}
    </div>
  )
}
