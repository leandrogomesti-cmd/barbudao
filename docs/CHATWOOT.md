# Chatwoot — Configuração e Integração

## O que é o Chatwoot neste projeto

O Chatwoot (fork **fazer-ai** com suporte a WhatsApp via Baileys) é o canal pelo qual a IA **Bia** conversa com os clientes. Ele:

1. Recebe mensagens dos clientes no WhatsApp
2. Dispara o webhook do N8N (Workflow 01) com o conteúdo da mensagem
3. Recebe de volta a resposta da Bia via API REST e envia ao cliente

O app Next.js usa a API do Chatwoot para:
- Enviar disparos de campanhas de marketing
- Enviar lembretes de agendamento (via N8N workflows 02 e 03)
- Exibir status de conexão do WhatsApp na página `/settings/instances`

---

## Instância em produção

| Campo | Valor |
|---|---|
| URL | `http://chatai.agenticx.ia.br:3002` |
| Account ID | `1` |
| Inbox ID | `158` |

---

## Variáveis de ambiente

Configure no Firebase App Hosting (console → App Hosting → seu backend → Variáveis de ambiente):

| Variável | Valor | Onde obter |
|---|---|---|
| `CHATWOOT_URL` | `http://chatai.agenticx.ia.br:3002` | URL do servidor |
| `CHATWOOT_ACCOUNT_ID` | `1` | Chatwoot → Settings → Account Settings → Account ID |
| `CHATWOOT_API_TOKEN` | `kkTHN6oueANaV1pMu4DNoPRp` | Chatwoot → Profile Settings → Access Token |
| `CHATWOOT_INBOX_ID` | `158` | Chatwoot → Settings → Inboxes → ID numérico na URL |

No `.env.local` (desenvolvimento local) as mesmas variáveis já estão configuradas.

---

## Como obter cada valor no Chatwoot

### Account ID
1. Acesse o painel do Chatwoot como admin
2. Vá em **Settings → Account Settings**
3. O Account ID aparece na URL: `chatwoot.com/app/accounts/**1**/settings/...`

### API Token
1. Clique no avatar (canto inferior esquerdo) → **Profile Settings**
2. Role até **Access Token**
3. Copie o token (ex: `kkTHN6oueANaV1pMu4DNoPRp`)

> Este token é pessoal e tem as permissões do usuário logado. Para produção, use um usuário de serviço dedicado ou o token admin da conta.

### Inbox ID
1. Vá em **Settings → Inboxes**
2. Clique em **Settings** na inbox do WhatsApp
3. O ID aparece na URL: `.../inboxes/**158**/settings`

---

## Como criar a Inbox WhatsApp (primeira vez)

> O fork fazer-ai suporta WhatsApp via Baileys. Estas etapas assumem que o servidor já está rodando com suporte a WhatsApp.

1. No Chatwoot, vá em **Settings → Inboxes → Add Inbox**
2. Selecione **WhatsApp (Baileys)**
3. Dê um nome (ex: "Del Pierro WhatsApp")
4. Salve — um QR Code será exibido
5. Escaneie o QR com o WhatsApp do número da barbearia
6. Aguarde `status: connected`
7. Anote o **Inbox ID** gerado na URL

---

## Como configurar o Webhook (N8N ← Chatwoot)

O Chatwoot precisa notificar o N8N quando uma mensagem chega.

1. No Chatwoot, vá em **Settings → Integrations → Webhooks**
2. Clique em **Add new webhook**
3. Preencha:
   - **URL:** URL do N8N + path do workflow (ex: `https://n8n.agenticx.ia.br/webhook/delpierro-chatwoot`)
   - **Eventos:** marque `Message Created` e `Conversation Created`
4. Salve

> O path exato do webhook está no nó de trigger do Workflow 01 (`docs/n8n/01. DelPierro Chatwoot.json`).

---

## Verificar conexão pelo app

Acesse a URL de debug (requer autenticação de admin):

```
GET /api/debug/chatwoot
```

Retorna um JSON com:
- Status de cada variável de ambiente
- Resposta da API do Chatwoot para a inbox
- Estado da conexão WhatsApp (`provider_connection.connection`)

Exemplo de resposta quando conectado:
```json
{
  "envCheck": {
    "CHATWOOT_URL": "✅ http://chatai.agenticx.ia.br:3002",
    "CHATWOOT_ACCOUNT_ID": "✅ 1",
    "CHATWOOT_INBOX_ID": "✅ 158",
    "CHATWOOT_API_TOKEN": "✅ kkTHN..."
  },
  "httpOk": true,
  "provider_connection": {
    "connection": "open",
    "qr_data_url": null
  }
}
```

---

## Página de status no app

A página **Configurações → WhatsApp** (`/settings/instances`) exibe:
- Status da conexão (`Conectado` / `Desconectado`)
- QR Code quando desconectado (polling automático a cada 3s)
- Botão para atualizar manualmente

Quando o status é `disconnected` ou `close` e não há QR Code, o app dispara automaticamente `POST /inboxes/:id/setup_channel_provider` para reiniciar o worker Baileys.

---

## Fluxo de envio de mensagem (campanhas)

O app usa a função `sendWhatsAppMessage()` em `src/lib/chatwoot-client.ts`:

```
1. Normalizar número → 12 dígitos sem + (ex: 556199123456)
2. Buscar contato por telefone → criar se não existir
3. Buscar conversa aberta na inbox → criar se não existir
4. Enviar mensagem com message_type: "outgoing"
```

---

## Tokens e segurança

- O `CHATWOOT_API_TOKEN` é o token do usuário admin — **não commitá-lo no repositório**
- Já está no `.gitignore` via `.env.local`
- No Firebase App Hosting, salve-o como **secret** (não como variável simples)

---

## Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| Campanha enviada mas cliente não recebe | WhatsApp desconectado | Verificar `/settings/instances` e escanear QR |
| `/api/debug/chatwoot` retorna 500 | Variável de ambiente faltando | Verificar Firebase App Hosting → Variáveis |
| `provider_connection.connection = "close"` | Sessão expirou | O app tenta reconectar automaticamente; se persistir, escanear QR novamente |
| Mensagens chegam ao Chatwoot mas N8N não responde | Webhook não configurado ou URL errada | Verificar Settings → Integrations → Webhooks no Chatwoot |
| N8N responde mas cliente não recebe | Inbox ID errado no N8N | Verificar variável `CHATWOOT_INBOX_ID` e credencial Chatwoot no N8N |
