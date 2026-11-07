import { useEffect, useRef, useState } from 'react'
import { BookOpen, ClipboardPaste, FileText, Pencil, Plus, Search, Trash2, UploadCloud } from 'lucide-react'
import * as api from '../api.js'
import { Badge, Campo, Confirmar, Esqueleto, Falha, Modal, PageHeader, Segmented, Spinner, Switch, TagInput, Vazio } from '../components/ui.jsx'
import { dataHora, relativo, STATUS_DOCUMENTO, TIPO_ARTIGO, useQuery, useToast, useWorkspace } from '../lib/util.js'

const LIMITE_DOCUMENTO = 200_000
const MIMES = { md: 'text/markdown', markdown: 'text/markdown', txt: 'text/plain' }

function FormArtigo({ artigo, empresaId, onSalvo, onClose }) {
  const toast = useToast()
  const [form, setForm] = useState({
    tipo: artigo?.tipo ?? 'PERGUNTA_RESPOSTA',
    titulo: artigo?.titulo ?? '',
    pergunta: artigo?.pergunta ?? '',
    conteudo: artigo?.conteudo ?? '',
    tags: artigo?.tags ?? [],
    ativo: artigo?.ativo ?? true,
  })
  const [enviando, setEnviando] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const ehPergunta = form.tipo === 'PERGUNTA_RESPOSTA'
  const valido = form.titulo.trim() && form.conteudo.trim() && (!ehPergunta || form.pergunta.trim())

  const salvar = async (e) => {
    e.preventDefault()
    if (!valido) return
    setEnviando(true)
    const base = {
      empresaId,
      tipo: form.tipo,
      titulo: form.titulo,
      conteudo: form.conteudo,
      tags: form.tags,
      ativo: form.ativo,
    }
    try {
      if (artigo) {
        await api.atualizarArtigo(artigo.id, { ...base, pergunta: ehPergunta ? form.pergunta : null })
      } else {
        await api.criarArtigo(ehPergunta ? { ...base, pergunta: form.pergunta } : base)
      }
      toast(artigo ? 'Artigo atualizado.' : 'Artigo criado.')
      onSalvo()
    } catch (err) {
      toast(err.message, 'erro')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={artigo ? 'Editar artigo' : 'Novo artigo'} onClose={onClose} largo>
      <form className="form" onSubmit={salvar}>
        <Campo rotulo="Tipo" ajuda={ehPergunta ? 'Responde a uma pergunta frequente.' : 'Orienta como o agente deve agir.'}>
          <Segmented
            rotulo="Tipo do artigo"
            valor={form.tipo}
            onChange={(tipo) => set({ tipo })}
            opcoes={Object.entries(TIPO_ARTIGO).map(([valor, rotulo]) => ({ valor, rotulo }))}
          />
        </Campo>
        <Campo rotulo="Título">
          {(id) => <input id={id} autoFocus maxLength={200} value={form.titulo} onChange={(e) => set({ titulo: e.target.value })} />}
        </Campo>
        {ehPergunta && (
          <Campo rotulo="Pergunta">
            {(id) => (
              <input
                id={id}
                maxLength={500}
                value={form.pergunta}
                placeholder="Como o cliente costuma perguntar"
                onChange={(e) => set({ pergunta: e.target.value })}
              />
            )}
          </Campo>
        )}
        <Campo rotulo={ehPergunta ? 'Resposta' : 'Conteúdo'}>
          {(id) => <textarea id={id} rows={6} maxLength={8000} value={form.conteudo} onChange={(e) => set({ conteudo: e.target.value })} />}
        </Campo>
        <Campo rotulo="Tags" ajuda="Pressione Enter para adicionar.">
          {(id) => <TagInput id={id} valor={form.tags} onChange={(tags) => set({ tags })} placeholder="entrega, prazo…" />}
        </Campo>
        <div className="linha-switch">
          <div>
            <strong>Ativo</strong>
            <small>Artigos inativos não são usados pelo agente.</small>
          </div>
          <Switch rotulo="Artigo ativo" checked={form.ativo} onChange={(ativo) => set({ ativo })} />
        </div>
        <footer className="form-rodape">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primario" disabled={!valido || enviando}>
            {enviando && <Spinner />} Salvar
          </button>
        </footer>
      </form>
    </Modal>
  )
}

function Artigos({ empresaId }) {
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [termo, setTermo] = useState('')
  const [editando, setEditando] = useState(null) // null | 'novo' | artigo
  const [removendo, setRemovendo] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setTermo(busca.trim()), 300)
    return () => clearTimeout(t)
  }, [busca])

  const { data, loading, error, refetch, setData } = useQuery(() => api.artigos(empresaId, termo), [termo])

  const alternar = async (a, ativo) => {
    try {
      const novo = await api.atualizarArtigo(a.id, { empresaId, ativo })
      setData((l) => l.map((x) => (x.id === novo.id ? novo : x)))
    } catch (err) {
      toast(err.message, 'erro')
    }
  }

  const remover = async () => {
    try {
      await api.removerArtigo(empresaId, removendo.id)
      setRemovendo(null)
      toast('Artigo removido.')
      refetch()
    } catch (err) {
      toast(err.message, 'erro')
    }
  }

  return (
    <>
      <div className="barra-filtros">
        <label className="busca">
          <Search size={15} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar em título, conteúdo e tags" aria-label="Buscar artigo" />
        </label>
        <button className="btn btn-primario" onClick={() => setEditando('novo')}>
          <Plus size={16} /> Novo artigo
        </button>
      </div>

      {loading && !data ? (
        <Esqueleto linhas={3} altura={120} />
      ) : error && !data ? (
        <Falha erro={error} onRetry={refetch} />
      ) : data.length === 0 ? (
        <div className="cartao">
          <Vazio icone={BookOpen} titulo={termo ? 'Nada encontrado' : 'Nenhum artigo ainda'}>
            {termo ? 'Tente outro termo.' : 'Cadastre perguntas frequentes para o agente responder com informação da empresa.'}
          </Vazio>
        </div>
      ) : (
        <div className="grade-artigos">
          {data.map((a) => (
            <article key={a.id} className={`cartao artigo ${a.ativo ? '' : 'inativo'}`}>
              <header>
                <Badge tom={a.tipo === 'INSTRUCAO' ? 'info' : 'accent'}>{TIPO_ARTIGO[a.tipo]}</Badge>
                <Switch rotulo={`Ativar ${a.titulo}`} checked={a.ativo} onChange={(v) => alternar(a, v)} />
              </header>
              <h3>{a.titulo}</h3>
              {a.pergunta && <p className="artigo-pergunta">{a.pergunta}</p>}
              <p className="artigo-conteudo">{a.conteudo}</p>
              {a.tags.length > 0 && (
                <div className="tags">
                  {a.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <footer>
                <small title={dataHora(a.atualizadoEm)}>Atualizado {relativo(a.atualizadoEm)}</small>
                <span>
                  <button className="btn-icone" aria-label={`Editar ${a.titulo}`} onClick={() => setEditando(a)}>
                    <Pencil size={15} />
                  </button>
                  <button className="btn-icone" aria-label={`Remover ${a.titulo}`} onClick={() => setRemovendo(a)}>
                    <Trash2 size={15} />
                  </button>
                </span>
              </footer>
            </article>
          ))}
        </div>
      )}

      {editando && (
        <FormArtigo
          artigo={editando === 'novo' ? null : editando}
          empresaId={empresaId}
          onClose={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null)
            refetch()
          }}
        />
      )}
      {removendo && (
        <Confirmar titulo="Remover artigo" rotulo="Remover" perigo onConfirm={remover} onClose={() => setRemovendo(null)}>
          <p>
            <strong>{removendo.titulo}</strong> será apagado definitivamente. Para só tirar do agente, desative o artigo.
          </p>
        </Confirmar>
      )}
    </>
  )
}

function Documentos({ empresaId }) {
  const toast = useToast()
  const arquivo = useRef(null)
  const [arrastando, setArrastando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [colando, setColando] = useState(null)
  const { data, loading, error, refetch } = useQuery(() => api.documentos(empresaId), [], { interval: 8000 })

  const enviar = async (nome, mime, conteudo) => {
    if (conteudo.length > LIMITE_DOCUMENTO) {
      toast('O documento passa do limite de 200 mil caracteres.', 'erro')
      return false
    }
    setEnviando(true)
    try {
      const d = await api.enviarDocumento({ empresaId, nome, mime, conteudo })
      if (d.status === 'ERRO') toast(d.motivoErro ?? 'O documento não pôde ser processado.', 'erro')
      else toast(`"${nome}" enviado.`)
      await refetch()
      return true
    } catch (err) {
      toast(err.message, 'erro')
      return false
    } finally {
      setEnviando(false)
    }
  }

  const receberArquivos = async (arquivos) => {
    for (const f of arquivos) {
      const mime = MIMES[f.name.split('.').pop().toLowerCase()]
      if (!mime) {
        toast(`${f.name}: envie apenas arquivos .txt ou .md.`, 'erro')
        continue
      }
      await enviar(f.name, mime, await f.text())
    }
  }

  return (
    <>
      <div
        className={`dropzone ${arrastando ? 'on' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastando(false)
          receberArquivos([...e.dataTransfer.files])
        }}
      >
        {enviando ? <Spinner size={22} /> : <UploadCloud size={22} />}
        <div>
          <strong>Arraste arquivos .txt ou .md</strong>
          <small>O texto entra na busca do agente assim que fica pronto.</small>
        </div>
        <div className="dropzone-acoes">
          <button className="btn" onClick={() => arquivo.current?.click()}>
            Escolher arquivo
          </button>
          <button className="btn" onClick={() => setColando({ nome: '', conteudo: '' })}>
            <ClipboardPaste size={15} /> Colar texto
          </button>
        </div>
        <input
          ref={arquivo}
          type="file"
          accept=".txt,.md,.markdown"
          multiple
          hidden
          onChange={(e) => {
            receberArquivos([...e.target.files])
            e.target.value = ''
          }}
        />
      </div>

      {loading && !data ? (
        <Esqueleto linhas={3} />
      ) : error && !data ? (
        <Falha erro={error} onRetry={refetch} />
      ) : data.length === 0 ? (
        <div className="cartao">
          <Vazio icone={FileText} titulo="Nenhum documento enviado" />
        </div>
      ) : (
        <div className="cartao sem-padding">
          <ul className="lista documentos">
            {data.map((d) => (
              <li key={d.id}>
                <FileText size={18} className="fraco" />
                <div>
                  <strong>{d.nome}</strong>
                  <small>{d.motivoErro ?? `${d.mime} · ${relativo(d.criadoEm)}`}</small>
                </div>
                <Badge tom={STATUS_DOCUMENTO[d.status].tom}>{STATUS_DOCUMENTO[d.status].rotulo}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {colando && (
        <Modal titulo="Colar texto" onClose={() => setColando(null)} largo>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault()
              if (await enviar(colando.nome.trim(), 'text/plain', colando.conteudo)) setColando(null)
            }}
          >
            <Campo rotulo="Nome do documento">
              {(id) => <input id={id} autoFocus maxLength={200} value={colando.nome} onChange={(e) => setColando({ ...colando, nome: e.target.value })} />}
            </Campo>
            <Campo rotulo="Conteúdo" ajuda={`${colando.conteudo.length.toLocaleString('pt-BR')} de 200.000 caracteres`}>
              {(id) => <textarea id={id} rows={10} value={colando.conteudo} onChange={(e) => setColando({ ...colando, conteudo: e.target.value })} />}
            </Campo>
            <footer className="form-rodape">
              <button type="button" className="btn" onClick={() => setColando(null)}>
                Cancelar
              </button>
              <button className="btn btn-primario" disabled={enviando || !colando.nome.trim() || !colando.conteudo.trim()}>
                {enviando && <Spinner />} Enviar
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  )
}

export default function Conhecimento() {
  const { empresa } = useWorkspace()
  const [aba, setAba] = useState('artigos')
  return (
    <div className="pagina">
      <PageHeader titulo="Conhecimento" descricao="O que o agente consulta para responder perguntas sobre a empresa.">
        <Segmented
          rotulo="Seção"
          valor={aba}
          onChange={setAba}
          opcoes={[
            { valor: 'artigos', rotulo: 'Artigos' },
            { valor: 'documentos', rotulo: 'Documentos' },
          ]}
        />
      </PageHeader>
      {aba === 'artigos' ? <Artigos empresaId={empresa.id} /> : <Documentos empresaId={empresa.id} />}
    </div>
  )
}
