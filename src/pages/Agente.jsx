import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Headset, TicketCheck, Waypoints } from 'lucide-react'
import * as api from '../api.js'
import { Badge, Esqueleto, Falha, PageHeader, Segmented, Spinner, Switch, Vazio } from '../components/ui.jsx'
import { TIPO_SLOT, useQuery, useToast, useWorkspace } from '../lib/util.js'

const PLACEHOLDERS = ['nome', 'empresa', 'numero']
const ordenar = (etapas) => [...etapas].sort((a, b) => a.ordem - b.ordem)

function CartaoEtapa({ etapa, indice, total, empresaId, onAtualizada, onMover, arrasto }) {
  const toast = useToast()
  const [mensagem, setMensagem] = useState(etapa.mensagem)
  const [salvando, setSalvando] = useState(false)
  const campo = useRef(null)
  const linha = useRef(null)
  const alterada = mensagem !== etapa.mensagem

  const atualizar = async (input) => {
    setSalvando(true)
    try {
      const nova = await api.atualizarEtapa(etapa.id, { empresaId, ...input })
      onAtualizada(nova)
      return nova
    } catch (err) {
      toast(err.message, 'erro')
      return null
    } finally {
      setSalvando(false)
    }
  }

  const salvar = async () => {
    if (await atualizar({ mensagem })) toast(`Etapa "${etapa.nome}" salva.`)
  }

  const inserir = (nome) => {
    const el = campo.current
    const trecho = `{{${nome}}}`
    const ini = el?.selectionStart ?? mensagem.length
    const fim = el?.selectionEnd ?? mensagem.length
    setMensagem(mensagem.slice(0, ini) + trecho + mensagem.slice(fim))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(ini + trecho.length, ini + trecho.length)
    })
  }

  return (
    <li
      ref={linha}
      className={`etapa ${etapa.ativa ? '' : 'inativa'} ${arrasto.id === etapa.id ? 'arrastando' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        arrasto.sobre(etapa.id)
      }}
      onDrop={(e) => {
        e.preventDefault()
        arrasto.soltar()
      }}
    >
      <div className="etapa-trilho">
        <span className="etapa-numero">{indice + 1}</span>
      </div>
      <div className="etapa-corpo">
        <header>
          <button
            className="btn-icone alca"
            draggable
            aria-label={`Arrastar ${etapa.nome}`}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', etapa.id)
              if (linha.current) e.dataTransfer.setDragImage(linha.current, 24, 24)
              arrasto.iniciar(etapa.id)
            }}
            onDragEnd={arrasto.cancelar}
          >
            <GripVertical size={16} />
          </button>
          <h3>{etapa.nome}</h3>
          <div className="etapa-marcas">
            {etapa.slot && (
              <Badge>
                {TIPO_SLOT[etapa.slot.tipo]}
                {etapa.slot.obrigatorio ? ' · obrigatório' : ''}
              </Badge>
            )}
            {etapa.efeito === 'handoff' && (
              <Badge tom="warn">
                <Headset size={12} /> Transfere
              </Badge>
            )}
            {etapa.efeito === 'protocolo' && (
              <Badge tom="info">
                <TicketCheck size={12} /> Abre protocolo
              </Badge>
            )}
          </div>
          <div className="etapa-controles">
            <button className="btn-icone" aria-label={`Subir ${etapa.nome}`} disabled={indice === 0} onClick={() => onMover(indice, indice - 1)}>
              <ArrowUp size={15} />
            </button>
            <button className="btn-icone" aria-label={`Descer ${etapa.nome}`} disabled={indice === total - 1} onClick={() => onMover(indice, indice + 1)}>
              <ArrowDown size={15} />
            </button>
            <Switch rotulo={`Etapa ${etapa.nome} ativa`} checked={etapa.ativa} disabled={salvando} onChange={(ativa) => atualizar({ ativa })} />
          </div>
        </header>
        <textarea ref={campo} rows={2} value={mensagem} aria-label={`Mensagem da etapa ${etapa.nome}`} onChange={(e) => setMensagem(e.target.value)} />
        <footer>
          <div className="placeholders">
            {PLACEHOLDERS.map((p) => (
              <button key={p} type="button" className="placeholder mono" onClick={() => inserir(p)}>
                {`{{${p}}}`}
              </button>
            ))}
          </div>
          {alterada && (
            <div className="etapa-salvar">
              <button className="btn btn-sm" onClick={() => setMensagem(etapa.mensagem)}>
                Descartar
              </button>
              <button className="btn btn-sm btn-primario" disabled={salvando || !mensagem.trim()} onClick={salvar}>
                {salvando && <Spinner size={14} />} Salvar
              </button>
            </div>
          )}
        </footer>
      </div>
    </li>
  )
}

export default function Agente() {
  const { empresa } = useWorkspace()
  const toast = useToast()
  const empresaId = empresa.id
  const { data: agentes, loading, error, refetch, setData } = useQuery(() => api.agentes(empresaId))
  const [agenteId, setAgenteId] = useState(null)
  const [arrastandoId, setArrastandoId] = useState(null)
  const original = useRef(null)

  const agente = agentes?.find((a) => a.id === agenteId) ?? agentes?.[0]
  const etapas = agente ? ordenar(agente.etapas) : []

  const trocarEtapas = (novas) =>
    setData((lista) => lista.map((a) => (a.id === agente.id ? { ...a, etapas: novas.map((e, i) => ({ ...e, ordem: i })) } : a)))

  const persistir = async (novas) => {
    try {
      await api.reordenarEtapas({ empresaId, agenteId: agente.id, etapaIds: novas.map((e) => e.id) })
    } catch (err) {
      toast(err.message, 'erro')
      refetch()
    }
  }

  const mover = (de, para) => {
    const novas = [...etapas]
    const [item] = novas.splice(de, 1)
    novas.splice(para, 0, item)
    trocarEtapas(novas)
    persistir(novas)
  }

  const arrasto = {
    id: arrastandoId,
    iniciar: (id) => {
      original.current = etapas
      setArrastandoId(id)
    },
    sobre: (id) => {
      if (!arrastandoId || id === arrastandoId) return
      const novas = [...etapas]
      const de = novas.findIndex((e) => e.id === arrastandoId)
      const para = novas.findIndex((e) => e.id === id)
      const [item] = novas.splice(de, 1)
      novas.splice(para, 0, item)
      trocarEtapas(novas)
    },
    soltar: () => {
      if (!arrastandoId) return
      const mudou = original.current?.some((e, i) => e.id !== etapas[i]?.id)
      setArrastandoId(null)
      original.current = null
      if (mudou) persistir(etapas)
    },
    cancelar: () => {
      if (original.current) trocarEtapas(original.current)
      original.current = null
      setArrastandoId(null)
    },
  }

  const etapaAtualizada = (nova) =>
    setData((lista) => lista.map((a) => (a.id === agente.id ? { ...a, etapas: a.etapas.map((e) => (e.id === nova.id ? { ...e, ...nova } : e)) } : a)))

  return (
    <div className="pagina estreita">
      <PageHeader titulo="Agente" descricao="As etapas que o bot cumpre com o cliente, na ordem. Arraste para reordenar.">
        {agentes?.length > 1 && (
          <Segmented rotulo="Agente" valor={agente?.id} onChange={setAgenteId} opcoes={agentes.map((a) => ({ valor: a.id, rotulo: a.nome }))} />
        )}
      </PageHeader>
      {loading && !agentes ? (
        <Esqueleto linhas={5} altura={120} />
      ) : error && !agentes ? (
        <Falha erro={error} onRetry={refetch} />
      ) : etapas.length === 0 ? (
        <div className="cartao">
          <Vazio icone={Waypoints} titulo="Nenhuma etapa cadastrada" />
        </div>
      ) : (
        <ol className="etapas">
          {etapas.map((e, i) => (
            <CartaoEtapa key={e.id} etapa={e} indice={i} total={etapas.length} empresaId={empresaId} onAtualizada={etapaAtualizada} onMover={mover} arrasto={arrasto} />
          ))}
        </ol>
      )}
    </div>
  )
}
