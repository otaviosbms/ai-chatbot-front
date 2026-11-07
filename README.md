# AI Chatbot — Front

Front-end (Vite + React) do chatbot, conectado à API GraphQL do projeto `ai-chatbot`.

- **Cliente**: chat que usa `enviarMensagem` e acompanha a conversa (inclusive respostas de atendente humano).
- **Atendente**: fila de `conversasAguardandoHumano`, resposta, devolução ao bot e encerramento.

## Rodando

```bash
npm install
cp .env.example .env   # ajuste VITE_API_URL se necessário
npm run dev
```

A API precisa estar em `http://localhost:3000/graphql` (padrão). Informe o ID de uma empresa na tela ou crie uma com "Nova empresa".
