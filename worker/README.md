# Worker Scripts - All Group Coffee

Diretório contendo scripts Python de processamento em background para automação de tarefas críticas.

---

## 📋 Scripts Disponíveis

### 1. `consolidador_financeiro.py`
**Função:** Consolida dados financeiros de `fechamentos_caixa` na tabela `financeiro_consolidado_diario`.

**Lógica:**
- Busca fechamentos dos **últimos 5 dias** (captura correções tardias)
- Agrupa por `loja_id + data_referencia` (com correção timezone BRT)
- Calcula:
  - `valor_total_oficial`: Soma de `valor_declarado`
  - `qtd_fechamentos`: Contagem de registros
  - `ultimo_gerente_responsavel`: Último gerente que fechou
- Executa **UPSERT** (ON CONFLICT UPDATE) para evitar duplicatas
- **Paginação automática** (suporta >1000 registros)

**Modos de Execução:**

```bash
# Execução única (últimos 5 dias)
python3 consolidador_financeiro.py

# Modo Loop (automático a cada 1 hora)
python3 consolidador_financeiro.py --loop

# Modo Full (recalcula histórico desde 2023)
python3 consolidador_financeiro.py --full
```

**Rodar em Background:**
```bash
screen -S consolidador
python3 consolidador_financeiro.py --loop
# Pressione Ctrl+A, D para desanexar
# Reconectar: screen -r consolidador
```

---

### 2. `relatorio_admin.py`
**Função:** Gera e envia relatório financeiro consolidado (últimos 7 dias) via WhatsApp para administradores.

**Como funciona:**
- Busca administradores na tabela `contatos_erp` (role = STRATEGIC)
- Filtra lojas de teste/sistema usando `utils.filtrar_admin()`
- Gera relatório com:
  - Top 5 lojas por faturamento
  - Total geral consolidado
  - Número de lojas ativas
- Envia via Z-API (Reports)

**Execução Manual:**
```bash
python3 relatorio_admin.py
```

**Agendamento via Cron (diário às 8h):**
```bash
0 8 * * * cd /caminho/para/Disparador/worker && python3 relatorio_admin.py >> logs/relatorio_admin.log 2>&1
```

---

### 3. `relatorio_admin_ontem.py`
**Função:** Gera e envia relatório do **dia anterior** (00:00 - 23:59) via WhatsApp.

**Diferenças:**
- Específico para relatório do dia anterior
- Salva histórico de mensagens no Supabase (contexto para Secretária n8n)
- Usa mesma lógica de filtros e envio do `relatorio_admin.py`

**Agendamento Recomendado:**
```bash
0 8 * * * cd /caminho/para/Disparador/worker && python3 relatorio_admin_ontem.py >> logs/diario/relatorio.log 2>&1
```

---

### 4. `worker_relatorios.py`
**Função:** Processa fila de geração de relatórios personalizados.

**Como funciona:**
- Monitora tabela de jobs/fila no Supabase
- Busca dados via API
- Gera arquivos (PDF, Excel) usando `PDFRelatorio` class
- Envia documentos via Z-API (conversão Base64)
- Loop contínuo de processamento

**Execução:**
```bash
python3 worker_relatorios.py
```

---

### 5. `cron_campaigns.py`
**Função:** Worker de campanhas de WhatsApp (agendadas e recorrentes).

**Funcionalidades:**
- Verifica campanhas agendadas no horário
- Processa contatos da tabela `contatos_erp`
- Envia mensagens via Z-API
- Cria missões automaticamente no Supabase
- Suporta campanhas recorrentes e únicas
- Validação de integridade de dados

**Execução:**
```bash
python3 cron_campaigns.py
```

**Nota:** Script refatorado para usar **apenas Supabase** (migração do Firestore completa).

---

### 6. `relatorio_pdf_generator.py`
**Função:** Gerador especializado de PDFs avançados com ReportLab.

---

### 7. `api_relatorios.py`
**Função:** API Flask para exposição de endpoints de relatórios.

**Execução:**
```bash
python3 api_relatorios.py
```

---

## 🧪 Scripts de Teste

- `test_relatorio.py` - Testes unitários de relatórios
- `teste_gerar_pdfs.py` - Testes de geração de PDF
- `teste_relatorios_whatsapp.py` - Testes de envio via WhatsApp

---

## 🛠️ Utilitários (`utils.py`)

Funções auxiliares compartilhadas:

### `safe_execute(query_builder)`
Executa queries Supabase com retry automático:
- Trata erros de Gateway (502, 503, 504)
- Backoff exponencial (até 5 tentativas)
- Reconexão automática

### `formatar_data_br(data_iso)`
Converte data ISO para formato brasileiro (DD/MM/YYYY).

### `filtrar_admin(nome, role)`
Filtra lojas/usuários administrativos ou de teste:
- Exclui nomes contendo "admin" ou "sistema"
- Exclui role = STRATEGIC (administradores)
- Retorna `True` se deve ser excluído do relatório

---

## 📦 Instalação

### 1. Criar Ambiente Virtual
```bash
cd worker
python3 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows
```

### 2. Instalar Dependências
```bash
pip install -r requirements.txt
```

---

## ⚙️ Configuração (Variáveis de Ambiente)

Crie um arquivo `.env` na **raiz do projeto** (não no worker/) com:

```env
# Supabase
SUPABASE_URL=https://qtfmjdcheidhdmdnmjle.supabase.co
SUPABASE_KEY=your_service_role_key_here

# Z-API (WhatsApp)
ZAPI_INSTANCE_REPORTS=your_instance_id
ZAPI_TOKEN_REPORTS=your_token
ZAPI_CLIENT_TOKEN_REPORTS=your_client_token

# Opcional (API)
API_BASE_URL=https://notificacoes.dbltecnologia.com.br
ERP_API_KEY=your_api_key
```

**Nota:** Use o arquivo `env.example` como referência para as variáveis necessárias.

---

## 📊 Logs

Todos os scripts usam **Loguru** para logging estruturado.

### Estrutura de Logs
```
worker/
├── logs/
│   ├── diario/          # Logs de relatórios diários
│   └── README.md
```

### Ver Logs em Tempo Real
```bash
# Consolidador financeiro
tail -f logs/consolidador.log

# Relatórios administrativos
tail -f logs/relatorio_admin.log

# Relatórios diários
tail -f logs/diario/relatorio.log
```

---

## 🚀 Dicas de Produção

### Rodar em Background com Screen
```bash
# Criar sessão nomeada
screen -S worker_name

# Rodar script
python3 script.py --loop

# Desanexar: Ctrl+A, D
# Reconectar: screen -r worker_name
# Listar sessões: screen -ls
# Matar sessão: screen -X -S worker_name quit
```

### Agendamento com Cron
```bash
# Editar crontab
crontab -e

# Exemplos:
# Relatório admin diário às 8h
0 8 * * * cd /path/to/worker && python3 relatorio_admin_ontem.py >> logs/diario/relatorio.log 2>&1

# Consolidador a cada 30 minutos
*/30 * * * * cd /path/to/worker && python3 consolidador_financeiro.py >> logs/consolidador.log 2>&1
```

### Monitoramento
```bash
# Ver processos Python rodando
ps aux | grep python

# Ver sessões screen ativas
screen -ls

# Verificar uso de memória
free -h
```

---

## 🔧 Troubleshooting

### Erro: "SUPABASE_URL não definido"
- Verifique se o arquivo `.env` existe na raiz do projeto
- Confirme que as variáveis estão corretas

### Erro de Gateway (502/503/504)
- Normal em instâncias Supabase gratuitas (cold start)
- A função `safe_execute()` já trata automaticamente
- Aguarde alguns segundos e tente novamente

### Script não encontra módulos
- Ative o ambiente virtual: `source .venv/bin/activate`
- Reinstale dependências: `pip install -r requirements.txt`

---

## 📝 Dependências (`requirements.txt`)

```txt
supabase==2.11.0          # Cliente Supabase
loguru==0.7.3             # Logging estruturado
python-dotenv==1.0.0      # Variáveis de ambiente
requests==2.32.3          # HTTP requests (Z-API)
pandas==2.2.3             # Processamento de dados
fpdf==1.7.2               # Geração de PDF (simples)
XlsxWriter==3.2.0         # Geração de Excel
reportlab==4.0.7          # Geração de PDF (avançado)
flask==3.0.0              # API REST
```

---

## 🔒 Segurança e Testes

Para testar os scripts sem enviar mensagens para todos os administradores reais, use a variável de ambiente `TEST_PHONE_ONLY`.

**Exemplo:**
```bash
# Envia APENAS para o número especificado (ignora lista real de admins)
TEST_PHONE_ONLY=5561999999999 python3 relatorio_admin_ontem.py
```

Isso é útil para desenvolvimento e validação antes do deploy em produção.
