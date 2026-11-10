import { useState } from 'react'
import { MessagesSquare } from 'lucide-react'
import { Campo, Spinner } from '../components/ui.jsx'
import { useWorkspace } from '../lib/util.js'

export default function Login() {
  const { entrar, registrar, registroAberto } = useWorkspace()
  const [criando, setCriando] = useState(false)
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cadastro = criando && registroAberto
  const pronto = email.trim() && senha && (!cadastro || nomeEmpresa.trim())

  const enviar = async (e) => {
    e.preventDefault()
    if (!pronto) return
    setEnviando(true)
    setErro('')
    try {
      if (cadastro) await registrar(nomeEmpresa.trim(), email.trim(), senha)
      else await entrar(email.trim(), senha)
    } catch (err) {
      setErro(err.message)
      setEnviando(false)
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <span className="marca-icone grande">
          <MessagesSquare size={24} />
        </span>
        <h1>{cadastro ? 'Criar conta' : 'Entrar'}</h1>
        <p>
          {cadastro
            ? 'Cria a empresa com o agente padrão e a conta de acesso ao painel.'
            : 'Use o e-mail e a senha da conta da sua empresa.'}
        </p>
        <form onSubmit={enviar} className="form-empresa">
          {cadastro && (
            <Campo rotulo="Nome da empresa">
              {(id) => (
                <input
                  id={id}
                  value={nomeEmpresa}
                  autoFocus
                  maxLength={160}
                  placeholder="Ex.: Padaria Aurora"
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                />
              )}
            </Campo>
          )}
          <Campo rotulo="E-mail">
            {(id) => (
              <input
                id={id}
                type="email"
                value={email}
                autoFocus={!cadastro}
                autoComplete="username"
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Campo>
          <Campo rotulo="Senha" ajuda={cadastro ? 'Mínimo de 8 caracteres.' : undefined}>
            {(id) => (
              <input
                id={id}
                type="password"
                value={senha}
                autoComplete={cadastro ? 'new-password' : 'current-password'}
                onChange={(e) => setSenha(e.target.value)}
              />
            )}
          </Campo>
          {erro && (
            <p className="erro-texto" role="alert">
              {erro}
            </p>
          )}
          <button className="btn btn-primario" disabled={enviando || !pronto}>
            {enviando && <Spinner />} {cadastro ? 'Criar conta' : 'Entrar'}
          </button>
        </form>
        {registroAberto && (
          <button
            type="button"
            className="link"
            onClick={() => {
              setCriando((c) => !c)
              setErro('')
            }}
          >
            {cadastro ? 'Já tenho conta' : 'Criar uma conta'}
          </button>
        )}
      </div>
    </div>
  )
}
