# Documentação — Barbearia Del Pierro

> Sistema de gestão completo de barbearia. **v1.0.0** — Pronto para produção.  
> Next.js 15 + Supabase + Firebase + N8N + Chatwoot

**Data de Entrega**: 16 de abril de 2026  
**Status**: ✅ COMPLETO E VALIDADO

---

## 📑 Índice de Documentação

### 🚀 Para Começar
- **[GUIA_ENTREGA.md](GUIA_ENTREGA.md)** — Status final, features implementadas, checklist pré-produção
- **[GUIA_REPLICACAO.md](GUIA_REPLICACAO.md)** — Como criar instâncias para novos clientes com `barbearia-replicator.sh`

### 📚 Referência Técnica
- **[ARQUITETURA.md](ARQUITETURA.md)** — Stack, módulos, fluxos de integração, diagramas
- **[DEPLOY.md](DEPLOY.md)** — Setup local, deploy Firebase, variáveis de ambiente
- **[SUPABASE.md](SUPABASE.md)** — Banco de dados, migrations, schema, credenciais
- **[API.md](API.md)** — Endpoints REST `/api/v1/*`, autenticação, exemplos cURL
- **[N8N.md](N8N.md)** — Workflows de automação, agente Bia, ferramentas integradas
- **[CHATWOOT.md](CHATWOOT.md)** — WhatsApp, campanhas, configuração de inbox

### ✅ Validação e Testes
- **[QA_FINAL.md](QA_FINAL.md)** — 138 testes QA cobrindo 17 módulos, checklist completo

---

## 🎯 Quickstart (5 minutos)

### Local
```bash
# 1. Clonar e instalar
git clone <repo> barbearia && cd barbearia
npm install

# 2. Criar .env.local (copiar de DEPLOY.md)
cp .env.example .env.local
# Preencher chaves Supabase, Firebase, etc

# 3. Rodar
npm run dev
# Abrir http://localhost:3000

# 4. Login teste
# Email: admin@barbearia.com.br
# Senha: admin123456
```

### Para Novo Cliente
```bash
# 1. Criar arquivo de config
cat > input/novo_cliente.yaml <<EOF
cliente_nome: "Barbearia Novo"
logo_url: "https://..."
supabase:
  url: "https://..."
  service_role_key: "..."
  anon_key: "..."
firebase:
  project_id: "..."
  web_api_key: "..."
  auth_domain: "..."
EOF

# 2. Rodar replicador
./barbearia-replicator.sh input/novo_cliente.yaml

# 3. Cliente pronto em ./clientes/novo_cliente/
cd clientes/novo_cliente
npm run dev
```

👉 Ver detalhes em [GUIA_REPLICACAO.md](GUIA_REPLICACAO.md)

---

## 📊 Estrutura da Documentação

```
docs/
├── README.md                  # Você está aqui
├── GUIA_ENTREGA.md           # Status final (v1.0.0)
├── GUIA_REPLICACAO.md        # Script de replicação
├── ARQUITETURA.md            # Design do sistema
├── DEPLOY.md                 # Deploy em produção
├── SUPABASE.md               # Banco de dados
├── API.md                    # REST API
├── N8N.md                    # Automações
├── CHATWOOT.md               # WhatsApp/Chat
├── QA_FINAL.md               # Testes (138 casos)
├── ARCHIVED/                 # Docs antigas (referência)
│   └── PENDENCIAS.md         # Funcionalidades fora de escopo
└── n8n/                      # Workflows N8N (JSON)
    ├── 01. DelPierro Chatwoot.json
    ├── 02. Lembrete (1h).json
    └── 03. Follow up.json
```

---

## 🔧 Fluxo de Uso Típico

### 1️⃣ **Admin Cria Nova Unidade**
```bash
./barbearia-replicator.sh input/unidade_sao_paulo.yaml
# → Nova instância em ./clientes/unidade_sao_paulo/
```

### 2️⃣ **Profissional Usa o Sistema**
```
Login com email + senha (criado no setup)
  ↓
Ver agenda (seus horários)
  ↓
Receber lembretes N8N
  ↓
Gerar comissões no período
```

### 3️⃣ **Cliente Recebe Automações**
```
Agendamento feito no site/WhatsApp
  ↓
N8N Agente Bia confirma
  ↓
Google Calendar sincroniza
  ↓
1h antes: lembrete automático
  ↓
Finalizar: lança no financeiro
  ↓
2h depois: follow-up automático
```

### 4️⃣ **Admin Consulta Relatórios**
```
Dashboard → Financeiro (período)
  ↓
Relatório de comissões por profissional
  ↓
Exportar Excel/PDF
```

---

## 📱 Módulos Disponíveis

| Módulo | Status | Descrição |
|---|---|---|
| **Agenda** | ✅ Pronto | Calendário com drag-drop, sincronização Google Calendar |
| **Financeiro** | ✅ Pronto | Lançamentos, categorias, conciliação, carteira digital |
| **Profissionais** | ✅ Pronto | Cadastro com comissões, horários, folgas |
| **Serviços** | ✅ Pronto | Catálogo com insumos e cálculo de custo |
| **Estoque** | ✅ Pronto | Movimentações com histórico, baixa automática |
| **Contatos** | ✅ Pronto | CRM integrado, criação inline na agenda |
| **Campanhas** | ✅ Pronto | WhatsApp com agendamento, estatísticas |
| **Relatórios** | ✅ Pronto | Excel/PDF exportáveis (Agenda, Financeiro, Comissões) |
| **Dashboard** | ✅ Pronto | Visão operacional em tempo real |

---

## 🔐 Segurança

- ✅ Firebase Auth (email + senha)
- ✅ Row-Level Security (RLS) no Supabase
- ✅ API keys rotacionadas
- ✅ Webhooks com HMAC
- ✅ Soft-delete (sem exclusão física)

⚠️ **Antes de produção**, revisar:
- [ ] .env.production preenchido
- [ ] Webhooks Pagar.me configurados
- [ ] CORS configurado
- [ ] Backups habilitados
- [ ] Monitoramento ativado

Checklist completo em [GUIA_ENTREGA.md](GUIA_ENTREGA.md#-segurança-em-produção)

---

## 🐛 Troubleshooting Rápido

| Problema | Solução |
|---|---|
| "Não trabalha na Segunda" | Ver [DEPLOY.md#pontos-de-atenção](DEPLOY.md#pontos-de-atenção) |
| Agendamentos não criam cliente | Confirmado fixado em v1.0.0 |
| Campanhas mostram duplicadas | Corrigido em v1.0.0 |
| Login com senha não funciona | Usar `createStaffWithAuth` ao criar profissional |

Mais detalhes em [GUIA_ENTREGA.md#-suporte-e-troubleshooting](GUIA_ENTREGA.md#-suporte-e-troubleshooting)

---

## 📞 Suporte

**Documentação específica?**
- Deploy: [DEPLOY.md](DEPLOY.md)
- API: [API.md](API.md)
- Banco de dados: [SUPABASE.md](SUPABASE.md)
- Automações N8N: [N8N.md](N8N.md)
- WhatsApp: [CHATWOOT.md](CHATWOOT.md)
- Novo cliente: [GUIA_REPLICACAO.md](GUIA_REPLICACAO.md)

**Erro reproduzível?** Seguir checklist de [QA_FINAL.md](QA_FINAL.md)

---

## 📊 Métricas de Entrega

| Métrica | Valor |
|---|---|
| **Commits** | 50+ (histórico limpo) |
| **Testes QA** | 138 casos (17 módulos) |
| **Documentação** | 10+ guias |
| **API Endpoints** | 25+ |
| **Workflows N8N** | 3 + crons |
| **Integrações** | 5 (N8N, Chatwoot, Google Cal, Pagar.me, Firebase) |
| **Cobertura de Features** | 100% do escopo entregue |

---

## 📋 Próximos Passos Sugeridos

**Curto Prazo (1-2 semanas)**
1. Treinar equipe com [QA_FINAL.md](QA_FINAL.md)
2. Criar usuários reais para franquias
3. Testar fluxo completo de pagamento PIX

**Médio Prazo (1-2 meses)**
1. Dashboard para franqueador (múltiplas unidades)
2. Relatórios avançados (tendências, comparativo)
3. Integração com RH

**Longo Prazo (3+ meses)**
1. Split payment automático
2. Saque de carteira digital
3. Mobile app (Capacitor)

---

## 📄 Metadados

| Campo | Valor |
|---|---|
| **Versão** | 1.0.0 |
| **Data de Entrega** | 2026-04-16 |
| **Status** | ✅ Completo |
| **Licença** | Propriedade Leandro Barbearia |
| **Desenvolvido por** | DBL Tecnologia |
| **Tech Lead** | Diego |

---

**Leia primeiro**: [GUIA_ENTREGA.md](GUIA_ENTREGA.md) para visão completa  
**Comece por**: [DEPLOY.md](DEPLOY.md) se for primeiro setup  
**Novo cliente?**: [GUIA_REPLICACAO.md](GUIA_REPLICACAO.md)

