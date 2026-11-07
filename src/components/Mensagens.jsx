import { useEffect, useRef } from 'react'

const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export const ESTADOS = {
  BOT: 'Bot',
  AGUARDANDO_HUMANO: 'Aguardando atendente',
  HUMANO: 'Com atendente',
  ENCERRADA: 'Encerrada',
}

export default function Mensagens({ mensagens, digitando, ladoCliente = 'CLIENTE' }) {
  const fim = useRef(null)
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, digitando])

  return (
    <div className="mensagens">
      {mensagens.map((m) => (
        <div key={m.id} className={`msg ${m.autor === ladoCliente ? 'minha' : 'outra'} ${m.autor.toLowerCase()}`}>
          <span className="autor">{m.autor === 'CLIENTE' ? 'Cliente' : m.autor === 'BOT' ? 'Bot' : 'Atendente'}</span>
          <p>{m.texto}</p>
          {m.criadoEm && <time>{hora(m.criadoEm)}</time>}
        </div>
      ))}
      {digitando && <div className="msg outra bot digitando">Digitando…</div>}
      <div ref={fim} />
    </div>
  )
}
