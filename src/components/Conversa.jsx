import { useEffect, useRef } from 'react'
import { Bot, Check, Circle, CircleDot, Headset, User } from 'lucide-react'
import { dataHora, hora } from '../lib/util.js'

const AUTORES = {
  CLIENTE: { nome: 'Cliente', icone: User },
  BOT: { nome: 'Bot', icone: Bot },
  ATENDENTE: { nome: 'Atendente', icone: Headset },
}

// lado: quem aparece à direita. O cliente vê a si mesmo; o atendente vê bot e atendente.
export function Thread({ mensagens, lado = ['CLIENTE'], digitando }) {
  const caixa = useRef(null)

  useEffect(() => {
    const el = caixa.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [mensagens.length, digitando])

  return (
    <div className="thread" ref={caixa} aria-live="polite">
      {mensagens.map((m, i) => {
        const { nome, icone: Icone } = AUTORES[m.autor]
        const novoBloco = mensagens[i - 1]?.autor !== m.autor
        const direita = lado.includes(m.autor)
        return (
          <div key={m.id} className={`linha ${direita ? 'direita' : ''} ${novoBloco ? 'novo-bloco' : ''}`}>
            {!direita && (
              <span className={`avatar autor-${m.autor.toLowerCase()} ${novoBloco ? '' : 'oculto'}`}>
                <Icone size={15} />
              </span>
            )}
            <div className={`balao autor-${m.autor.toLowerCase()}`}>
              {novoBloco && <span className="balao-autor">{nome}</span>}
              <p>{m.texto}</p>
              {m.criadoEm && <time title={dataHora(m.criadoEm)}>{hora(m.criadoEm)}</time>}
            </div>
          </div>
        )
      })}
      {digitando && (
        <div className="linha novo-bloco">
          <span className="avatar autor-bot">
            <Bot size={15} />
          </span>
          <div className="balao autor-bot digitando" aria-label="Bot digitando">
            <i />
            <i />
            <i />
          </div>
        </div>
      )}
    </div>
  )
}

export function DadosColetados({ conversa, etapas }) {
  const valores = conversa?.valoresSlot ?? {}
  const entradas = Object.entries(valores).filter(([, v]) => v !== null && v !== '')
  if (entradas.length === 0) return <p className="texto-fraco">Nada coletado ainda.</p>

  // A API guarda os valores pelo nome do slot; a etapa tem o rótulo legível.
  const nomes = {}
  etapas?.forEach((e) => {
    if (e.slot) nomes[e.slot.nome] = e.nome
  })
  return (
    <dl className="dados">
      {entradas.map(([k, v]) => (
        <div key={k}>
          <dt>{nomes[k] ?? k}</dt>
          <dd>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Jornada({ conversa, etapas }) {
  const ativas = (etapas ?? []).filter((e) => e.ativa).sort((a, b) => a.ordem - b.ordem)
  if (ativas.length === 0) return <p className="texto-fraco">Nenhuma etapa ativa.</p>
  const cumpridas = conversa?.etapasCumpridas ?? []
  const valores = conversa?.valoresSlot ?? {}
  return (
    <ol className="jornada">
      {ativas.map((e) => {
        // etapasCumpridas só registra etapas com efeito; slot conta como feito ao ter valor.
        const feita = cumpridas.includes(e.id) || (e.slot && valores[e.slot.nome] != null)
        const atual = conversa?.etapaAtualId === e.id
        const Icone = feita ? Check : atual ? CircleDot : Circle
        return (
          <li key={e.id} className={feita ? 'feita' : atual ? 'atual' : ''}>
            <Icone size={14} />
            <span>{e.nome}</span>
          </li>
        )
      })}
    </ol>
  )
}
