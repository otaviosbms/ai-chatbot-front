import { useCallback, useEffect, useState } from 'react'
import * as api from '../api.js'
import Mensagens, { ESTADOS } from './Mensagens.jsx'

export default function Atendente({ empresaId }) {
  const [fila, setFila] = useState([])
  const [selecionada, setSelecionada] = useState(null)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    try {
      const lista = await api.conversasAguardandoHumano(empresaId)
      setFila(lista)
      setErro('')
      setSelecionada((id) => (id && lista.some((c) => c.id === id) ? id : null))
    } catch (err) {
      setErro(err.message)
    }
  }, [empresaId])

  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 4000)
    return () => clearInterval(t)
  }, [carregar])

  const atual = fila.find((c) => c.id === selecionada)

  const executar = async (fn) => {
    try {
      await fn()
      setErro('')
      await carregar()
    } catch (err) {
      setErro(err.message)
    }
  }

  const responder = (e) => {
    e.preventDefault()
    const msg = texto.trim()
    if (!msg || !atual) return
    setTexto('')
    executar(() => api.responderComoAtendente(empresaId, atual.id, msg))
  }

  return (
    <div className="atendente">
      <aside className="painel fila">
        <h2>Fila de atendimento</h2>
        {fila.length === 0 && <p className="vazio">Nenhuma conversa aguardando.</p>}
        {fila.map((c) => (
          <button
            key={c.id}
            className={`item ${c.id === selecionada ? 'ativo' : ''}`}
            onClick={() => setSelecionada(c.id)}
          >
            <strong>{c.contatoId}</strong>
            <small>
              {c.canal} · {ESTADOS[c.estado]}
            </small>
          </button>
        ))}
      </aside>

      <section className="painel chat">
        {!atual ? (
          <p className="vazio">Selecione uma conversa.</p>
        ) : (
          <>
            <div className="status">
              <span className={`badge ${atual.estado.toLowerCase()}`}>{ESTADOS[atual.estado]}</span>
              <span className="acoes">
                <button className="secundario" onClick={() => executar(() => api.devolverConversaAoBot(empresaId, atual.id))}>
                  Devolver ao bot
                </button>
                <button className="perigo" onClick={() => executar(() => api.encerrarConversa(empresaId, atual.id))}>
                  Encerrar
                </button>
              </span>
            </div>
            <Mensagens mensagens={atual.mensagens} ladoCliente="ATENDENTE" />
            <form className="entrada" onSubmit={responder}>
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Responder como atendente…" />
              <button disabled={!texto.trim()}>Enviar</button>
            </form>
          </>
        )}
        {erro && <p className="erro">{erro}</p>}
      </section>
    </div>
  )
}
