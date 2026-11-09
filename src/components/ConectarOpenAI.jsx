import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import * as api from '../api.js'
import { useCredencial } from '../lib/util.js'
import { Campo, Spinner } from './ui.jsx'

// Modelo sugerido: o mais novo da família "mini", que custa menos e dá conta do atendimento.
const sugestao = (modelos) => modelos.find((m) => /mini/.test(m) && !/nano/.test(m)) ?? modelos[0]

export default function ConectarOpenAI() {
  const { conectar } = useCredencial()
  const [apiKey, setApiKey] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [modelos, setModelos] = useState(null)
  const [modelo, setModelo] = useState('')
  const [lembrar, setLembrar] = useState(false)
  const [erro, setErro] = useState('')
  const [verificando, setVerificando] = useState(false)

  const verificar = async (e) => {
    e.preventDefault()
    const chave = apiKey.trim()
    if (!chave || verificando) return
    setVerificando(true)
    setErro('')
    try {
      const lista = await api.modelosLlm(chave)
      if (lista.length === 0) {
        setErro('Esta chave não libera nenhum modelo de chat.')
        return
      }
      setModelos(lista)
      setModelo(sugestao(lista))
    } catch (err) {
      setErro(err.message)
    } finally {
      setVerificando(false)
    }
  }

  const concluir = (e) => {
    e.preventDefault()
    if (modelo) conectar({ apiKey: apiKey.trim(), model: modelo }, lembrar)
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <span className="marca-icone grande">
          <KeyRound size={22} />
        </span>
        <h1>Conecte sua conta da OpenAI</h1>
        <p>
          O chatbot usa a sua chave da API e o modelo que você escolher. Cada mensagem do simulador gasta créditos da sua conta.
        </p>

        {!modelos ? (
          <form className="form-empresa" onSubmit={verificar}>
            <Campo
              rotulo="Chave da API"
              ajuda={
                <>
                  Crie uma em{' '}
                  <a className="link" href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
                    platform.openai.com/api-keys
                  </a>
                  .
                </>
              }
            >
              {(id) => (
                <div className="campo-com-acao">
                  <input
                    id={id}
                    className="mono"
                    type={mostrar ? 'text' : 'password'}
                    autoComplete="off"
                    spellCheck={false}
                    autoFocus
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-icone"
                    aria-label={mostrar ? 'Esconder chave' : 'Mostrar chave'}
                    onClick={() => setMostrar((m) => !m)}
                  >
                    {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              )}
            </Campo>
            {erro && (
              <p className="erro-texto" role="alert">
                {erro}
              </p>
            )}
            <button className="btn btn-primario" disabled={verificando || !apiKey.trim()}>
              {verificando && <Spinner />} Verificar chave
            </button>
          </form>
        ) : (
          <form className="form-empresa" onSubmit={concluir}>
            <Campo rotulo="Modelo" ajuda={`${modelos.length} modelos de chat liberados para esta chave.`}>
              {(id) => (
                <select id={id} value={modelo} onChange={(e) => setModelo(e.target.value)}>
                  {modelos.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <label className="check-linha">
              <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
              Lembrar neste navegador
            </label>
            <div className="pilha-botoes">
              <button className="btn btn-primario">Conectar</button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setModelos(null)
                  setErro('')
                }}
              >
                <ArrowLeft size={15} /> Usar outra chave
              </button>
            </div>
          </form>
        )}

        <p className="nota-seguranca">
          <ShieldCheck size={15} />
          <span>
            A chave fica só neste navegador e vai direto para a API a cada requisição. Ela não é gravada no servidor nem aparece nos logs.
            {lembrar ? '' : ' Fechando a aba, ela é esquecida.'}
          </span>
        </p>
      </div>
    </div>
  )
}
