import { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  ClipboardPaste,
  FileText,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SearchCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import * as api from '../api.js'
import { Badge, Campo, Confirmar, Esqueleto, Falha, Modal, PageHeader, Segmented, Spinner, Switch, TagInput, Vazio } from '../components/ui.jsx'
import {
  dataHora,
  relativo,
  STATUS_DOCUMENTO,
  STATUS_INDEXACAO,
  TIPO_ARTIGO,
  useCredencial,
  useQuery,
  useToast,
  useWorkspace,
} from '../lib/util.js'

const LIMITE_TEXTO = 200_000
const LIMITE_ARQUIVO = 10 * 1024 * 1024
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const FORMATOS = {
  md: { mime: 'text/markdown', binario: false },
  markdown: { mime: 'text/markdown', binario: false },
  txt: { mime: 'text/plain', binario: false },
  pdf: { mime: 'application/pdf', binario: true },
  docx: { mime: MIME_DOCX, binario: true },
}
const ACEITOS = '.txt,.md,.markdown,.pdf,.docx'
const EM_ANDAMENTO = new Set(['PENDENTE', 'PROCESSANDO'])
// Enquanto algo indexa, a lista atualiza mais rápido para o selo mudar sozinho.
const INTERVALO_INDEXANDO = 2500

const emAndamento = (lista) => lista?.some((item) => EM_ANDAMENTO.has(item.indexacao) && item.status !== 'ERRO')

/** Atualiza a lista enquanto houver item na fila de embeddings. */
function useAcompanharIndexacao(lista, refetch) {
  const indexando = emAndamento(lista)
  useEffect(() => {
    if (!indexando) return undefined
    const t = setTimeout(refetch, INTERVALO_INDEXANDO)
    return () => clearTimeout(t)
  }, [indexando, lista, refetch])
}

function lerComoBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(String(leitor.result))
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    leitor.readAsDataURL(arquivo)
  })
}

function SeloIndexacao({ item }) {
  const status = STATUS_INDEXACAO[item.indexacao] ?? STATUS_INDEXACAO.PENDENTE
  return (
    <span className="selo-indexacao" title={item.motivoIndexacao ?? undefined}>
      <Badge tom={status.tom}>
        {item.indexacao === 'PROCESSANDO' && <Spinner size={11} />} {status.rotulo}
      </Badge>
    </span>
  )
}

function ModalTrechos({ titulo, carregar, onClose }) {
  const { data, loading, error, refetch } = useQuery(carregar, [])
  return (
    <Modal titulo={`Trechos · ${titulo}`} onClose={onClose} largo>
      <p className="nota-modal">
        É assim que o conteúdo foi cortado para a busca. Cada trecho vira um vetor e começa com o título e a seção, para não
        ficar sem contexto.
      </p>
      {loading && !data ? (
        <Esqueleto linhas={3} altura={90} />
      ) : error && !data ? (
        <Falha erro={error} onRetry={refetch} />
      ) : data.length === 0 ? (
        <Vazio icone={Layers} titulo="Ainda sem trechos">
          Eles aparecem quando a indexação termina.
        </Vazio>
      ) : (
        <ol className="lista-trechos">
          {data.map((t) => (
            <li key={t.id} className={t.ativo ? '' : 'inativo'}>
              <header>
                <span className="mono fraco">#{t.ordem + 1}</span>
                <strong>{t.secao ?? t.titulo}</strong>
                {t.modeloEmbedding ? (
                  <Badge tom="good">com vetor</Badge>
                ) : (
                  <Badge tom="warn">só texto</Badge>
                )}
              </header>
              <p>{t.texto.split('\n\n').slice(1).join('\n\n') || t.texto}</p>
              <small className="fraco">{t.texto.length.toLocaleString('pt-BR')} caracteres</small>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}

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
      toast(artigo ? 'Artigo atualizado. Indexando…' : 'Artigo criado. Indexando…')
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
  const [vendoTrechos, setVendoTrechos] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setTermo(busca.trim()), 300)
    return () => clearTimeout(t)
  }, [busca])

  const { data, loading, error, refetch, setData } = useQuery(() => api.artigos(empresaId, termo), [termo])
  useAcompanharIndexacao(data, refetch)

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
              {a.indexacao === 'ERRO' && a.motivoIndexacao && <p className="erro-texto texto-pequeno">{a.motivoIndexacao}</p>}
              <footer>
                <span className="artigo-meta">
                  <SeloIndexacao item={a} />
                  <small title={dataHora(a.atualizadoEm)}>{relativo(a.atualizadoEm)}</small>
                </span>
                <span>
                  <button className="btn-icone" aria-label={`Ver trechos de ${a.titulo}`} title="Ver trechos" onClick={() => setVendoTrechos(a)}>
                    <Layers size={15} />
                  </button>
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
      {vendoTrechos && (
        <ModalTrechos
          titulo={vendoTrechos.titulo}
          carregar={() => api.trechosDoArtigo(empresaId, vendoTrechos.id)}
          onClose={() => setVendoTrechos(null)}
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
  const [vendoTrechos, setVendoTrechos] = useState(null)
  const [removendo, setRemovendo] = useState(null)
  const { data, loading, error, refetch } = useQuery(() => api.documentos(empresaId), [], { interval: 8000 })
  useAcompanharIndexacao(data, refetch)

  const enviar = async (input) => {
    setEnviando(true)
    try {
      const d = await api.enviarDocumento({ empresaId, ...input })
      if (d.status === 'ERRO') toast(d.motivoErro ?? 'O documento não pôde ser lido.', 'erro')
      else toast(`"${input.nome}" enviado. Indexando…`)
      await refetch()
      return true
    } catch (err) {
      toast(err.message, 'erro')
      return false
    } finally {
      setEnviando(false)
    }
  }

  const remover = async () => {
    try {
      await api.removerDocumento(empresaId, removendo.id)
      setRemovendo(null)
      toast('Documento removido.')
      refetch()
    } catch (err) {
      toast(err.message, 'erro')
    }
  }

  const receberArquivos = async (arquivos) => {
    for (const f of arquivos) {
      const formato = FORMATOS[f.name.split('.').pop().toLowerCase()]
      if (!formato) {
        toast(`${f.name}: envie PDF, DOCX, TXT ou MD.`, 'erro')
        continue
      }
      if (f.size > LIMITE_ARQUIVO) {
        toast(`${f.name}: o limite é 10 MB.`, 'erro')
        continue
      }
      if (formato.binario) {
        await enviar({ nome: f.name, mime: formato.mime, arquivoBase64: await lerComoBase64(f) })
        continue
      }
      const conteudo = await f.text()
      if (conteudo.length > LIMITE_TEXTO) {
        toast(`${f.name}: o texto passa de 200 mil caracteres.`, 'erro')
        continue
      }
      await enviar({ nome: f.name, mime: formato.mime, conteudo })
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
          <strong>Arraste PDF, DOCX, TXT ou MD</strong>
          <small>Até 10 MB. O texto é cortado em trechos e cada trecho vira um vetor para a busca do agente.</small>
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
          accept={ACEITOS}
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
            {data.map((d) => {
              const lido = d.status === 'PRONTO'
              return (
                <li key={d.id}>
                  <FileText size={18} className="fraco" />
                  <div>
                    <strong>{d.nome}</strong>
                    <small>
                      {d.status === 'ERRO'
                        ? d.motivoErro
                        : d.indexacao === 'ERRO' && d.motivoIndexacao
                          ? d.motivoIndexacao
                          : `${d.quantidadeTrechos ?? 0} trechos · ${relativo(d.criadoEm)}`}
                    </small>
                  </div>
                  {lido ? (
                    <SeloIndexacao item={d} />
                  ) : (
                    <Badge tom={STATUS_DOCUMENTO[d.status].tom}>{STATUS_DOCUMENTO[d.status].rotulo}</Badge>
                  )}
                  {lido && (
                    <button className="btn-icone" aria-label={`Ver trechos de ${d.nome}`} title="Ver trechos" onClick={() => setVendoTrechos(d)}>
                      <Layers size={15} />
                    </button>
                  )}
                  <button className="btn-icone" aria-label={`Remover ${d.nome}`} title="Remover" onClick={() => setRemovendo(d)}>
                    <Trash2 size={15} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {removendo && (
        <Confirmar titulo="Remover documento" rotulo="Remover" perigo onConfirm={remover} onClose={() => setRemovendo(null)}>
          <p>
            <strong>{removendo.nome}</strong> e os trechos indexados dele serão apagados definitivamente.
          </p>
        </Confirmar>
      )}
      {vendoTrechos && (
        <ModalTrechos
          titulo={vendoTrechos.nome}
          carregar={() => api.trechosDoDocumento(empresaId, vendoTrechos.id)}
          onClose={() => setVendoTrechos(null)}
        />
      )}
      {colando && (
        <Modal titulo="Colar texto" onClose={() => setColando(null)} largo>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault()
              if (colando.conteudo.length > LIMITE_TEXTO) {
                toast('O texto passa de 200 mil caracteres.', 'erro')
                return
              }
              if (await enviar({ nome: colando.nome.trim(), mime: 'text/plain', conteudo: colando.conteudo })) setColando(null)
            }}
          >
            <Campo rotulo="Nome do documento">
              {(id) => <input id={id} autoFocus maxLength={200} value={colando.nome} onChange={(e) => setColando({ ...colando, nome: e.target.value })} />}
            </Campo>
            <Campo rotulo="Conteúdo" ajuda={`${colando.conteudo.length.toLocaleString('pt-BR')} de 200.000 caracteres. Títulos em markdown (# Seção) viram seções dos trechos.`}>
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

const EXEMPLOS = ['Vocês parcelam?', 'Quanto tempo demora a entrega?', 'Posso trocar um produto?']

function Nota({ rotulo, valor }) {
  const pct = valor == null ? 0 : Math.round(Math.max(0, Math.min(1, valor)) * 100)
  return (
    <div className="nota" title={valor == null ? `${rotulo}: não achou por aqui` : `${rotulo}: ${valor.toFixed(3)}`}>
      <span>{rotulo}</span>
      <div className="nota-barra" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </div>
      <span className="mono">{valor == null ? '—' : valor.toFixed(2)}</span>
    </div>
  )
}

function TestarBusca({ empresaId }) {
  const { llm } = useCredencial()
  const [pergunta, setPergunta] = useState('')
  const [resultado, setResultado] = useState(null) // { pergunta, trechos } | { erro }
  const [buscando, setBuscando] = useState(false)

  const buscar = async (texto) => {
    const consulta = (texto ?? pergunta).trim()
    if (!consulta || buscando) return
    setPergunta(consulta)
    setBuscando(true)
    try {
      setResultado({ pergunta: consulta, trechos: await api.testarBusca(empresaId, consulta) })
    } catch (err) {
      setResultado({ erro: err.message })
    } finally {
      setBuscando(false)
    }
  }

  return (
    <>
      <div className="cartao testar-busca">
        <form
          className="testar-busca-form"
          onSubmit={(e) => {
            e.preventDefault()
            buscar()
          }}
        >
          <label className="busca">
            <SearchCheck size={15} />
            <input value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Pergunte como um cliente perguntaria" aria-label="Pergunta de teste" />
          </label>
          <button className="btn btn-primario" disabled={buscando || !pergunta.trim()}>
            {buscando && <Spinner />} Buscar
          </button>
        </form>
        <div className="exemplos">
          {EXEMPLOS.map((exemplo) => (
            <button key={exemplo} type="button" className="chip" onClick={() => buscar(exemplo)}>
              {exemplo}
            </button>
          ))}
        </div>
        <p className="fraco texto-pequeno">
          A mesma busca do chat: <strong>vetor</strong> ({llm?.modeloEmbedding ?? 'embedding'}) acha pelo significado,{' '}
          <strong>palavra</strong> resgata termo exato que o vetor deixou de fora. Sem chamar o modelo de chat.
        </p>
      </div>

      {resultado?.erro ? (
        <div className="cartao">
          <p className="erro-texto">{resultado.erro}</p>
        </div>
      ) : resultado ? (
        resultado.trechos.length === 0 ? (
          <div className="cartao">
            <Vazio icone={Search} titulo="Nada passou dos limiares">
              Para &quot;{resultado.pergunta}&quot; o bot responderia a mensagem de sem base.
            </Vazio>
          </div>
        ) : (
          <ol className="resultados-busca">
            {resultado.trechos.map((t, i) => (
              <li key={t.id} className="cartao">
                <header>
                  <span className="posicao">{i + 1}</span>
                  <strong>{t.texto.split('\n')[0]}</strong>
                  <Badge tom={t.origem === 'DOCUMENTO' ? 'info' : 'accent'}>{t.origem === 'DOCUMENTO' ? 'Documento' : 'Artigo'}</Badge>
                </header>
                <p>{t.texto.split('\n\n').slice(1).join('\n\n') || t.texto}</p>
                <div className="notas">
                  <Nota rotulo="Vetor" valor={t.scoreVetor} />
                  <Nota rotulo="Palavra" valor={t.scorePalavra} />
                </div>
              </li>
            ))}
          </ol>
        )
      ) : null}
    </>
  )
}

export default function Conhecimento() {
  const { empresa } = useWorkspace()
  const toast = useToast()
  const [aba, setAba] = useState('artigos')
  const [confirmando, setConfirmando] = useState(false)
  const [versao, setVersao] = useState(0)

  const reindexar = async () => {
    try {
      const total = await api.reindexarConhecimento(empresa.id)
      setConfirmando(false)
      toast(total === 0 ? 'A base está vazia.' : `${total} ${total === 1 ? 'item entrou' : 'itens entraram'} na fila de indexação.`)
      setVersao((v) => v + 1)
    } catch (err) {
      toast(err.message, 'erro')
    }
  }

  return (
    <div className="pagina">
      <PageHeader titulo="Conhecimento" descricao="O que o agente consulta para responder perguntas sobre a empresa. Busca por significado (RAG) e por palavra.">
        <Segmented
          rotulo="Seção"
          valor={aba}
          onChange={setAba}
          opcoes={[
            { valor: 'artigos', rotulo: 'Artigos' },
            { valor: 'documentos', rotulo: 'Documentos' },
            { valor: 'testar', rotulo: 'Testar busca' },
          ]}
        />
        <button className="btn" onClick={() => setConfirmando(true)} title="Gerar de novo os vetores de toda a base">
          <RefreshCw size={15} /> Reindexar
        </button>
      </PageHeader>
      {aba === 'artigos' ? (
        <Artigos key={versao} empresaId={empresa.id} />
      ) : aba === 'documentos' ? (
        <Documentos key={versao} empresaId={empresa.id} />
      ) : (
        <TestarBusca empresaId={empresa.id} />
      )}
      {confirmando && (
        <Confirmar titulo="Reindexar a base" rotulo="Reindexar" onConfirm={reindexar} onClose={() => setConfirmando(false)}>
          <p>
            Todos os artigos e documentos voltam para a fila e ganham trechos e vetores novos. Use depois de trocar o modelo de
            embedding ou se algum item ficou sem vetor.
          </p>
          <p className="fraco">Trecho que não mudou mantém o vetor. O resto gasta créditos de embedding da chave da OpenAI em uso.</p>
        </Confirmar>
      )}
    </div>
  )
}
