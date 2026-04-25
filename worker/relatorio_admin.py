#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script: Gerador de Relatórios para Administradores
Envia relatório consolidado via WhatsApp para todos os administradores.
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

BRT = ZoneInfo("America/Sao_Paulo")
from supabase import create_client, Client
import requests
from utils import safe_execute, formatar_data_br, filtrar_admin, send_chatwoot_message

# ===============================
# 1. CONFIGURAÇÃO
# ===============================
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except Exception as e:
    logger.warning(f"Dotenv não carregado: {e}")

# Importar função de filtro
try:
    from utils import filtrar_admin
except ImportError:
    # Fallback se utils não estiver disponível
    def filtrar_admin(nome: str, role: str = None) -> bool:
        if not nome: return False
        nome_lower = str(nome).lower()
        if 'admin' in nome_lower or 'sistema' in nome_lower: return True
        if role and role.upper() == 'STRATEGIC': return True
        return False

# Logger Config
LOG_DIR = Path(__file__).parent / "logs" / "consolidado"
LOG_DIR.mkdir(parents=True, exist_ok=True)

logger.remove()
logger.add(
    sys.stderr, 
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{message}</cyan>"
)
logger.add(
    LOG_DIR / "relatorio_admin_{time:YYYY-MM-DD}.log",
    rotation="1 day",
    retention="30 days",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}"
)

# Credenciais
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Z-API para Relatórios removido em favor do Chatwoot

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.critical("❌ ERRO: Credenciais Supabase não definidas")
    sys.exit(1)

# ===============================
# 2. FUNÇÕES AUXILIARES
# ===============================
def formatar_valor(valor):
    """Formata valor em R$"""
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def buscar_administradores(client):
    """Busca telefones dos administradores na tabela contatos_erp"""
    # MODO TESTE DE SEGURANÇA: Se definido, envia APENAS para este número
    test_phone = os.getenv("TEST_PHONE_ONLY")
    if test_phone:
        logger.warning(f"🚧 MODO TESTE ATIVO: Enviando apenas para {test_phone}")
        return [{
            "nome": "TESTE (Admin Global)",
            "telefone": test_phone
        }]

    try:
        # Busca contatos com role STRATEGIC (administradores)
        response = client.table("contatos_erp") \
            .select("nome, telefone, store_id") \
            .eq("role", "STRATEGIC") \
            .execute()
        
        admins = []
        for admin in response.data:
            telefone = admin.get("telefone")
            nome = admin.get("nome")
            
            if telefone:
                # Normaliza telefone (remove caracteres não numéricos)
                tel_limpo = ''.join(filter(str.isdigit, telefone))
                
                # Adiciona 55 se necessário
                if len(tel_limpo) >= 10 and not tel_limpo.startswith('55'):
                    tel_limpo = '55' + tel_limpo
                
                if len(tel_limpo) >= 12:  # Validação básica
                    admins.append({
                        "nome": nome or "Administrador",
                        "telefone": tel_limpo
                    })
        
        return admins
    
    except Exception as e:
        logger.error(f"Erro ao buscar administradores: {e}")
        return []

def gerar_relatorio_consolidado(client, data_inicio, data_fim):
    """Gera relatório consolidado do período"""
    try:
        # Busca dados consolidados
        response = client.table("financeiro_consolidado_diario") \
            .select("*") \
            .gte("data_referencia", data_inicio) \
            .lte("data_referencia", data_fim) \
            .order("data_referencia", desc=True) \
            .execute()
        
        dados = response.data
        
        if not dados:
            return None
        
        # IMPORTANTE: Buscar nomes das lojas ANTES de agregar os dados
        response_lojas = client.table("empresas_erp") \
            .select("id_loja, nome_fantasia") \
            .execute()
        
        mapa_lojas = {
            l["id_loja"]: l["nome_fantasia"][:30] 
            for l in response_lojas.data
        }
        
        # Criar set de lojas administrativas para filtrar
        lojas_admin = {
            l["id_loja"]
            for l in response_lojas.data
            if filtrar_admin(l.get("nome_fantasia"))
        }
        
        # Log de lojas filtradas
        if lojas_admin:
            logger.info(f"🔒 Filtrando {len(lojas_admin)} loja(s) administrativa(s)")
        
        # Inicializa todas as lojas com 0 (para mostrar mesmo as sem venda)
        lojas = {l_id: 0.0 for l_id in mapa_lojas.keys() if l_id not in lojas_admin}
        dias_com_faturamento_por_loja = {l_id: set() for l_id in lojas.keys()}
        gerentes_loja = {}  # Armazena último gerente por loja
        total_geral = 0
        datas_unicas = set()
        
        for d in dados:
            loja_id = d.get("loja_id")
            valor = float(d.get("valor_total_oficial") or 0)
            data_ref = d.get("data_referencia")
            gerente_responsavel = d.get("ultimo_gerente_responsavel")
            
            # FILTRO: Ignorar lojas administrativas
            if loja_id in lojas_admin:
                continue
            
            if valor > 0:  # Só conta se teve faturamento
                if loja_id not in lojas:
                    lojas[loja_id] = 0
                    dias_com_faturamento_por_loja[loja_id] = set()
                
                lojas[loja_id] += valor
                dias_com_faturamento_por_loja[loja_id].add(data_ref)
                total_geral += valor
                datas_unicas.add(data_ref)
                
                # FILTRO: Só adiciona gerente se não for admin
                if gerente_responsavel and loja_id not in gerentes_loja:
                    if not filtrar_admin(gerente_responsavel):
                        gerentes_loja[loja_id] = gerente_responsavel
        
        # Busca gerentes do contatos_erp como fallback (role TACTICAL)
        response_gerentes = client.table("contatos_erp") \
            .select("nome, store_id, role") \
            .eq("role", "TACTICAL") \
            .execute()
        
        mapa_gerentes_contatos = {}
        for g in response_gerentes.data:
            store_id = g.get("store_id")
            nome = g.get("nome", "N/A")
            role = g.get("role")
            # FILTRO: Excluir gerentes admin
            if store_id and not filtrar_admin(nome, role):
                mapa_gerentes_contatos[store_id] = nome
        
        # Calcula número de dias com faturamento
        total_dias_faturamento = len(datas_unicas)
        
        # Formata datas para exibição
        data_inicio_formatada = datetime.fromisoformat(data_inicio).strftime("%d/%m/%Y")
        data_fim_formatada = datetime.fromisoformat(data_fim).strftime("%d/%m/%Y")
        
        # Monta mensagem
        mensagem = f"📊 *RELATÓRIO FINANCEIRO CONSOLIDADO*\n\n"
        mensagem += f"📅 Período: {data_inicio_formatada} a {data_fim_formatada}\n"
        mensagem += f"━━━━━━━━━━━━━━━━━━━━━━\n\n"
        
        # Ranking de lojas (todas)
        ranking_lojas = sorted(lojas.items(), key=lambda x: x[1], reverse=True)
        
        mensagem += "*🏆 RANKING DE FATURAMENTO:*\n"
        for i, (loja_id, valor) in enumerate(ranking_lojas, 1):
            nome_loja = mapa_lojas.get(loja_id, loja_id)
            dias_loja = len(dias_com_faturamento_por_loja[loja_id])
            media_diaria = valor / dias_loja if dias_loja > 0 else 0
            
            # Prioridade: gerente do consolidado > contatos_erp > N/A
            gerente = gerentes_loja.get(loja_id) or mapa_gerentes_contatos.get(loja_id, "N/A")
            
            mensagem += f"{i}. {nome_loja}\n"
            mensagem += f"   👤 Gerente: {gerente}\n"
            mensagem += f"   💰 {formatar_valor(valor)}\n"
            mensagem += f"   📊 Média/dia: {formatar_valor(media_diaria)} ({dias_loja}d)\n"

        
        mensagem += f"\n━━━━━━━━━━━━━━━━━━━━━━\n"
        mensagem += f"*💵 TOTAL GERAL:* {formatar_valor(total_geral)}\n"
        mensagem += f"🏪 Lojas Ativas: {len(lojas)}\n"
        
        # Média geral considerando dias com faturamento
        if total_dias_faturamento > 0:
            media_geral = total_geral / total_dias_faturamento
            mensagem += f"\n*📈 Média dias úteis/faturado:* {formatar_valor(media_geral)}/dia\n"
            mensagem += f"📅 Dias com faturamento: {total_dias_faturamento}\n"

        mensagem += f"\n🤖 _Gerado automaticamente em {datetime.now(BRT):%d/%m/%Y %H:%M}_"
        
        return mensagem
    
    except Exception as e:
        logger.error(f"Erro ao gerar relatório: {e}")
        return None

def enviar_mensagem(telefone, nome, mensagem):
    """Envia mensagem via Chatwoot (Substitui Z-API)"""
    res = send_chatwoot_message(telefone, nome, mensagem)
    if res.get('success'):
        return True
    logger.error(f"Erro Chatwoot: {res.get('message')}")
    return False

def log_message_to_supabase(supabase_client: Client, session_id: str, message_content: str, metadata: dict) -> None:
    """Salva histórico de mensagem no Supabase para contexto da Secretária n8n."""
    try:
        # Estrutura compatível com LangChain (padrão n8n)
        message_payload = {
            "type": "ai",
            "content": message_content,
            "context": {
                "source": metadata.get("source", "relatorio_admin"),
                "campaignName": metadata.get("campaignName", "Relatório Admin")
            }
        }
        
        supabase_client.table('n8n_historico_mensagens').insert({
            "session_id": session_id,
            "message": message_payload,
            "metadata": metadata,
            "created_at": datetime.now(BRT).isoformat()
        }).execute()
        
    except Exception as e:
        # Non-critical: log erro mas não interrompe fluxo
        logger.warning(f"[SUPABASE LOG] Falha ao salvar histórico: {e}")

# ===============================
# 3. MAIN
# ===============================
def main():
    logger.info("📱 Gerador de Relatórios para Administradores")
    logger.info("=" * 60)
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Define período (últimos 7 dias)
        hoje = datetime.now(BRT).date()
        data_inicio = (hoje - timedelta(days=7)).isoformat()
        data_fim = hoje.isoformat()
        
        logger.info(f"📅 Período: {data_inicio} a {data_fim}")
        
        # 1. Busca administradores
        admins = buscar_administradores(supabase)
        
        if not admins:
            logger.warning("⚠️ Nenhum administrador encontrado!")
            return
        
        logger.info(f"👥 Encontrados {len(admins)} administrador(es)")
        
        # 2. Gera relatório
        logger.info("📊 Gerando relatório consolidado...")
        relatorio = gerar_relatorio_consolidado(supabase, data_inicio, data_fim)
        
        if not relatorio:
            logger.warning("⚠️ Nenhum dado para relatório!")
            return
        
        logger.success("✅ Relatório gerado com sucesso!")
        
        # 3. Envia para cada administrador
        enviados = 0
        for admin in admins:
            logger.info(f"📤 Enviando para {admin['nome']} ({admin['telefone']})...")
            
            if enviar_mensagem(admin['telefone'], admin['nome'], relatorio):
                logger.success(f"✅ Enviado para {admin['nome']}")
                enviados += 1
                
                # Log context for AI
                log_message_to_supabase(supabase, admin['telefone'], relatorio, {
                    "source": "relatorio_admin",
                    "campaignName": f"Relatório Semanal {data_fim}"
                })
            else:
                logger.error(f"❌ Falha ao enviar para {admin['nome']}")
        
        logger.info("=" * 60)
        logger.success(f"🎯 Relatórios enviados: {enviados}/{len(admins)}")
    
    except Exception as e:
        logger.exception(f"💥 Erro Fatal: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
