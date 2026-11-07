const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/graphql'

export class ApiError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

async function gql(query, variables) {
  let res
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor.', 'REDE')
  }
  const json = await res.json().catch(() => null)
  if (json?.errors?.length) {
    const [err] = json.errors
    throw new ApiError(err.message, err.extensions?.code)
  }
  if (!res.ok || !json) throw new ApiError(`Erro HTTP ${res.status}`, 'HTTP')
  return json.data
}

const CONVERSA_FIELDS = `
  id estado ultimaMensagemEm contatoId canal
  mensagens { id autor texto criadoEm }
`

export const health = () => gql('query { health { status database } }').then((d) => d.health)

export const criarEmpresa = (nome) =>
  gql('mutation($nome: String!) { criarEmpresa(input: { nome: $nome }) { id nome } }', { nome }).then(
    (d) => d.criarEmpresa,
  )

export const enviarMensagem = (input) =>
  gql(
    `mutation($input: EnviarMensagemInput!) {
      enviarMensagem(input: $input) {
        conversaId estado resposta { id autor texto criadoEm }
      }
    }`,
    { input },
  ).then((d) => d.enviarMensagem)

export const conversa = (empresaId, id) =>
  gql(`query($empresaId: ID!, $id: ID!) { conversa(empresaId: $empresaId, id: $id) { ${CONVERSA_FIELDS} } }`, {
    empresaId,
    id,
  }).then((d) => d.conversa)

export const conversasAguardandoHumano = (empresaId) =>
  gql(
    `query($empresaId: ID!) { conversasAguardandoHumano(empresaId: $empresaId) { ${CONVERSA_FIELDS} } }`,
    { empresaId },
  ).then((d) => d.conversasAguardandoHumano)

export const responderComoAtendente = (empresaId, conversaId, texto) =>
  gql(
    `mutation($empresaId: ID!, $conversaId: ID!, $texto: String!) {
      responderComoAtendente(empresaId: $empresaId, conversaId: $conversaId, texto: $texto) { id }
    }`,
    { empresaId, conversaId, texto },
  )

const acao = (nome) => (empresaId, conversaId) =>
  gql(
    `mutation($empresaId: ID!, $conversaId: ID!) { ${nome}(empresaId: $empresaId, conversaId: $conversaId) { id estado } }`,
    { empresaId, conversaId },
  )

export const devolverConversaAoBot = acao('devolverConversaAoBot')
export const encerrarConversa = acao('encerrarConversa')
