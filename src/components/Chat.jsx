import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../api.js'
import Mensagens, { ESTADOS } from './Mensagens.jsx'

export default function Chat({ empresaId, contatoId, canal }) {
  const [mensagens, setMensagens] = useState([])
  const [estado, setEstado] = useState('BOT')
  const [conversaId, setConversaId] = useState(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const seq = useRef(0)

  const sincronizar = useCallback(async () => {
    if (!conversaId) return
    try {
      const c = await api.conversa(empresaId, conversaId)
      setMensagens(c.mensagens)
      setEstado(c.estado)
    } catch {
      /* próxima tentativa */
    }
  }, [empresaId, conversaId])

  // Com atendente humano na conversa, busca as respostas dele periodicamente.
  useEffect(() => {
    if (estado !== 'HUMANO' && estado !== 'AGUARDANDO_HUMANO') return
    const t = setInterval(sincronizar, 3000)
    return () => clearInterval(t)
  }, [estado, sincronizar])

  const enviar = async (e) => {
    e.preventDefault()
    const msg = texto.trim()
    if (!msg || enviando) return
    setTexto('')
    setErro('')
    setEnviando(true)
    const tempId = `tmp-${++seq.current}`
    setMensagens((m) => [...m, { id: tempId, autor: 'CLIENTE', texto: msg }])
    try {
      const r = await api.enviarMensagem({ empresaId, contatoId, canal, texto: msg })
      setConversaId(r.conversaId)
      setEstado(r.estado)
      const c = await api.conversa(empresaId, r.conversaId)
      setMensagens(c.mensagens)
    } catch (err) {
      setMensagens((m) => m.filter((x) => x.id !== tempId))
      setTexto(msg)
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="painel chat">
      <div className="status">
        <span className={`badge ${estado.toLowerCase()}`}>{ESTADOS[estado]}</span>
      </div>
      {mensagens.length === 0 && <p className="vazio">Envie uma mensagem para iniciar a conversa.</p>}
      <Mensagens mensagens={mensagens} digitando={enviando} />
      {erro && <p className="erro">{erro}</p>}
      <form className="entrada" onSubmit={enviar}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={estado === 'ENCERRADA' ? 'Conversa encerrada — envie para abrir outra' : 'Digite sua mensagem…'}
          autoFocus
        />
        <button disabled={enviando || !texto.trim()}>Enviar</button>
      </form>
    </div>
  )
}
