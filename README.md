# Atende — painel do chatbot

Front-end (Vite + React) da API GraphQL do projeto `ai-chatbot`.

| Tela | O que faz |
| --- | --- |
| Visão geral | Fila, protocolos, base de conhecimento, etapas e módulos da empresa |
| Simulador | Conversa como cliente, com jornada do agente e dados coletados |
| Atendimento | Fila de transferências, resposta, devolução ao bot e encerramento |
| Protocolos | Busca, filtro por status, mudança de status e conversa de origem |
| Conhecimento | Artigos e documentos PDF, DOCX, TXT e MD, com o status da indexação (RAG), os trechos de cada um, **Testar busca** (as notas de vetor e de palavra de cada trecho) e **Reindexar** |
| Agente | Ordem, mensagem e ativação das etapas |
| Configurações | Os quatro módulos: persona, SAC, transferência e busca |

## Rodando

```bash
npm install
cp .env.example .env   # ajuste VITE_API_URL se necessário
npm run dev
```

A API precisa estar em `http://localhost:3000/graphql` (padrão).

## Chave da OpenAI

Quem decide é a API, pela variável `LLM_MODO` do `.env` dela. O painel consulta a query `configuracaoLlm` ao abrir.

| Modo | O que acontece |
|---|---|
| `servidor` (padrão) | A API usa `LLM_API_KEY` e `LLM_MODEL` do `.env`. O painel abre direto e mostra o modelo no menu. |
| `cliente` | O painel pede a chave da OpenAI de quem usa e o modelo, antes de abrir. A chave do `.env` nunca é usada. Bom para publicar o projeto sem gastar a sua chave. |

No modo cliente:

- A chave é conferida na API (`modelosLlm`), que lista só os modelos de chat liberados para ela.
- Ela fica só no navegador: na sessão por padrão, ou no armazenamento local com "Lembrar neste navegador". "Trocar", no menu, apaga a chave.
- Ela vai para a API em cada requisição, nos cabeçalhos `x-llm-api-key` e `x-llm-model`, e não é gravada no servidor.

## O que fica só no navegador

A API não tem consulta para estes dados, então eles ficam no `localStorage`:

- **Chave e modelo da OpenAI:** veja a seção acima.
- **Lista de empresas:** não existe query que liste empresas. Guarde o ID para conectar em outro navegador.
- **Conversas "Comigo":** `conversasAguardandoHumano` só traz a fila. Depois da primeira resposta, a conversa só aparece no navegador do atendente que respondeu.
