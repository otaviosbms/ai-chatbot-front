import { useState } from 'react'
import * as api from './api.js'
import Chat from './components/Chat.jsx'
import Atendente from './components/Atendente.jsx'

const load = () => {
  try {
    return JSON.parse(localStorage.getItem('chatbot-config')) ?? {}
  } catch {
    return {}
  }
}

export default function App() {
  const [config, setConfig] = useState(() => ({
    empresaId: '',
    contatoId: 'cliente-1',
    canal: 'web',
    ...load(),
  }))
  const [aba, setAba] = useState('chat')
  const [info, setInfo] = useState('')

  const update = (patch) =>
    setConfig((c) => {
      const next = { ...c, ...patch }
      try {
        localStorage.setItem('chatbot-config', JSON.stringify(next))
      } catch {
        /* storage indisponível */
      }
      return next
    })

  const novaEmpresa = async () => {
    const nome = window.prompt('Nome da nova empresa:')
    if (!nome?.trim()) return
    try {
      const e = await api.criarEmpresa(nome.trim())
      update({ empresaId: e.id })
      setInfo(`Empresa "${e.nome}" criada.`)
    } catch (err) {
      setInfo(err.message)
    }
  }

  return (
    <div className="app">
      <header className="topo">
        <h1>AI Chatbot</h1>
        <nav>
          <button className={aba === 'chat' ? 'ativo' : ''} onClick={() => setAba('chat')}>
            Cliente
          </button>
          <button className={aba === 'atendente' ? 'ativo' : ''} onClick={() => setAba('atendente')}>
            Atendente
          </button>
        </nav>
      </header>

      <section className="config">
        <label>
          Empresa (ID)
          <input
            value={config.empresaId}
            onChange={(e) => update({ empresaId: e.target.value.trim() })}
            placeholder="UUID da empresa"
          />
        </label>
        {aba === 'chat' && (
          <>
            <label>
              Contato
              <input value={config.contatoId} onChange={(e) => update({ contatoId: e.target.value })} />
            </label>
            <label>
              Canal
              <input value={config.canal} onChange={(e) => update({ canal: e.target.value })} />
            </label>
          </>
        )}
        <button className="secundario" onClick={novaEmpresa}>
          Nova empresa
        </button>
      </section>
      {info && <p className="info">{info}</p>}

      <main>
        {!config.empresaId ? (
          <p className="vazio">Informe o ID de uma empresa ou crie uma nova para começar.</p>
        ) : aba === 'chat' ? (
          <Chat key={`${config.empresaId}|${config.contatoId}|${config.canal}`} {...config} />
        ) : (
          <Atendente key={config.empresaId} empresaId={config.empresaId} />
        )}
      </main>
    </div>
  )
}
