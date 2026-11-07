import { useState } from 'react'
import { Bot, Plus, Trash2 } from 'lucide-react'
import * as api from '../api.js'
import { Campo, Esqueleto, Falha, PageHeader, Segmented, Spinner, Switch, TagInput } from '../components/ui.jsx'
import { TIPO_PROTOCOLO, useQuery, useToast, useWorkspace } from '../lib/util.js'

const MODULOS = [
  { id: 'ATENDIMENTO_GERAL', rotulo: 'Atendimento', descricao: 'Quem é o bot e como ele fala.', obrigatorio: true },
  { id: 'SAC', rotulo: 'SAC', descricao: 'Mensagens e regras dos protocolos.' },
  { id: 'TRANSFERENCIA_HUMANA', rotulo: 'Transferência', descricao: 'Quando chamar um atendente e em que horário.', obrigatorio: true },
  { id: 'BASE_CONHECIMENTO', rotulo: 'Conhecimento', descricao: 'Como o bot busca informação nos artigos.', obrigatorio: true },
]

const PERIODOS = {
  todos: 'Todos os dias',
  'seg-sex': 'Segunda a sexta',
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
  dom: 'Domingo',
}

function Texto({ rotulo, ajuda, valor, onChange, linhas }) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda}>
      {(id) =>
        linhas ? (
          <textarea id={id} rows={linhas} value={valor} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input id={id} value={valor} onChange={(e) => onChange(e.target.value)} />
        )
      }
    </Campo>
  )
}

function FormAtendimento({ config, set }) {
  const p = config.persona
  const setP = (patch) => set({ persona: { ...p, ...patch } })
  const previa = p.saudacao.replaceAll('{{nome}}', p.nome).replaceAll('{{empresa}}', p.empresaNome)
  return (
    <>
      <div className="form-duplo">
        <Texto rotulo="Nome do bot" valor={p.nome} onChange={(nome) => setP({ nome })} />
        <Texto rotulo="Nome da empresa" valor={p.empresaNome} onChange={(empresaNome) => setP({ empresaNome })} />
      </div>
      <Texto rotulo="Tom de voz" ajuda="Ex.: cordial e objetivo." valor={p.tom} onChange={(tom) => setP({ tom })} />
      <Texto
        rotulo="Saudação"
        ajuda="Dita uma vez, na primeira fala. Use {{nome}} e {{empresa}}. Vazia, o bot não saúda."
        linhas={2}
        valor={p.saudacao}
        onChange={(saudacao) => setP({ saudacao })}
      />
      {previa.trim() && (
        <div className="previa">
          <span className="avatar autor-bot">
            <Bot size={15} />
          </span>
          <div className="balao autor-bot">
            <span className="balao-autor">Prévia</span>
            <p>{previa}</p>
          </div>
        </div>
      )}
      <Campo rotulo="Regras extras" ajuda="Instruções que o bot segue sempre. Enter para adicionar.">
        {(id) => <TagInput id={id} valor={p.regrasExtras ?? []} onChange={(regrasExtras) => setP({ regrasExtras })} placeholder="Nunca prometer prazos…" />}
      </Campo>
      <Texto rotulo="Quando não encontra a resposta" linhas={2} valor={config.mensagemSemBase} onChange={(mensagemSemBase) => set({ mensagemSemBase })} />
      <Texto rotulo="Quando acontece um erro" linhas={2} valor={config.mensagemErro} onChange={(mensagemErro) => set({ mensagemErro })} />
      <Campo rotulo="Limite de respostas sem base" ajuda="Quantas vezes seguidas o bot pode ficar sem informação da base.">
        {(id) => (
          <input id={id} type="number" min={1} className="numero" value={config.limiteSemBase} onChange={(e) => set({ limiteSemBase: Number(e.target.value) })} />
        )}
      </Campo>
    </>
  )
}

function FormSac({ config, set }) {
  const alternarTipo = (tipo) =>
    set({
      tiposQueExigemHumano: config.tiposQueExigemHumano.includes(tipo)
        ? config.tiposQueExigemHumano.filter((t) => t !== tipo)
        : [...config.tiposQueExigemHumano, tipo],
    })
  return (
    <>
      <fieldset className="checks">
        <legend>Tipos que exigem atendente</legend>
        {Object.entries(TIPO_PROTOCOLO).map(([tipo, rotulo]) => (
          <label key={tipo}>
            <input type="checkbox" checked={config.tiposQueExigemHumano.includes(tipo)} onChange={() => alternarTipo(tipo)} />
            {rotulo}
          </label>
        ))}
      </fieldset>
      <Texto
        rotulo="Protocolo criado"
        ajuda="Use {{numero}} para o número do protocolo."
        linhas={2}
        valor={config.mensagemProtocoloCriado}
        onChange={(mensagemProtocoloCriado) => set({ mensagemProtocoloCriado })}
      />
      <Texto rotulo="Encaminhado a atendente" linhas={2} valor={config.mensagemEncaminhado} onChange={(mensagemEncaminhado) => set({ mensagemEncaminhado })} />
      <div className="linha-switch">
        <div>
          <strong>Abrir protocolo também para dúvidas</strong>
          <small>Reclamações e solicitações sempre geram protocolo; dúvidas, só com esta opção.</small>
        </div>
        <Switch rotulo="Forçar protocolo em dúvida" checked={config.forcarProtocoloEmDuvida} onChange={(forcarProtocoloEmDuvida) => set({ forcarProtocoloEmDuvida })} />
      </div>
    </>
  )
}

function Horarios({ valor, onChange }) {
  const faixas = Object.entries(valor)
  const gravar = (novas) => onChange(Object.fromEntries(novas))
  const disponivel = Object.keys(PERIODOS).find((p) => !valor[p])

  return (
    <fieldset className="horarios">
      <legend>Horário do atendimento humano</legend>
      {faixas.map(([periodo, [ini, fim]], i) => (
        <div key={periodo} className="horario">
          <select
            aria-label="Período"
            value={periodo}
            onChange={(e) => gravar(faixas.map((f, j) => (j === i ? [e.target.value, f[1]] : f)))}
          >
            {!PERIODOS[periodo] && <option value={periodo}>{periodo}</option>}
            {Object.entries(PERIODOS)
              .filter(([p]) => p === periodo || !valor[p])
              .map(([p, r]) => (
                <option key={p} value={p}>
                  {r}
                </option>
              ))}
          </select>
          <input type="time" aria-label="Início" value={ini} onChange={(e) => gravar(faixas.map((f, j) => (j === i ? [f[0], [e.target.value, fim]] : f)))} />
          <span className="fraco">até</span>
          <input type="time" aria-label="Fim" value={fim} onChange={(e) => gravar(faixas.map((f, j) => (j === i ? [f[0], [ini, e.target.value]] : f)))} />
          <button
            type="button"
            className="btn-icone"
            aria-label="Remover faixa"
            disabled={faixas.length === 1}
            onClick={() => gravar(faixas.filter((_, j) => j !== i))}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {disponivel && (
        <button type="button" className="btn btn-sm" onClick={() => gravar([...faixas, [disponivel, ['08:00', '18:00']]])}>
          <Plus size={14} /> Adicionar faixa
        </button>
      )}
    </fieldset>
  )
}

function FormTransferencia({ config, set }) {
  return (
    <>
      <Campo rotulo="Frases de pedido de atendente" ajuda="Quando o cliente escreve algo assim, o bot transfere. Enter para adicionar.">
        {(id) => <TagInput id={id} valor={config.frasesPedidoHumano} onChange={(frasesPedidoHumano) => set({ frasesPedidoHumano })} />}
      </Campo>
      <Campo rotulo="Palavras de gatilho" ajuda="Termos sensíveis que também levam ao atendente.">
        {(id) => <TagInput id={id} valor={config.palavrasGatilho} onChange={(palavrasGatilho) => set({ palavrasGatilho })} />}
      </Campo>
      <Texto rotulo="Mensagem ao transferir" linhas={2} valor={config.mensagemTransferencia} onChange={(mensagemTransferencia) => set({ mensagemTransferencia })} />
      <Campo rotulo="Tentativas por etapa antes de transferir" ajuda="De 1 a 20. Se o cliente travar mais vezes que isso na mesma etapa, a conversa vai para a fila de atendimento.">
        {(id) => (
          <input
            id={id}
            type="number"
            min={1}
            max={20}
            className="numero"
            value={config.limiteTravasPorEtapa ?? 2}
            onChange={(e) => set({ limiteTravasPorEtapa: Number(e.target.value) })}
          />
        )}
      </Campo>
      <Horarios valor={config.horarioHumano} onChange={(horarioHumano) => set({ horarioHumano })} />
      <Texto rotulo="Mensagem fora do horário" linhas={2} valor={config.mensagemForaDoHorario} onChange={(mensagemForaDoHorario) => set({ mensagemForaDoHorario })} />
    </>
  )
}

function FormConhecimento({ config, set }) {
  return (
    <div className="form-duplo">
      <Campo rotulo="Trechos por busca" ajuda="De 1 a 20. Quantos trechos o bot recebe para responder.">
        {(id) => <input id={id} type="number" min={1} max={20} value={config.topK} onChange={(e) => set({ topK: Number(e.target.value) })} />}
      </Campo>
      <Campo rotulo="Relevância mínima" ajuda="De 0 a 1. Quanto maior, mais exigente a busca.">
        {(id) => (
          <input id={id} type="number" min={0} max={1} step={0.05} value={config.limiteRelevancia} onChange={(e) => set({ limiteRelevancia: Number(e.target.value) })} />
        )}
      </Campo>
    </div>
  )
}

const FORMS = {
  ATENDIMENTO_GERAL: FormAtendimento,
  SAC: FormSac,
  TRANSFERENCIA_HUMANA: FormTransferencia,
  BASE_CONHECIMENTO: FormConhecimento,
}

export default function Configuracoes() {
  const { empresa, renomear } = useWorkspace()
  const toast = useToast()
  const { data, loading, error, refetch, setData } = useQuery(() => api.configuracoes(empresa.id))
  const [aba, setAba] = useState('ATENDIMENTO_GERAL')
  const [rascunhos, setRascunhos] = useState({})
  const [salvando, setSalvando] = useState(false)

  const original = data?.find((c) => c.modulo === aba)
  const rascunho = rascunhos[aba] ?? (original && { ativo: original.ativo, config: original.config })
  const meta = MODULOS.find((m) => m.id === aba)
  const Form = FORMS[aba]

  const alterado = (modulo) => {
    const o = data?.find((c) => c.modulo === modulo)
    const r = rascunhos[modulo]
    return o && r && JSON.stringify({ ativo: o.ativo, config: o.config }) !== JSON.stringify(r)
  }

  const atualizar = (patch) => setRascunhos((rs) => ({ ...rs, [aba]: { ...rascunho, ...patch } }))

  const descartar = () =>
    setRascunhos((rs) => {
      const resto = { ...rs }
      delete resto[aba]
      return resto
    })

  const salvar = async () => {
    setSalvando(true)
    try {
      const novo = await api.salvarConfiguracaoModulo(empresa.id, aba, rascunho.ativo, rascunho.config)
      setData((lista) => lista.map((c) => (c.modulo === aba ? novo : c)))
      descartar()
      if (aba === 'ATENDIMENTO_GERAL') renomear(empresa.id, novo.config.persona.empresaNome)
      toast(`${meta.rotulo}: configuração salva.`)
    } catch (err) {
      toast(err.message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const opcoes = MODULOS.map((m) => ({ valor: m.id, rotulo: alterado(m.id) ? `${m.rotulo} •` : m.rotulo }))

  return (
    <div className="pagina estreita">
      <PageHeader titulo="Configurações" descricao="Comportamento do bot nesta empresa, módulo por módulo." />
      <Segmented rotulo="Módulo" valor={aba} onChange={setAba} opcoes={opcoes} />

      {loading && !data ? (
        <Esqueleto linhas={4} altura={72} />
      ) : error && !data ? (
        <Falha erro={error} onRetry={refetch} />
      ) : !rascunho || !original ? (
        <Esqueleto linhas={4} altura={72} />
      ) : (
        <section className="cartao form">
          <header className="linha-switch sem-borda">
            <div>
              <strong>{meta.rotulo}</strong>
              <small>{meta.descricao}</small>
            </div>
            {meta.obrigatorio ? (
              <small className="fraco">Módulo obrigatório</small>
            ) : (
              <Switch rotulo={`Módulo ${meta.rotulo} ativo`} checked={rascunho.ativo} onChange={(ativo) => atualizar({ ativo })} />
            )}
          </header>
          <Form config={rascunho.config} set={(patch) => atualizar({ config: { ...rascunho.config, ...patch } })} />
          <footer className="form-rodape">
            <button className="btn" disabled={!alterado(aba) || salvando} onClick={descartar}>
              Descartar
            </button>
            <button className="btn btn-primario" disabled={!alterado(aba) || salvando} onClick={salvar}>
              {salvando && <Spinner />} Salvar alterações
            </button>
          </footer>
        </section>
      )}
    </div>
  )
}
