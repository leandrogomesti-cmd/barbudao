# Guia de Replicação — Barbearia Del Pierro

> Como criar instâncias customizadas do sistema para novos clientes, franquias ou testes.

---

## 📋 Visão Geral

O script **`barbearia-replicator.sh`** automatiza a criação de um novo projeto para um cliente, incluindo:

- Clonagem do repositório template
- Customização de marca (nome, logo, cores)
- Configuração do banco de dados (Supabase)
- Configuração de autenticação (Firebase)
- Integração com automações (N8N, Chatwoot)
- Setup de pagamentos (Pagar.me)
- Criação de usuários de teste
- Deploy automático (opcional)

**Tempo estimado**: 10-15 minutos por cliente (sem deploy)

---

## 🔧 Pré-requisitos

### Sistema
- macOS/Linux (bash 4.0+)
- Git instalado e configurado
- Node.js 22+
- npm 10+
- Python 3.8+ (para geração de ícones Android)

### Acessos e Credenciais
- Repositório GitHub (pessoal ou organizacional)
- Projeto Supabase criado (ou credenciais fornecidas)
- Projeto Firebase criado (ou credenciais fornecidas)
- Token N8N (se usar agendamentos automáticos)
- Token Chatwoot (se usar WhatsApp)
- API Key Pagar.me (se usar pagamentos)

### Verificação Rápida
```bash
# Executar no terminal para confirmar
bash --version | head -1  # bash 4.0+
git --version
node --version  # v22.x.x
npm --version
python3 --version

# Se tudo OK, sair
echo "✅ Ambiente pronto"
```

---

## 📝 Preparação: Arquivo de Configuração

### Localização
```bash
# Criar dentro da pasta do script
input/meu_cliente.yaml
```

### Estrutura Básica (Obrigatória)

```yaml
# ============================================================================
# CONFIGURAÇÃO DO CLIENTE BARBEARIA
# ============================================================================

# Cliente / Franquia
cliente_nome: "Barbearia Exemplo"
logo_url: "https://cdn.exemplo.com/logo.png"
# Logo deve ser PNG com fundo transparente, mínimo 512x512px

# Cores da marca (opcional, padrão: azul)
cores:
  primaria: "#1F2937"      # Cinza escuro
  secundaria: "#3B82F6"    # Azul

# ============================================================================
# BANCO DE DADOS — SUPABASE
# ============================================================================

supabase:
  url: "https://xxxxx.supabase.co"
  service_role_key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  anon_key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  # 👆 Obter em: Supabase Dashboard → Settings → API

# ============================================================================
# AUTENTICAÇÃO — FIREBASE
# ============================================================================

firebase:
  project_id: "barbearia-exemplo-prod"
  web_api_key: "AIzaSyACMe3-tWotnrSt0Zo7Q4Yw5M9xPz..."
  auth_domain: "barbearia-exemplo-prod.firebaseapp.com"
  # 👆 Obter em: Firebase Console → Settings → General

# ============================================================================
# AUTOMAÇÕES — N8N
# ============================================================================

n8n:
  webhook_url: "https://n8n.ejemplo.com/webhook/salvar_agendamento_banco"
  api_key: "n8n_api_key_xxxxxxxx"
  # Deixar vazio para desativar automações
  # Usar quando cliente tiver próprio servidor N8N

# ============================================================================
# CHAT — CHATWOOT
# ============================================================================

chatwoot:
  url: "https://chatwoot.ejemplo.com"
  account_id: 1
  api_token: "token_admin_xxxxxxxx"
  inbox_id: 158
  # Deixar vazio para desativar WhatsApp
  # Inbox ID é obtido em: Chatwoot → Settings → Channels → WhatsApp

# ============================================================================
# PAGAMENTOS — PAGAR.ME
# ============================================================================

pagarme:
  live_key: "sk_live_xxxxxxxx"          # Production
  webhook_secret: "whsec_xxxxxxxx"      # Gerado no Pagar.me Dashboard
  # Deixar vazio para desativar PIX
  # ⚠️ NUNCA commitar chaves reais — usar environment variables em produção

# ============================================================================
# OPÇÕES DE DEPLOY (Opcional)
# ============================================================================

deploy:
  gerar_apk: false
  # Se true: gera APK Android assinado (requer Java 17+ e keystore)
  
  firebase_project: "barbearia-exemplo-prod"
  # Se preenchido: faz deploy automático em Firebase App Hosting
  
  github_repo: "https://github.com/exemplo/barbearia-clone"
  # Repositório do cliente para push automático
  
  criar_usuarios_teste: true
  # Se true: cria admin, profissional e recepcionista
```

### Exemplo Completo (Comentado)

```yaml
# 🏪 PIZZARIA EXEMPLO — Setup Completo
cliente_nome: "Pizzaria Delícia"
logo_url: "https://cdn.pizzaria.com.br/logo-delicia.png"

cores:
  primaria: "#EF4444"      # Vermelho pizza
  secundaria: "#F97316"    # Laranja

supabase:
  # Criar novo projeto em: https://supabase.com/dashboard/projects
  # Na tela de novo projeto, salvar estas credenciais
  url: "https://akjdfhkajdf.supabase.co"
  service_role_key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFramRmaGthamRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwOTMwMDAwMCwiZXhwIjoxNzcyMzcyMDAwfQ...."
  anon_key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFramRmaGthamRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDkzMDAwMDAsImV4cCI6MTc3MjM3MjAwMH0...."

firebase:
  # Criar novo projeto em: https://console.firebase.google.com/
  # Copiar valores de Settings → General
  project_id: "pizzaria-delicia-123"
  web_api_key: "AIzaSyBcDeFgHiJkLmNoPqRsTuVwXyZ123456789"
  auth_domain: "pizzaria-delicia-123.firebaseapp.com"

n8n:
  # ⚠️ Deixar vazio se o cliente não tiver N8N setup ainda
  webhook_url: "https://n8n.pizzaria.com.br/webhook/agendamentos"
  api_key: "n8n_xxxxxxxx"

chatwoot:
  # ⚠️ Deixar vazio se usar Chatwoot centralizado (mesmo para todos)
  url: "https://chatwoot.pizza.com.br"
  account_id: 2
  api_token: "zAl8HLnmr5P8QjXx9KhJm8NoPqRsT"
  inbox_id: 99

pagarme:
  # ⚠️ NUNCA commitar live keys — usar variáveis de ambiente
  live_key: "sk_live_dGVzdGluZ18x"
  webhook_secret: "whsec_test_xxxxxxxx"

deploy:
  gerar_apk: false  # Não gerar APK (é web)
  firebase_project: "pizzaria-delicia-123"  # Deploy automático
  github_repo: "https://github.com/pizzaria/sistema"
  criar_usuarios_teste: true
```

---

## 🚀 Execução do Script

### Passo 1: Preparar Arquivo de Config

```bash
# Dentro da pasta do replicador
cd /caminho/para/barbearia-replicator

# Criar arquivo de config
cat > input/pizzaria_exemplo.yaml <<'EOF'
cliente_nome: "Pizzaria Exemplo"
logo_url: "https://..."
# ... resto da config
EOF

# Validar YAML (opcional)
python3 -m yaml input/pizzaria_exemplo.yaml && echo "✅ YAML válido"
```

### Passo 2: Executar o Script

```bash
# Dar permissão de execução (primeira vez)
chmod +x barbearia-replicator.sh

# Rodar o script
./barbearia-replicator.sh input/pizzaria_exemplo.yaml

# Aguardar processamento...
# ✅ Será criada pasta: ./clientes/pizzaria_exemplo/
```

### Passo 3: Verificar Saída

```bash
# Arquivo deve ter sido criado
ls -la clientes/pizzaria_exemplo/

# Ver logs
cat clientes/pizzaria_exemplo/.env.production
cat clientes/pizzaria_exemplo/firebase.json | head -20
```

---

## ✅ Validação: Checklist Pós-Replicação

### Estrutura
```bash
cd clientes/pizzaria_exemplo

# ✅ Deve existir
[ -f "package.json" ] && echo "✅ package.json"
[ -d "src/app" ] && echo "✅ Estrutura Next.js"
[ -f ".env.production" ] && echo "✅ Variáveis de ambiente"
[ -f "firebase.json" ] && echo "✅ Configuração Firebase"
[ -f "apphosting.yaml" ] && echo "✅ Config App Hosting"
```

### Configuração
```bash
# Verificar variáveis injetadas
grep "NEXT_PUBLIC_APP_NAME" .env.production  # Deve ter "Pizzaria Exemplo"
grep "NEXT_PUBLIC_LOGO_URL" .env.production  # Deve ter URL da logo

# Verificar chaves Supabase
grep "NEXT_PUBLIC_FIREBASE_PROJECT_ID" .env.production  # Deve ter o ID

# Verificar sem erros no JSON
node -e "require('./firebase.json')" && echo "✅ firebase.json válido"
```

### Build Local
```bash
# Instalar dependências
npm install

# Build sem erros
npm run build 2>&1 | grep -i error
# Não deve ter erros de TypeScript ou build

# Se tudo OK
npm run dev
# Abrir http://localhost:3000 e testar login
```

---

## 🐛 Troubleshooting

### Erro: "Arquivo de configuração não encontrado"

```bash
# ❌ Errado
./barbearia-replicator.sh pizzaria_exemplo.yaml

# ✅ Correto
./barbearia-replicator.sh input/pizzaria_exemplo.yaml
```

### Erro: "YAML não pode ser parseado"

Verificar indentação do arquivo:
```bash
# Ver espaçamento
cat -A input/pizzaria_exemplo.yaml | head -20
# Deve usar espaços (não tabs)

# Validar sintaxe YAML
python3 -c "import yaml; yaml.safe_load(open('input/pizzaria_exemplo.yaml'))" && echo "✅ Válido"
```

### Erro: "Chaves Supabase inválidas"

```bash
# Verificar se credenciais estão corretas
# 1. Ir para: supabase.com/dashboard/project/[projeto-id]
# 2. Settings → API
# 3. Copiar exatamente (sem espaços extras)

# Teste rápido
curl -H "Authorization: Bearer [service_role_key]" \
  https://[project-id].supabase.co/rest/v1/profissionais?limit=1

# Deve retornar JSON, não erro 401
```

### Erro: "Python não encontrado" (geração de ícones APK)

```bash
# Se gerar_apk=true, precisa de Python + Pillow
python3 --version  # v3.8+
pip3 install Pillow

# Ou usar system Python
python --version
```

### Erro: "Git clone falha"

```bash
# ❌ Problema: Token GitHub expirado ou sem permissão
# ✅ Solução: Atualizar token no script ou usar SSH

# Ver token configurado
grep "GITHUB_ACCESS_TOKEN" barbearia-replicator.sh

# Regenerar em: github.com/settings/tokens/new
# Permissões: repo, workflow
```

---

## 📱 Opção: Gerar APK Android

Se `gerar_apk: true` no config:

### Pré-requisitos Adicionais
```bash
# Java 17+ (JDK)
java -version  # output: openjdk version "17"

# Gradle (incluído no Android SDK)
# Android SDK (via Android Studio ou sdkmanager)

# Pillow para Python (ícones)
pip3 install Pillow
```

### Keystore para Assinatura
```bash
# Gerar keystore (uma única vez, guardar bem)
keytool -genkey -v \
  -keystore input/pizzaria.keystore \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -alias upload \
  -storepass seu_password

# No config YAML
keystore_path: "input/pizzaria.keystore"
keystore_password: "seu_password"
key_alias: "upload"
key_password: "seu_password"

# Script gerará APK em: ./clientes/pizzaria_exemplo.apk
# Pronto para upload no Google Play Console
```

---

## 🔄 Fluxo Completo: Exemplo Passo a Passo

```bash
# 1. Criar config
cat > input/loja_sp_01.yaml <<'EOF'
cliente_nome: "Barbearia SP 01"
logo_url: "https://cdn.ejemplo.com/logo.png"

supabase:
  url: "https://xxxxx.supabase.co"
  service_role_key: "eyJxxx..."
  anon_key: "eyJxxx..."

firebase:
  project_id: "barbearia-sp-01"
  web_api_key: "AIzaSyxxx..."
  auth_domain: "barbearia-sp-01.firebaseapp.com"

chatwoot:
  url: "https://chatwoot.ejemplo.com"
  account_id: 1
  api_token: "xxxxx"
  inbox_id: 158

pagarme:
  live_key: "sk_live_xxxxx"
  webhook_secret: "whsec_xxxxx"

deploy:
  firebase_project: "barbearia-sp-01"
  github_repo: "https://github.com/ejemplo/barbearia-sp-01"
  criar_usuarios_teste: true
EOF

# 2. Validar
python3 -m yaml input/loja_sp_01.yaml

# 3. Executar
./barbearia-replicator.sh input/loja_sp_01.yaml
# ⏳ Aguardar 10-15 minutos

# 4. Verificar
cd clientes/loja_sp_01
npm install
npm run build
npm run dev

# 5. Testar no navegador
# http://localhost:3000/login
# admin@loja-sp-01.com.br / password123

# 6. Deploy (se configurado)
git push origin main
# → Firebase App Hosting faz deploy automático
```

---

## 📊 Resultado Final

Após execução bem-sucedida, você terá:

```
✅ Novo cliente criado: ./clientes/loja_sp_01/
   ├── src/                          # Código customizado
   ├── .env.production               # Variáveis configuradas
   ├── firebase.json                 # Config Firebase
   ├── apphosting.yaml               # Config App Hosting
   ├── node_modules/                 # Dependências instaladas
   └── .git/                         # Repositório clonado

✅ Usuários de teste criados
   ├── admin@loja-sp-01.com.br / password123
   ├── profissional@loja-sp-01.com.br / password123
   └── recepcao@loja-sp-01.com.br / password123

✅ Integrations configuradas
   ├── Supabase (banco de dados)
   ├── Firebase (autenticação + hosting)
   ├── N8N (automações, se configurado)
   ├── Chatwoot (WhatsApp, se configurado)
   └── Pagar.me (pagamentos, se configurado)

✅ Pronto para:
   ├── npm run dev (desenvolvimento local)
   ├── npm run build (build de produção)
   └── git push (deploy automático)
```

---

## 🎓 Próximos Passos

### Para o Cliente
1. Testar login com usuários de teste
2. Cadastrar profissionais reais
3. Criar catálogo de serviços
4. Configurar horários profissionais
5. Sincronizar Google Calendar
6. Treinar equipe

### Para a Infraestrutura
1. Habilitar backups automáticos do Supabase
2. Configurar alertas de erro em produção
3. Setup de CDN para assets (logo, ícones)
4. Monitoramento de uptime
5. Plano de disaster recovery

### Para Operações
1. Documentar credenciais em vault seguro
2. Criar runbook de troubleshooting
3. Agendar revisão mensal de segurança
4. Planejar upgrades de dependências

---

## 📞 Suporte

**Problema?** Consultar:
- [`docs/DEPLOY.md`](DEPLOY.md) — Problemas de deployment
- [`docs/SUPABASE.md`](SUPABASE.md) — Problemas de banco
- [`docs/CHATWOOT.md`](CHATWOOT.md) — Problemas de WhatsApp
- Checklist do script output

**Erro reproduzível?** Colet ar:
```bash
# Informações para debug
bash -x ./barbearia-replicator.sh input/cliente.yaml 2>&1 | tee debug.log
# Enviar debug.log (sem credenciais!)
```

---

**Última atualização**: 2026-04-16  
**Versão**: 1.0.0  
**Maintainer**: Diego (Desenvolvedor)

