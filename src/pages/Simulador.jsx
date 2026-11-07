import { useCallback, useEffect, useRef, useState } from 'react'
import { Headset, Info, MessageSquarePlus, Send } from 'lucide-react'
import * as api from '../api.js'
import { DadosColetados, Jornada, Thread } from '../components/Conversa.jsx'
import { Badge, Campo } from '../components/ui.jsx'
import { ESTADOS, gravar, ler, useQuery, useToast, useWorkspace } from '../lib/util.js'

const SUGESTOES = ['Olá, tudo bem?', 'Qual o horário de atendimento?', 'Quero registrar uma reclamação', 'Quero falar com um atendente']

const novoContato = () => `visitante-${Math.random().toString(36).slice(2, 8)}`

export default function Simulador() {
  const { empresa } = useWorkspace()
  const toast = useToast()
  const empresaId = empresa.id
  const chave = `chatbot-simulador:${empresaId}`

  const [sessao, setSessao] = useState(() => ler(chave, { contatoId: novoContato(), canal: 'web', conversaId: null }))
  const [conversa, setConversa] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [detalhes, setDetalhes] = useState(false)
  const seq = useRef(0)
  const entrada = useRef(null)

  const { data: agentes } = useQuery(() => api.agentes(empresaId))
  const etapas = (agentes?.find((a) => a.id === conversa?.agenteId) ?? agentes?.[0])?.etapas

  useEffect(() => gravar(chave, sessao), [chave, sessao])

  const sincronizar = useCallback(
    async (id) => {
      const c = await api.conversa(empresaId, id)
      setConversa(c)
      setMensagens(c.mensagens)
    },
    [empresaId],
  )

  // Retoma a conversa salva ao abrir a página.
  useEffect(() => {
    if (!sessao.conversaId) return
    sincronizar(sessao.conversaId).catch(() => setSessao((s) => ({ ...s, conversaId: null })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao.conversaId === null])

  // Com atendente na conversa, as respostas chegam por fora deste envio.
  const estado = conversa?.estado ?? 'BOT'
  const comHumano = estado === 'HUMANO' || estado === 'AGUARDANDO_HUMANO'
  useEffect(() => {
    if (!comHumano || !sessao.conversaId) return undefined
    const t = setInterval(() => sincronizar(sessao.conversaId).catch(() => {}), 3000)
    return () => clearInterval(t)
  }, [comHumano, sessao.conversaId, sincronizar])

  const enviar = async (bruto) => {
    const msg = bruto.trim()
    if (!msg || enviando) return
    setTexto('')
    setEnviando(true)
    const tempId = `tmp-${++seq.current}`
    setMensagens((m) => [...m, { id: tempId, autor: 'CLIENTE', texto: msg }])
    let r
    try {
      r = await api.enviarMensagem({ empresaId, contatoId: sessao.contatoId, canal: sessao.canal, texto: msg })
    } catch (err) {
      setMensagens((m) => m.filter((x) => x.id !== tempId))
      setTexto(msg)
      toast(err.message, 'erro')
      setEnviando(false)
      return
    }
    // A mensagem já foi gravada: falha daqui em diante não pode devolver o texto ao campo.
    setSessao((s) => ({ ...s, conversaId: r.conversaId }))
    try {
      await sincronizar(r.conversaId)
    } catch {
      if (r.resposta) setMensagens((m) => [...m, r.resposta])
    }
    setEnviando(false)
    entrada.current?.focus()
  }

  const recomecar = (patch) => {
    setSessao((s) => ({ ...s, ...patch, conversaId: null }))
    setConversa(null)
    setMensagens([])
  }

  const chamarAtendente = async () => {
    try {
      await api.transferirParaHumano(empresaId, sessao.conversaId)
      await sincronizar(sessao.conversaId)
      toast('Conversa enviada para a fila de atendimento.')
    } catch (err) {
      toast(err.message, 'erro')
    }
  }

  return (
    <div className={`tela-cheia dividida ${detalhes ? 'com-detalhes' : ''}`}>
      <section className="painel-chat">
        <header className="chat-topo">
          <div>
            <h1>Simulador</h1>
            <small>Converse como um cliente de {empresa.nome}</small>
          </div>
          <div className="chat-acoes">
            <Badge tom={ESTADOS[estado].tom}>{ESTADOS[estado].rotulo}</Badge>
            <button className="btn-icone so-medio" aria-label="Sessão e jornada" aria-pressed={detalhes} onClick={() => setDetalhes((d) => !d)}>
              <Info size={18} />
            </button>
          </div>
        </header>

        {mensagens.length === 0 ? (
          <div className="chat-vazio">
            <h2>Teste o seu agente</h2>
            <p>As mensagens passam pelo atendimento real da API e ficam gravadas nesta empresa.</p>
            <div className="sugestoes">
              {SUGESTOES.map((s) => (
                <button key={s} className="sugestao" disabled={enviando} onClick={() => enviar(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Thread mensagens={mensagens} digitando={enviando && estado === 'BOT'} />
        )}

        {estado === 'ENCERRADA' && <p className="aviso-chat">Conversa encerrada. A próxima mensagem abre uma nova.</p>}
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault()
            enviar(texto)
          }}
        >
          <textarea
            ref={entrada}
            rows={1}
            value={texto}
            aria-label="Mensagem"
            placeholder="Escreva uma mensagem…"
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                enviar(texto)
              }
            }}
          />
          <button className="btn btn-primario btn-enviar" aria-label="Enviar" disabled={enviando || !texto.trim()}>
            <Send size={16} />
          </button>
        </form>
      </section>

      <aside className="painel-lateral">
        <section>
          <h2>Sessão</h2>
          <Campo rotulo="Contato">
            {(id) => (
              <input
                id={id}
                className="mono"
                value={sessao.contatoId}
                onChange={(e) => recomecar({ contatoId: e.target.value })}
              />
            )}
          </Campo>
          <Campo rotulo="Canal">
            {(id) => <input id={id} value={sessao.canal} onChange={(e) => recomecar({ canal: e.target.value })} />}
          </Campo>
          <div className="pilha-botoes">
            <button className="btn" onClick={() => recomecar({ contatoId: novoContato() })}>
              <MessageSquarePlus size={15} /> Nova conversa
            </button>
            <button className="btn" disabled={!sessao.conversaId || estado !== 'BOT'} onClick={chamarAtendente}>
              <Headset size={15} /> Chamar atendente
            </button>
          </div>
        </section>
        <section>
          <h2>Jornada do agente</h2>
          <Jornada conversa={conversa} etapas={etapas} />
        </section>
        <section>
          <h2>Dados coletados</h2>
          <DadosColetados conversa={conversa} etapas={etapas} />
        </section>
      </aside>
    </div>
  )
}
