# 💈 Barbearia — Plataforma de Gestão para Barbearias

> **Versão:** `1.0.0` | **Status:** ✅ Produção | **Desenvolvido por:** [DBL Tecnologia](https://dbltecnologia.com.br)

Sistema SaaS completo para gestão de barbearias, desenvolvido com **Next.js 16**, **Firebase** e **Supabase**. Oferece agendamento inteligente, gestão de equipe, financeiro, campanhas de marketing via WhatsApp e muito mais — em uma única plataforma.

---

## ✨ Funcionalidades

| Módulo | Descrição |
|---|---|
| 📅 **Agenda** | Agendamentos online com seleção de profissional, serviço e horário |
| 👥 **Equipe (Staff)** | Gestão de barbeiros, comissões e desempenho |
| 💰 **Financeiro** | Caixa diário, relatórios de receita e extrato OFX |
| 🎯 **Campanhas** | Automação de marketing via WhatsApp (Chatwoot + n8n) |
| 📋 **Missões** | Tarefas operacionais diárias com validação |
| 📦 **Estoque** | Controle de produtos e insumos |
| 📊 **Dashboard** | KPIs em tempo real, gráficos e Monitor de Missões |
| 🤖 **Secretária IA** | Atendimento automatizado via WhatsApp com IA generativa |
| 🃏 **Kanban** | Quadro visual de tarefas e fluxo de trabalho |
| 👛 **Carteira** | Gestão de créditos e saldo do cliente |
| 👆 **Contatos (CRM)** | Base de clientes com histórico e funil |
| 🔔 **Assinaturas** | Planos e controle de recorrência |
| 📱 **App Mobile** | Interface PWA otimizada para o profissional |
| 🛡️ **Admin** | Painel administrativo com controle total |

---

## 🛠️ Stack Tecnológica

### Frontend
- **[Next.js 16](https://nextjs.org/)** + TypeScript 5 (App Router + Turbopack)
- **[React 19](https://react.dev/)** com Server Components e Server Actions
- **[Tailwind CSS 3](https://tailwindcss.com/)** + [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives)
- **[Recharts](https://recharts.org/)** — Gráficos e visualizações
- **[React Hook Form](https://react-hook-form.com/)** + Zod — Formulários com validação

### Backend & Dados
- **[Firebase](https://firebase.google.com/)** — Auth, Firestore (dados em tempo real), App Hosting
- **[Supabase](https://supabase.com/)** (PostgreSQL) — Dados relacionais, financeiro e agenda
- **[Drizzle ORM](https://orm.drizzle.team/)** — Type-safe queries para o banco relacional

### Integrações
- **[Chatwoot](https://www.chatwoot.com/)** — Central de atendimento WhatsApp
- **[n8n](https://n8n.io/)** — Automação de workflows e campanhas
- **[Google Genkit](https://firebase.google.com/docs/genkit)** + Gemini — IA generativa para a Secretária
- **[Pagar.me](https://pagar.me/)** — Gateway de pagamento

### Workers (Python)
- Worker de consolidação financeira diária
- Worker de relatórios automáticos via WhatsApp
- Worker de campanhas agendadas

---

## 📁 Estrutura do Projeto

```
Barbearia/
├── src/
│   ├── app/
│   │   ├── (app)/              # Rotas autenticadas (dashboard)
│   │   │   ├── agenda/         # Módulo de agendamento
│   │   │   ├── campaigns/      # Campanhas de marketing
│   │   │   ├── contacts/       # CRM de clientes
│   │   │   ├── dashboard/      # Painel principal
│   │   │   ├── finance/        # Módulo financeiro
│   │   │   ├── inventory/      # Estoque
│   │   │   ├── kanban/         # Quadro Kanban
│   │   │   ├── missions/       # Missões operacionais
│   │   │   ├── secretary/      # Secretária IA
│   │   │   ├── services/       # Serviços da barbearia
│   │   │   ├── staff/          # Gestão de equipe
│   │   │   ├── subscriptions/  # Assinaturas e planos
│   │   │   ├── trello/         # Quadro de tarefas
│   │   │   └── wallet/         # Carteira digital
│   │   ├── (mobile)/           # Interface mobile (PWA)
│   │   ├── admin/              # Painel administrativo
│   │   ├── api/                # Rotas de API (webhooks, etc.)
│   │   ├── login/              # Autenticação
│   │   └── signup/             # Cadastro
│   ├── components/             # Componentes React reutilizáveis
│   │   ├── ui/                 # Design system (shadcn/ui)
│   │   ├── dashboard/          # Widgets do dashboard
│   │   ├── campaigns/          # Componentes de campanhas
│   │   ├── secretary/          # Componentes da Secretária IA
│   │   └── guardian/           # Monitor de integridade do sistema
│   ├── lib/
│   │   ├── actions/            # Server Actions do Next.js
│   │   ├── firebase/           # Inicialização Firebase (client/admin)
│   │   ├── supabase/           # Inicialização Supabase (client/admin)
│   │   └── types/              # Tipos TypeScript globais
│   └── hooks/                  # Custom React hooks
├── worker/                     # Workers Python (executados no servidor)
│   ├── consolidador_financeiro.py
│   ├── worker_relatorios.py
│   ├── cron_campaigns.py
│   └── requirements.txt
├── uteis/                      # Scripts utilitários e de manutenção
├── docs/                       # Documentação técnica
├── firebase.json               # Configuração Firebase
├── apphosting.yaml             # Configuração App Hosting
└── package.json
```

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js 20+
- Python 3.11+
- Acesso ao Firebase e Supabase do projeto

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env.local` na raiz com:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Server-side)
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PROJECT_ID=

# Supabase
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_ANON_KEY=

# Chatwoot
CHATWOOT_URL=
CHATWOOT_ACCOUNT_ID=
CHATWOOT_API_TOKEN=
CHATWOOT_INBOX_ID=

# n8n
N8N_URL=

# Pagar.me
PAGARME_SECRET_KEY_LIVE=
PAGARME_WEBHOOK_SECRET=
```

### 3. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## ☁️ Deploy (Firebase App Hosting)

```bash
# Build de produção
npm run build

# Deploy via Firebase CLI
firebase deploy --only hosting
```

O deploy é configurado automaticamente via `apphosting.yaml`. As variáveis de ambiente são gerenciadas pelo painel do Firebase App Hosting.

---

## 🐍 Workers Python

```bash
cd worker

# Instalar dependências
pip install -r requirements.txt

# Consolidador financeiro (executado pelo cron diário)
python consolidador_financeiro.py

# Worker de relatórios WhatsApp
python worker_relatorios.py

# Worker de campanhas
python cron_campaigns.py
```

---

## 🔒 Segurança

- Autenticação gerida pelo **Firebase Auth** (sessão server-side via cookies HttpOnly)
- Middleware Next.js protege todas as rotas autenticadas
- Regras do Firestore limitam acesso por `uid` do usuário autenticado
- Segredos gerenciados via variáveis de ambiente (nunca commitados)

---

## 📝 Changelog

Veja o arquivo [CHANGELOG.md](./CHANGELOG.md) para o histórico completo de versões.

---

## 🤝 Suporte e Contato

Desenvolvido e mantido por **DBL Tecnologia**.

- 🌐 Site: [dbltecnologia.com.br](https://dbltecnologia.com.br)
- 📧 Contato: contato@dbltecnologia.com.br

---

<div align="center">
  <sub>💈 Barbearia v1.0.0 — Feito com ❤️ por DBL Tecnologia</sub>
</div>
