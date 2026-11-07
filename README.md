# Atende — painel do chatbot

Front-end (Vite + React) da API GraphQL do projeto `ai-chatbot`.

| Tela | O que faz |
| --- | --- |
| Visão geral | Fila, protocolos, base de conhecimento, etapas e módulos da empresa |
| Simulador | Conversa como cliente, com jornada do agente e dados coletados |
| Atendimento | Fila de transferências, resposta, devolução ao bot e encerramento |
| Protocolos | Busca, filtro por status, mudança de status e conversa de origem |
| Conhecimento | Artigos (criar, editar, ativar, remover) e documentos `.txt`/`.md` |
| Agente | Ordem, mensagem e ativação das etapas |
| Configurações | Os quatro módulos: persona, SAC, transferência e busca |

## Rodando

```bash
npm install
cp .env.example .env   # ajuste VITE_API_URL se necessário
npm run dev
```

A API precisa estar em `http://localhost:3000/graphql` (padrão).

## O que fica só no navegador

A API não tem consulta para estes dados, então eles ficam no `localStorage`:

- **Lista de empresas:** não existe query que liste empresas. Guarde o ID para conectar em outro navegador.
- **Conversas "Comigo":** `conversasAguardandoHumano` só traz a fila. Depois da primeira resposta, a conversa só aparece no navegador do atendente que respondeu.
