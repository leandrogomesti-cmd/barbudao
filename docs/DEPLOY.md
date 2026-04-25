# Deploy e Ambiente — Barbearia Del Pierro

## URLs

| Ambiente | URL |
|---|---|
| **Produção** | https://barbearia--dbltecnologia-de408.us-east4.hosted.app |
| **Firebase Console** | https://console.firebase.google.com/project/dbltecnologia-de408 |
| **Supabase** | https://supabase.com/dashboard/project/qtfmjdcheidhdmdnmjle |

---

## Rodar localmente

```bash
# Node 22 obrigatório
source ~/.nvm/nvm.sh && nvm use 22

# Instalar dependências
npm install

# Subir servidor de desenvolvimento
npm run dev
```

O app estará disponível em `http://localhost:3000`.

---

## .env.local

Crie o arquivo `.env.local` na raiz do projeto (nunca commitar — está no `.gitignore`):

```env
# Supabase (projeto qtfmjdcheidhdmdnmjle)
SUPABASE_URL=https://qtfmjdcheidhdmdnmjle.supabase.co
SUPABASE_KEY=<service_role_key>
SUPABASE_ANON_KEY=<anon_key>

# App API Key (mesma configurada no N8N)
APP_API_KEY=7f0932c1-2a1e-4b9e-8c0d-3f0b21a8c4e5

# Chatwoot
CHATWOOT_URL=http://chatai.agenticx.ia.br:3002
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_API_TOKEN=<token_admin>
CHATWOOT_INBOX_ID=158

# Para migrations via script
DATABASE_URL=postgresql://postgres:[SENHA]@db.qtfmjdcheidhdmdnmjle.supabase.co:5432/postgres
```

Chaves Supabase em: **Dashboard → Settings → API**
Senha do banco em: **Dashboard → Settings → Database → Connection string**

---

## Deploy

O deploy é **automático via git push**:

```bash
git push origin main
# → Firebase App Hosting detecta o push e inicia build + deploy automaticamente
```

Para acompanhar: **Firebase Console → App Hosting → barbearia → Deployments**

---

## Variáveis de ambiente em produção

Gerenciadas em: **Firebase Console → App Hosting → barbearia → Environment variables**

| Variável | Descrição |
|---|---|
| `APP_API_KEY` | Chave compartilhada com N8N |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_KEY` | Chave service_role do Supabase |
| `SUPABASE_ANON_KEY` | Chave anon do Supabase |
| `CHATWOOT_URL` | URL do servidor Chatwoot |
| `CHATWOOT_ACCOUNT_ID` | ID da conta no Chatwoot |
| `CHATWOOT_API_TOKEN` | Token de acesso à API Chatwoot |
| `CHATWOOT_INBOX_ID` | ID da inbox WhatsApp no Chatwoot |
| `PAGARME_SECRET_KEY_LIVE` | Chave secreta live do Pagar.me |
| `PAGARME_WEBHOOK_SECRET` | Secret para validar webhooks do Pagar.me |

---

## Rodar migrations

```bash
# Com DATABASE_URL configurado no .env.local
node scripts/run-migration.mjs docs/migrations/<arquivo>.sql
```

---

## Build local

```bash
npm run build
# Deve concluir sem erros. Requer Node 22.
```

---

## Pontos de atenção

- **Node 22 obrigatório** — o sistema pode ter Node 12 como padrão. Sempre usar NVM.
- **Chatwoot** — porta 3002, HTTP (não HTTPS), token do usuário admin
- **Multi-unidade** — `profissionais.unidade_padrao` e `controle_atendimentos.unidade` são texto livre; devem coincidir exatamente para filtros funcionarem
- **N8N salva agendamentos direto no Supabase** — sem passar pela API do app. O app normaliza status snake_case automaticamente ao ler os dados.
