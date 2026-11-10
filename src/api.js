import { cabecalhosCredencial } from './lib/credencial.js'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/graphql'

export class ApiError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

async function gql(query, variables, credencial) {
  let res
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...cabecalhosCredencial(credencial) },
      body: JSON.stringify({ query, variables }),
    })
  } catch {
    throw new ApiError('Não foi possível conectar à API.', 'REDE')
  }
  const json = await res.json().catch(() => null)
  if (json?.errors?.length) {
    const [err] = json.errors
    throw new ApiError(err.message, err.extensions?.code)
  }
  if (!res.ok || !json) throw new ApiError(`Erro HTTP ${res.status}`, 'HTTP')
  return json.data
}

const MENSAGEM = 'id autor texto criadoEm'
const CONVERSA = `id estado contatoId canal agenteId etapaAtualId etapasCumpridas valoresSlot
  ultimaMensagemEm criadoEm mensagens { ${MENSAGEM} }`
const PROTOCOLO = 'id numero tipo descricao status conversaId encaminhadoParaHumano criadoEm atualizadoEm'
const ARTIGO = 'id tipo titulo pergunta conteudo tags ativo indexacao motivoIndexacao atualizadoEm'
const DOCUMENTO = 'id nome mime status motivoErro indexacao motivoIndexacao quantidadeTrechos criadoEm'
const TRECHO = 'id ordem titulo secao texto ativo modeloEmbedding'
const ETAPA = 'id chave nome mensagem ordem ativa efeito slot { id nome tipo obrigatorio }'

// Infra
/** Confere a chave na OpenAI e lista os modelos de chat que ela libera. */
export const modelosLlm = (apiKey) => gql('query { modelosLlm }', undefined, { apiKey }).then((d) => d.modelosLlm)

export const configuracaoLlm = () =>
  gql('query { configuracaoLlm { modo modelo servidorConfigurado modeloEmbedding } }').then((d) => d.configuracaoLlm)

export const health = () => gql('query { health { status database } }').then((d) => d.health)

// Empresa e configuração
export const criarEmpresa = (nome) =>
  gql('mutation($nome: String!) { criarEmpresa(input: { nome: $nome }) { id nome } }', { nome }).then(
    (d) => d.criarEmpresa,
  )

export const configuracoes = (empresaId) =>
  gql('query($empresaId: ID!) { configuracoes(empresaId: $empresaId) { id modulo ativo config } }', {
    empresaId,
  }).then((d) => d.configuracoes)

export const salvarConfiguracaoModulo = (empresaId, modulo, ativo, config) =>
  gql(
    `mutation($empresaId: ID!, $modulo: ModuloTipo!, $ativo: Boolean!, $config: JSON!) {
      salvarConfiguracaoModulo(empresaId: $empresaId, modulo: $modulo, ativo: $ativo, config: $config) {
        id modulo ativo config
      }
    }`,
    { empresaId, modulo, ativo, config },
  ).then((d) => d.salvarConfiguracaoModulo)

// Conversa
export const enviarMensagem = (input) =>
  gql(
    `mutation($input: EnviarMensagemInput!) {
      enviarMensagem(input: $input) { conversaId estado resposta { ${MENSAGEM} } }
    }`,
    { input },
  ).then((d) => d.enviarMensagem)

export const conversa = (empresaId, id) =>
  gql(`query($empresaId: ID!, $id: ID!) { conversa(empresaId: $empresaId, id: $id) { ${CONVERSA} } }`, {
    empresaId,
    id,
  }).then((d) => d.conversa)

export const conversasAguardandoHumano = (empresaId) =>
  gql(`query($empresaId: ID!) { conversasAguardandoHumano(empresaId: $empresaId) { ${CONVERSA} } }`, {
    empresaId,
  }).then((d) => d.conversasAguardandoHumano)

// Transferência
export const responderComoAtendente = (empresaId, conversaId, texto) =>
  gql(
    `mutation($empresaId: ID!, $conversaId: ID!, $texto: String!) {
      responderComoAtendente(empresaId: $empresaId, conversaId: $conversaId, texto: $texto) { ${MENSAGEM} }
    }`,
    { empresaId, conversaId, texto },
  ).then((d) => d.responderComoAtendente)

const acaoConversa = (nome) => (empresaId, conversaId) =>
  gql(
    `mutation($empresaId: ID!, $conversaId: ID!) {
      ${nome}(empresaId: $empresaId, conversaId: $conversaId) { id estado }
    }`,
    { empresaId, conversaId },
  ).then((d) => d[nome])

export const transferirParaHumano = acaoConversa('transferirParaHumano')
export const devolverConversaAoBot = acaoConversa('devolverConversaAoBot')
export const encerrarConversa = acaoConversa('encerrarConversa')

// SAC
export const protocolos = (empresaId) =>
  gql(`query($empresaId: ID!) { protocolos(empresaId: $empresaId) { ${PROTOCOLO} } }`, { empresaId }).then(
    (d) => d.protocolos,
  )

export const atualizarStatusProtocolo = (empresaId, id, status) =>
  gql(
    `mutation($empresaId: ID!, $id: ID!, $status: StatusProtocolo!) {
      atualizarStatusProtocolo(empresaId: $empresaId, id: $id, status: $status) { ${PROTOCOLO} }
    }`,
    { empresaId, id, status },
  ).then((d) => d.atualizarStatusProtocolo)

// Base de conhecimento
export const artigos = (empresaId, busca) =>
  gql(`query($empresaId: ID!, $busca: String) { artigos(empresaId: $empresaId, busca: $busca) { ${ARTIGO} } }`, {
    empresaId,
    busca: busca || undefined,
  }).then((d) => d.artigos)

export const criarArtigo = (input) =>
  gql(`mutation($input: CriarArtigoInput!) { criarArtigo(input: $input) { ${ARTIGO} } }`, { input }).then(
    (d) => d.criarArtigo,
  )

export const atualizarArtigo = (id, input) =>
  gql(`mutation($id: ID!, $input: AtualizarArtigoInput!) { atualizarArtigo(id: $id, input: $input) { ${ARTIGO} } }`, {
    id,
    input,
  }).then((d) => d.atualizarArtigo)

export const removerArtigo = (empresaId, id) =>
  gql('mutation($empresaId: ID!, $id: ID!) { removerArtigo(empresaId: $empresaId, id: $id) }', {
    empresaId,
    id,
  }).then((d) => d.removerArtigo)

export const removerDocumento = (empresaId, id) =>
  gql('mutation($empresaId: ID!, $id: ID!) { removerDocumento(empresaId: $empresaId, id: $id) }', {
    empresaId,
    id,
  }).then((d) => d.removerDocumento)

export const documentos = (empresaId) =>
  gql(`query($empresaId: ID!) { documentos(empresaId: $empresaId) { ${DOCUMENTO} } }`, { empresaId }).then(
    (d) => d.documentos,
  )

export const enviarDocumento = (input) =>
  gql(`mutation($input: EnviarDocumentoInput!) { enviarDocumento(input: $input) { ${DOCUMENTO} } }`, {
    input,
  }).then((d) => d.enviarDocumento)

export const trechosDoDocumento = (empresaId, documentoId) =>
  gql(
    `query($empresaId: ID!, $documentoId: ID!) { trechosDoDocumento(empresaId: $empresaId, documentoId: $documentoId) { ${TRECHO} } }`,
    { empresaId, documentoId },
  ).then((d) => d.trechosDoDocumento)

export const trechosDoArtigo = (empresaId, artigoId) =>
  gql(
    `query($empresaId: ID!, $artigoId: ID!) { trechosDoArtigo(empresaId: $empresaId, artigoId: $artigoId) { ${TRECHO} } }`,
    { empresaId, artigoId },
  ).then((d) => d.trechosDoArtigo)

/** Roda a busca do chat (vetor + palavra) e devolve os trechos com as duas notas. */
export const testarBusca = (empresaId, consulta, limite) =>
  gql(
    `query($empresaId: ID!, $consulta: String!, $limite: Int) {
      testarBusca(empresaId: $empresaId, consulta: $consulta, limite: $limite) {
        id origem titulo texto score scoreVetor scorePalavra
      }
    }`,
    { empresaId, consulta, limite },
  ).then((d) => d.testarBusca)

export const reindexarConhecimento = (empresaId) =>
  gql('mutation($empresaId: ID!) { reindexarConhecimento(empresaId: $empresaId) }', { empresaId }).then(
    (d) => d.reindexarConhecimento,
  )

// Agente
export const agentes = (empresaId) =>
  gql(`query($empresaId: ID!) { agentes(empresaId: $empresaId) { id nome etapas { ${ETAPA} } } }`, {
    empresaId,
  }).then((d) => d.agentes)

export const atualizarEtapa = (id, input) =>
  gql(`mutation($id: ID!, $input: AtualizarEtapaInput!) { atualizarEtapa(id: $id, input: $input) { ${ETAPA} } }`, {
    id,
    input,
  }).then((d) => d.atualizarEtapa)

export const reordenarEtapas = (input) =>
  gql(`mutation($input: ReordenarEtapasInput!) { reordenarEtapas(input: $input) { ${ETAPA} } }`, { input }).then(
    (d) => d.reordenarEtapas,
  )
