import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, RefreshCw, X } from 'lucide-react'

export function PageHeader({ titulo, descricao, children }) {
  return (
    <header className="page-header">
      <div>
        <h1>{titulo}</h1>
        {descricao && <p>{descricao}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  )
}

export function Badge({ tom = 'neutral', children }) {
  return <span className={`badge tom-${tom}`}>{children}</span>
}

export function Vazio({ icone: Icone, titulo, children }) {
  return (
    <div className="vazio">
      {Icone && (
        <span className="vazio-icone">
          <Icone size={20} />
        </span>
      )}
      <strong>{titulo}</strong>
      {children && <div className="vazio-texto">{children}</div>}
    </div>
  )
}

export function Falha({ erro, onRetry }) {
  return (
    <div className="falha" role="alert">
      <AlertTriangle size={18} />
      <span>{erro?.message ?? 'Algo deu errado.'}</span>
      {onRetry && (
        <button className="btn btn-sm" onClick={onRetry}>
          <RefreshCw size={14} /> Tentar de novo
        </button>
      )}
    </div>
  )
}

export function Esqueleto({ linhas = 3, altura = 56 }) {
  return (
    <div className="esqueleto" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="esqueleto-linha" style={{ height: altura }} />
      ))}
    </div>
  )
}

export const Spinner = ({ size = 16 }) => <Loader2 size={size} className="gira" aria-hidden="true" />

export function Switch({ checked, onChange, disabled, rotulo }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rotulo}
      disabled={disabled}
      className={`switch ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  )
}

export function Segmented({ valor, onChange, opcoes, rotulo }) {
  return (
    <div className="segmented" role="tablist" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="tab"
          aria-selected={valor === o.valor}
          className={valor === o.valor ? 'on' : ''}
          onClick={() => onChange(o.valor)}
        >
          {o.rotulo}
          {o.contagem != null && <span className="contagem">{o.contagem}</span>}
        </button>
      ))}
    </div>
  )
}

export function Campo({ rotulo, ajuda, children }) {
  const id = useId()
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      {typeof children === 'function' ? children(id) : children}
      {ajuda && <small>{ajuda}</small>}
    </div>
  )
}

export function TagInput({ valor, onChange, placeholder, id }) {
  const [texto, setTexto] = useState('')

  const confirmar = () => {
    const novo = texto.trim().replace(/,$/, '')
    if (novo && !valor.includes(novo)) onChange([...valor, novo])
    setTexto('')
  }

  return (
    <div className="tags-input">
      {valor.map((t) => (
        <span key={t} className="tag">
          {t}
          <button type="button" aria-label={`Remover ${t}`} onClick={() => onChange(valor.filter((x) => x !== t))}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={texto}
        placeholder={valor.length ? '' : placeholder}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            confirmar()
          } else if (e.key === 'Backspace' && !texto && valor.length) {
            onChange(valor.slice(0, -1))
          }
        }}
      />
    </div>
  )
}

export function Modal({ titulo, onClose, children, rodape, largo }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${largo ? 'largo' : ''}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <header>
          <h2>{titulo}</h2>
          <button className="btn-icone" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="modal-corpo">{children}</div>
        {rodape && <footer>{rodape}</footer>}
      </div>
    </div>,
    document.body,
  )
}

export function Confirmar({ titulo, children, rotulo = 'Confirmar', perigo, onConfirm, onClose }) {
  const [enviando, setEnviando] = useState(false)
  const executar = async () => {
    setEnviando(true)
    try {
      await onConfirm()
    } finally {
      setEnviando(false)
    }
  }
  return (
    <Modal
      titulo={titulo}
      onClose={onClose}
      rodape={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className={`btn ${perigo ? 'btn-perigo' : 'btn-primario'}`} disabled={enviando} onClick={executar}>
            {enviando && <Spinner />} {rotulo}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
