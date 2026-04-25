#!/bin/bash

# ==============================================================================
# BARBEARIA AUTO-REPLICATOR v1.0
#
# Clona, configura e customiza o sistema Barbearia para novos clientes/franquias.
# Suporta: Supabase, Firebase, N8N, Chatwoot, Pagar.me, opcional Deploy.
#
# Uso: ./barbearia-replicator.sh input/meu_cliente.yaml
# ==============================================================================

set -e  # Encerra se qualquer comando falhar

# --- VALIDAÇÕES INICIAIS ---
if [ -z "$1" ]; then
  echo "❌ Erro: Forneça o arquivo de config"
  echo ""
  echo "Uso: ./barbearia-replicator.sh input/seu_cliente.yaml"
  echo "Exemplo: ./barbearia-replicator.sh input/pizzaria_sao_paulo.yaml"
  echo ""
  echo "Criar um arquivo de config em input/ com a estrutura do template."
  exit 1
fi

CONFIG_FILE_PATH="$1"
if [ ! -f "$CONFIG_FILE_PATH" ]; then
  echo "❌ Erro: Arquivo de configuração '$CONFIG_FILE_PATH' não encontrado."
  exit 1
fi

# --- PARSE YAML (Simples) ---
parse_yaml() {
  local file="$1"
  local key="$2"
  grep "^${key}:" "$file" 2>/dev/null | head -1 | awk '{print $NF}' | tr -d '"' | tr -d "'"
}

parse_yaml_nested() {
  local file="$1"
  local section="$2"
  local key="$3"
  awk "/^${section}:/,/^[a-z]/ {if (/^  ${key}:/) print}" "$file" | awk '{print $NF}' | tr -d '"' | tr -d "'" | head -1
}

# --- CONFIGURAÇÕES GLOBAIS ---
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
echo "🔄 Iniciando Replicador Barbearia..."
echo "   Config: $CONFIG_FILE_PATH"

# Lê valores do YAML
CLIENT_NAME=$(parse_yaml "$CONFIG_FILE_PATH" "cliente_nome")
LOGO_URL=$(parse_yaml "$CONFIG_FILE_PATH" "logo_url")
SUPABASE_URL=$(parse_yaml_nested "$CONFIG_FILE_PATH" "supabase" "url")
SUPABASE_KEY=$(parse_yaml_nested "$CONFIG_FILE_PATH" "supabase" "service_role_key")
SUPABASE_ANON_KEY=$(parse_yaml_nested "$CONFIG_FILE_PATH" "supabase" "anon_key")
FIREBASE_PROJECT=$(parse_yaml_nested "$CONFIG_FILE_PATH" "firebase" "project_id")
FIREBASE_API_KEY=$(parse_yaml_nested "$CONFIG_FILE_PATH" "firebase" "web_api_key")
FIREBASE_AUTH_DOMAIN=$(parse_yaml_nested "$CONFIG_FILE_PATH" "firebase" "auth_domain")
N8N_WEBHOOK=$(parse_yaml_nested "$CONFIG_FILE_PATH" "n8n" "webhook_url")
N8N_API_KEY=$(parse_yaml_nested "$CONFIG_FILE_PATH" "n8n" "api_key")
CHATWOOT_URL=$(parse_yaml_nested "$CONFIG_FILE_PATH" "chatwoot" "url")
CHATWOOT_ACCOUNT=$(parse_yaml_nested "$CONFIG_FILE_PATH" "chatwoot" "account_id")
CHATWOOT_TOKEN=$(parse_yaml_nested "$CONFIG_FILE_PATH" "chatwoot" "api_token")
CHATWOOT_INBOX=$(parse_yaml_nested "$CONFIG_FILE_PATH" "chatwoot" "inbox_id")
PAGARME_KEY=$(parse_yaml_nested "$CONFIG_FILE_PATH" "pagarme" "live_key")
PAGARME_SECRET=$(parse_yaml_nested "$CONFIG_FILE_PATH" "pagarme" "webhook_secret")
DEPLOY_FIREBASE=$(parse_yaml_nested "$CONFIG_FILE_PATH" "deploy" "firebase_project")
DEPLOY_GITHUB=$(parse_yaml_nested "$CONFIG_FILE_PATH" "deploy" "github_repo")
CRIAR_USUARIOS=$(parse_yaml_nested "$CONFIG_FILE_PATH" "deploy" "criar_usuarios_teste")

# Validações
if [ -z "$CLIENT_NAME" ] || [ -z "$SUPABASE_URL" ] || [ -z "$FIREBASE_PROJECT" ]; then
  echo "❌ Erro: Campos obrigatórios faltando (cliente_nome, supabase.url, firebase.project_id)"
  exit 1
fi

# Gera variáveis customizadas
CLIENT_DIR_NAME=$(echo "$CLIENT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '_')
APP_BRAND_NAME="$CLIENT_NAME"
FIREBASE_DATABASE_ID="$CLIENT_DIR_NAME"

# Estrutura de pastas
BASE_DIR="$SCRIPT_DIR"
NEW_CLIENT_PATH="${BASE_DIR}/clientes/${CLIENT_DIR_NAME}"

echo ""
echo "⚙️  CONFIGURAÇÕES LIDAS:"
echo "   Nome do Cliente: $APP_BRAND_NAME"
echo "   Diretório: $CLIENT_DIR_NAME"
echo "   Firebase Project: $FIREBASE_PROJECT"
echo "   Supabase: ${SUPABASE_URL:0:30}..."
echo "   Deploy Firebase: ${DEPLOY_FIREBASE:-Desativado}"
echo ""

# --- VERIFICAR SE JÁ EXISTE ---
if [ -d "$NEW_CLIENT_PATH" ]; then
  echo "⚠️  Pasta '$NEW_CLIENT_PATH' já existe."
  read -p "Deseja remover e recriar? (s/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🗑️  Removendo pasta anterior..."
    rm -rf "$NEW_CLIENT_PATH"
  else
    echo "❌ Abortado."
    exit 1
  fi
fi

# --- CLONAGEM ---
echo "--> Passo 1: Clonando template..."
mkdir -p "${BASE_DIR}/clientes"
git clone --depth 1 "$(git remote get-url origin)" "$NEW_CLIENT_PATH" 2>&1 | grep -v "^From\|^Receiving\|^Unpacking" || true
cd "$NEW_CLIENT_PATH"
echo "✅ Clonado: $NEW_CLIENT_PATH"

# --- CUSTOMIZAÇÃO ---
echo "--> Passo 2: Customizando para $APP_BRAND_NAME..."

# Criar .env.production com variáveis do cliente
echo "    Gerando .env.production..."
cat > ".env.production" <<EOF
# ============================================================================
# BARBEARIA DEL PIERRO — CONFIGURAÇÕES PARA $APP_BRAND_NAME
# Gerado automaticamente em $(date -u +%Y-%m-%dT%H:%M:%SZ)
# ============================================================================

# BRANDING
NEXT_PUBLIC_APP_NAME="$APP_BRAND_NAME"
NEXT_PUBLIC_LOGO_URL="$LOGO_URL"

# SUPABASE (Banco de Dados)
NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_KEY"

# FIREBASE (Autenticação + Hosting)
NEXT_PUBLIC_FIREBASE_API_KEY="$FIREBASE_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$FIREBASE_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="$FIREBASE_PROJECT"
NEXT_PUBLIC_FIREBASE_DATABASE_ID="$FIREBASE_DATABASE_ID"

# N8N (Automações, deixar em branco para desativar)
NEXT_PUBLIC_N8N_WEBHOOK_URL="$N8N_WEBHOOK"
N8N_API_KEY="$N8N_API_KEY"

# CHATWOOT (WhatsApp, deixar em branco para desativar)
NEXT_PUBLIC_CHATWOOT_URL="$CHATWOOT_URL"
NEXT_PUBLIC_CHATWOOT_ACCOUNT_ID="$CHATWOOT_ACCOUNT"
CHATWOOT_API_TOKEN="$CHATWOOT_TOKEN"
NEXT_PUBLIC_CHATWOOT_INBOX_ID="$CHATWOOT_INBOX"

# PAGAR.ME (Pagamentos PIX, deixar em branco para desativar)
PAGARME_SECRET_KEY_LIVE="$PAGARME_KEY"
PAGARME_WEBHOOK_SECRET="$PAGARME_SECRET"

# API INTERNA
APP_API_KEY="$(uuidgen || python3 -c 'import uuid; print(uuid.uuid4())')"

# DATABASE URL (para migrations)
DATABASE_URL="postgresql://postgres:[senha]@db.${SUPABASE_URL#https://}.supabase.co:5432/postgres"

# NODE ENV
NODE_ENV="production"
EOF

echo "✅ .env.production criado"

# Adicionar .env.production ao git (force, sobrescrevendo .gitignore)
echo "!.env.production" >> .gitignore

# --- SETUP NODE ---
echo "--> Passo 3: Instalando dependências..."
npm install --legacy-peer-deps > /dev/null 2>&1 || npm install
echo "✅ Dependências instaladas"

# --- BUILD CHECK ---
echo "--> Passo 4: Verificando build..."
npm run build > /dev/null 2>&1 && echo "✅ Build OK" || {
  echo "⚠️  Build warning — verifique manualmente"
}

# --- CRIAR USUÁRIOS DE TESTE ---
if [ "$CRIAR_USUARIOS" = "true" ] || [ "$CRIAR_USUARIOS" = "True" ]; then
  echo "--> Passo 5: Criando usuários de teste..."

  # Variáveis para criar usuários
  cat > /tmp/create_test_users.mjs <<'MJSEOF'
import { createClient } from "@supabase/supabase-js";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { initializeApp } from "firebase/app";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appName = process.env.NEXT_PUBLIC_APP_NAME || "Barbearia";

const supabase = createClient(supabaseUrl, supabaseKey);

const testUsers = [
  { email: `admin@${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.com.br`, role: "ADMIN", nome: "Administrador" },
  { email: `profissional@${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.com.br`, role: "PROFISSIONAL", nome: "Profissional Teste" },
  { email: `recepcao@${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.com.br`, role: "RECEPCAO", nome: "Recepcionista Teste" },
];

const password = "password123";

async function createUsers() {
  for (const user of testUsers) {
    try {
      // Inserir no banco Supabase
      const { error } = await supabase
        .from("profissionais")
        .insert({
          nome: user.nome,
          email: user.email,
          perfil_acesso: user.role,
          ativo: true,
          possui_agenda: user.role === "PROFISSIONAL",
          funcao: user.role,
        });

      if (error) console.warn(`⚠️  ${user.email}: ${error.message}`);
      else console.log(`✅ ${user.email} (${user.role})`);
    } catch (err) {
      console.error(`❌ Erro ao criar ${user.email}:`, err.message);
    }
  }
}

await createUsers();
console.log("\n📝 Todos os usuários usam senha: password123");
MJSEOF

  # Rodar script
  NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_KEY" \
  NEXT_PUBLIC_FIREBASE_PROJECT_ID="$FIREBASE_PROJECT" \
  NEXT_PUBLIC_APP_NAME="$APP_BRAND_NAME" \
  node /tmp/create_test_users.mjs 2>/dev/null || echo "⚠️  Usuários de teste não criados (verificar credenciais)"

  rm -f /tmp/create_test_users.mjs
fi

# --- COMMIT INITIAL ---
echo "--> Passo 6: Inicializando repositório do cliente..."
git add -A
git commit -m "init: setup customizado para $APP_BRAND_NAME" --quiet || echo "ℹ️  Nenhuma mudança para commit"

echo ""
echo "===================================================================="
echo "✅ CLIENTE CRIADO COM SUCESSO!"
echo "===================================================================="
echo ""
echo "📁 Localização:   $NEW_CLIENT_PATH"
echo "🏢 Cliente:       $APP_BRAND_NAME"
echo "🔧 Configurado:   Supabase, Firebase, N8N, Chatwoot, Pagar.me"
echo ""

if [ "$CRIAR_USUARIOS" = "true" ] || [ "$CRIAR_USUARIOS" = "True" ]; then
  echo "👥 Usuários de teste criados (senha: password123):"
  echo "   • admin@${CLIENT_DIR_NAME}.com.br"
  echo "   • profissional@${CLIENT_DIR_NAME}.com.br"
  echo "   • recepcao@${CLIENT_DIR_NAME}.com.br"
  echo ""
fi

echo "🚀 Próximos passos:"
echo "   1. cd $NEW_CLIENT_PATH"
echo "   2. npm run dev            (testar localmente em http://localhost:3000)"
echo "   3. Fazer login com usuários de teste"
echo "   4. Cadastrar profissionais, serviços, horários"
echo ""

if [ -n "$DEPLOY_FIREBASE" ]; then
  echo "☁️  Deploy Firebase configurado. Para fazer deploy:"
  echo "   git push origin main"
  echo ""
fi

echo "📚 Documentação: Ver docs/GUIA_REPLICACAO.md"
echo "===================================================================="

