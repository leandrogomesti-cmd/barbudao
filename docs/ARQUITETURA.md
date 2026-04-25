# Arquitetura — Barbearia Del Pierro

## Stack

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router) | 15 |
| Linguagem | TypeScript | 5 |
| Banco de dados | Supabase (PostgreSQL) | 2.90 |
| Autenticação | Firebase Auth | 12 |
| Hosting | Firebase App Hosting | — |
| Agente IA | N8N + Google Gemini | — |
| WhatsApp | Chatwoot + Baileys | — |
| Pagamentos | Pagar.me | — |
| AI (campanhas) | Google Genkit | — |

---

## Módulos do App

| Módulo | Rota | Descrição |
|---|---|---|
| Dashboard | `/dashboard` | KPIs, gráfico de receita, filtro por unidade/data |
| Agenda | `/agenda` | Calendário com drag & drop, fila de espera, bloqueios |
| Profissionais | `/staff` | CRUD, soft-delete, comissões, horários/folgas |
| Comissões | `/staff/commissions` | Relatório por profissional e período |
| Serviços | `/services` | CRUD com categorias, insumos, custo e margem |
| Contatos | `/contacts` | CRM com busca, aceita_marketing, proteção de histórico |
| Estoque | `/inventory` | CRUD produtos, movimentações, alerta de estoque mínimo |
| Financeiro | `/finance` | Lançamentos manuais, categorias, conciliação OFX/CSV |
| Campanhas | `/campaigns` | Campanhas WhatsApp com templates, agendamento e estatísticas |
| Carteira | `/wallet` | Depósito PIX via Pagar.me, QR Code dinâmico |

---

## Banco de Dados

**Projeto:** `qtfmjdcheidhdmdnmjle` — ver [SUPABASE.md](SUPABASE.md)

### Tabelas principais

| Tabela | Descrição |
|---|---|
| `profissionais` | Cadastro de profissionais com comissões, RBAC e horários |
| `horarios_profissional` | Horários de funcionamento por profissional/dia |
| `folgas_profissional` | Datas de folga por profissional |
| `servicos` | Serviços com preço, duração e categoria |
| `servico_insumos` | Relação N:N serviço ↔ produto (insumos por serviço) |
| `controle_atendimentos` | Agendamentos com status, profissional, serviço, Google Calendar ID |
| `contatos_erp` | Contatos/clientes unificados (fonte única de verdade) |
| `produtos` | Estoque com categorias e quantidade mínima |
| `movimentacoes_estoque` | Histórico de entradas/saídas de estoque |
| `financeiro` | Lançamentos financeiros categorizados |
| `categorias_financeiras` | Categorias de receita e despesa |
| `campanhas` | Campanhas WhatsApp com status e agendamento |
| `campanhas_envios` | Registros individuais de envio por contato |
| `empresas_erp` | Unidades/lojas da rede |
| `n8n_historico_mensagens` | Memória de conversas do agente IA (por session_id) |

### Status de agendamento

Definidos centralmente em `src/lib/constants.ts`:

| snake_case (N8N) | Padrão do app |
|---|---|
| `aguardando_confirmacao` | Aguardando Confirmação |
| `confirmado` | Confirmado |
| `cancelado` | Cancelado |
| `finalizado` | Finalizado |
| `em_atendimento` | Em atendimento |
| `nao_apareceu` | Não apareceu |

O app normaliza automaticamente o formato snake_case ao receber dados do N8N.

---

## Fluxo de Integração

### N8N → App (agendamento via WhatsApp)

```
Cliente (WhatsApp)
  → Chatwoot (webhook)
  → N8N Workflow 01
    ├── Triagem (Gemini AI)
    ├── Bia responde (Gemini AI com system prompt)
    ├── verificar_agenda → Google Calendar API
    ├── agendar_no_google → Google Calendar API
    ├── salvar_agendamento_banco → Supabase REST
    └── Envia confirmação → Chatwoot API
```

### N8N → App (lembretes e follow-up)

```
N8N Workflow 02 (cron a cada 10min)
  → SELECT controle_atendimentos WHERE inicio_agendado BETWEEN now+60 AND now+70
  → Para cada agendamento sem lembrete_enviado_em:
    ├── Envia mensagem → Chatwoot API
    └── PATCH lembrete_enviado_em = now()

N8N Workflow 03 (cron a cada 15min)
  → SELECT controle_atendimentos WHERE status = Finalizado AND followup_enviado_em IS NULL
  → Para cada atendimento finalizado há 2+ horas:
    ├── Envia avaliação → Chatwoot API
    └── PATCH followup_enviado_em = now()
```

### App → Serviços externos

```
App (campanhas)
  → Genkit AI (geração de mensagens personalizadas)
  → Chatwoot API (envio WhatsApp)
  → Supabase (registro de status por envio)

App (carteira)
  → Pagar.me API (geração QR Code PIX)
  ← Pagar.me Webhook (confirmação de pagamento)
```

---

## RBAC

Perfis definidos em `profissionais.perfil_acesso`:

| Perfil | Acesso |
|---|---|
| `ADMIN` | Tudo |
| `GERENTE` | Todas as unidades, sem configurações globais |
| `PROFISSIONAL` | Apenas própria agenda |
| `RECEPCAO` | Apenas própria unidade |
