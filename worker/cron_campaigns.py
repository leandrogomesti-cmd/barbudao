#!/usr/bin/env python3
"""
Worker de Campanhas - Versão Supabase Only
Refatorado para eliminar dependência do Firestore
"""

import os
import sys
import time
import random
import requests
from datetime import datetime, timedelta
from loguru import logger
from dotenv import load_dotenv
from supabase import create_client, Client
import warnings
from utils import safe_execute, formatar_data_br, filtrar_admin, send_chatwoot_message, normalize_brazilian_phone

# Suppress warnings
warnings.filterwarnings("ignore")

# Configuração de Logs
logger.remove()
logger.add(sys.stderr, format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>")

# Carrega Variáveis de Ambiente
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '..', '.env'))

# --- CONFIGURATION ---
# Chatwoot
CHATWOOT_URL          = os.getenv("CHATWOOT_URL")
CHATWOOT_ACCOUNT_ID   = os.getenv("CHATWOOT_ACCOUNT_ID")
CHATWOOT_INBOX_ID     = os.getenv("CHATWOOT_INBOX_ID")
CHATWOOT_API_TOKEN    = os.getenv("CHATWOOT_API_TOKEN")

if not all([CHATWOOT_URL, CHATWOOT_ACCOUNT_ID, CHATWOOT_INBOX_ID, CHATWOOT_API_TOKEN]):
    logger.error("❌ Variáveis CHATWOOT_URL, CHATWOOT_ACCOUNT_ID, CHATWOOT_INBOX_ID e CHATWOOT_API_TOKEN são obrigatórias!")
    sys.exit(1)

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    logger.error("❌ Variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórias!")
    sys.exit(1)

# Inicializa Cliente Supabase (Service Role para bypass RLS no worker)
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
logger.success("✅ Supabase conectado")


# ===================================================
# HELPER FUNCTIONS
# ===================================================

def log_to_supabase(campanha_id: str, message: str, level: str = "INFO"):
    """
    Registra log da campanha no Supabase
    """
    try:
        supabase_client.table('campanhas_logs').insert({
            'campanha_id': campanha_id,
            'level': level,
            'message': message
        }).execute()
    except Exception as e:
        logger.error(f"Erro ao salvar log: {e}")


# USANDO send_chatwoot_message de utils.py


def inferir_tipo_subtipo(mission_name: str, mission_type_hint: str = None) -> tuple:
    """
    Infere tipo e subtipo da missão baseado no nome
    
    Returns:
        tuple: (tipo, subtipo)
    """
    name_lower = (mission_name or "").lower()
    
    # Mapeamento de palavras-chave
    keywords_map = {
        'Financeiro': {
            'keywords': ['caixa', 'fechamento', 'financeiro', 'faturamento'],
            'subtipos': {
                'Fechamento': ['fechamento', 'caixa'],
                'Conferencia': ['conferencia', 'conferência']
            }
        },
        'Auditoria': {
            'keywords': ['auditoria', 'vitrine', 'estoque', 'limpeza', 'banheiro'],
            'subtipos': {
                'Vitrine': ['vitrine'],
                'Estoque': ['estoque'],
                'Limpeza': ['limpeza', 'banheiro']
            }
        },
        'Marketing': {
            'keywords': ['foco', 'docinho', 'campanha', 'promocao', 'promoção'],
            'subtipos': {
                'Foco': ['foco', 'almoço', 'almoco'],
                'Docinho': ['docinho', 'doce']
            }
        }
    }
    
    # 1. Tentar usar hint
    if mission_type_hint and mission_type_hint in keywords_map:
        tipo = mission_type_hint
    else:
        # 2. Inferir pelo nome
        tipo = 'Outros'
        for tipo_candidato, info in keywords_map.items():
            if any(kw in name_lower for kw in info['keywords']):
                tipo = tipo_candidato
                break
    
    # 3. Inferir subtipo
    subtipo = None
    if tipo in keywords_map:
        for subtipo_candidato, keywords in keywords_map[tipo]['subtipos'].items():
            if any(kw in name_lower for kw in keywords):
                subtipo = subtipo_candidato
                break
    
    return (tipo, subtipo)


def cancel_all_pending_missions():
    """
    Cancela missões pendentes/aguardando globais antes de rodar a campanha,
    para não acumular missões de campanhas anteriores.

    ⚠️ PROTEÇÃO: Missões do tipo 'Financeiro' NUNCA são canceladas automaticamente,
    pois possuem dados sensíveis (fechamento de caixa, conferência, etc.).
    """
    try:
        auto_obs = '\n[AUTO] Canceladas automaticamente pelo sistema (Worker) antes de nova campanha.'
        
        res = supabase_client.table('missoes_execucao')\
            .update({
                'status': 'cancelado',
                'obs': auto_obs
            })\
            .in_('status', ['pendente', 'aguardando', 'em_andamento'])\
            .neq('tipo_missao', 'Financeiro')\
            .execute()
            
        if res.data and len(res.data) > 0:
            logger.warning(f"🧟 Canceladas {len(res.data)} missões anteriores (excluindo Financeiro).")
        else:
            logger.info("✅ Nenhuma missão não-financeira pendente para cancelar.")
    except Exception as e:
        logger.error(f"❌ Erro ao cancelar missões globalmente: {e}")


def create_mission_in_supabase(data: dict) -> dict:
    """
    Cria missão no Supabase com validação de integridade
    
    Args:
        data: {
            'phone': str,
            'nome': str,  # NOVO: nome esperado do contato
            'missionType': str,
            'missionName': str,
            'status': str,
            'enviar_foto': bool,
            'obs': str
        }
    """
    try:
        phone = data.get('phone')
        nome_esperado = data.get('nome')
        mission_type_hint = data.get('missionType')
        mission_name = data.get('missionName', 'Sem Nome')
        status = data.get('status', 'pendente')
        enviar_foto = data.get('enviar_foto', False)
        obs_template = data.get('obs', '')
        
        # 1. Buscar contato pelo telefone
        try:
            contact_res = supabase_client.table('contatos_erp')\
                .select('id_contato, store_id, nome, telefone')\
                .eq('telefone', phone)\
                .limit(1)\
                .execute()
            
            if not contact_res.data or len(contact_res.data) == 0:
                logger.error(f"❌ Contato não encontrado: {phone}")
                return {
                    "success": False,
                    "message": f"Contato não encontrado: {phone}"
                }
            
            contato = contact_res.data[0]
            contato_id = contato['id_contato']
            nome_real = contato['nome']
            store_id = contato.get('store_id', 'N/A')
            
            # ✅ VALIDAÇÃO DE INTEGRIDADE
            if nome_esperado and nome_real.lower().strip() != nome_esperado.lower().strip():
                logger.warning(
                    f"⚠️ MISMATCH DETECTADO!\n"
                    f"  Esperado: {nome_esperado} ({phone})\n"
                    f"  No Banco: {nome_real} ({phone})\n"
                    f"  ✅ Usando dados do BANCO como verdade."
                )
            
            logger.debug(f"Contato encontrado: {nome_real} (ID: {contato_id}, Loja: {store_id})")
        
        except Exception as e:
            logger.error(f"❌ Erro ao buscar contato: {e}")
            return {"success": False, "message": f"Erro ao buscar contato: {e}"}
        
        # 2. Inferir tipo e subtipo
        tipo, subtipo = inferir_tipo_subtipo(mission_name, mission_type_hint)
        logger.debug(f"Tipo inferido: {tipo}, Subtipo: {subtipo}")
        
        # 3. Criar OBS com nome REAL
        obs = f"Missão auto (Python): {nome_real} - {mission_name}"
        if obs_template:
            obs = obs_template.replace(nome_esperado or '', nome_real)
        
        # 4. INSERT Mission
        payload = {
            "contato_id": contato_id,
            "tipo_missao": tipo,
            "subtipo_missao": subtipo,
            "status": status,
            "enviar_foto": enviar_foto,
            "obs": obs
        }
        
        res = supabase_client.table('missoes_execucao').insert(payload).execute()
        
        if res.data and len(res.data) > 0:
            mission_data = res.data[0]
            mission_id = mission_data.get('id')
            
            logger.success(
                f"✅ Missão criada: ID {mission_id} | "
                f"Tipo: {tipo} | Subtipo: {subtipo} | "
                f"Contato: {nome_real}"
            )
            
            return {"success": True, "data": mission_data}
        else:
            return {"success": False, "message": "Nenhum dado retornado após insert."}
    
    except Exception as e:
        logger.error(f"❌ Erro ao criar missão: {e}")
        return {"success": False, "message": str(e)}


# ===================================================
# CAMPAIGN PROCESSING
# ===================================================

def process_contact(campanha: dict, envio: dict, contact: dict, templates: list):
    """
    Processa um único contato da campanha
    REFATORADO: envio = dados de campanhas_envios, contact = dados de contatos_erp
    """
    campanha_id = campanha['id']
    envio_id = envio['envio_id']
    contato_id = envio['contato_id']
    c_name = contact.get('nome', 'N/A')
    c_phone = contact.get('telefone', 'N/A')
    
    logger.info(f"Processando: {c_name} ({c_phone})")
    
    # 1. Normalizar telefone
    clean_phone = ''.join(filter(str.isdigit, str(c_phone)))
    if len(clean_phone) >= 10 and not clean_phone.startswith('55'):
        clean_phone = '55' + clean_phone
    
    # 2. Criar missão (se ainda não existe)
    mission_id = envio.get('mission_id')  # mission_id vem do JOIN
    
    if not mission_id:
        logger.debug(f"Criando missão para {clean_phone}...")
        
        mission_params = {
            "phone": clean_phone,
            "nome": c_name,  # ✅ NOVO: passa nome esperado
            "missionType": campanha.get('mission_type'),
            "missionName": campanha.get('nome'),
            "status": "pendente",
            "enviar_foto": campanha.get('enviar_foto', False),
            "obs": f"Missão auto (Python): {c_name} - {campanha.get('nome')}"
        }
        
        mission_res = create_mission_in_supabase(mission_params)
        
        if mission_res['success']:
            mission_id = mission_res['data']['id']  # Fix: data contains mission object with id
            
            logger.success(f"Missão criada: {mission_id}")
            
            # Atualizar envio com mission_id
            supabase_client.table('campanhas_envios')\
                .update({'mission_id': mission_id})\
                .eq('id', envio_id)\
                .execute()
            
            log_to_supabase(campanha_id, f"Mission registered: {mission_id}")
        else:
            err = mission_res.get('message', 'Unknown Error')
            logger.error(f"Falha ao criar missão: {err}")
            
            supabase_client.table('campanhas_envios')\
                .update({
                    'status': 'failed',
                    'error_detail': f"Mission Failed: {err}",
                    'processed_at': 'NOW()'
                })\
                .eq('id', envio_id)\
                .execute()
            
            log_to_supabase(campanha_id, f"Failed mission for {c_name}: {err}", "ERROR")
            return  # SKIP
    
    # 3. Selecionar template e personalizar
    template = random.choice(templates) if templates else "Olá {nome}, mensagem automática."
    final_msg = template
    
    # Substituir {nome}
    first_name = c_name.split()[0] if c_name else 'Contato'
    final_msg = final_msg.replace('{nome}', first_name)
    
    # Substituir campos dinâmicos
    dyn_fields = contact.get('dynamic_fields', {})
    if dyn_fields:
        for k, v in dyn_fields.items():
            if k != 'nome':
                final_msg = final_msg.replace(f'{{{k}}}', str(v))
    
    # 4. Enviar mensagem via Chatwoot
    logger.debug(f"Enviando mensagem para {clean_phone} via Chatwoot...")
    send_res = send_chatwoot_message(clean_phone, c_name, final_msg)
    
    if send_res['success']:
        logger.success(f"✅ Enviado para {clean_phone}")
        
        supabase_client.table('campanhas_envios')\
            .update({
                'status': 'sent',
                'sent_at': 'NOW()',
                'processed_at': 'NOW()'
            })\
            .eq('id', envio_id)\
            .execute()
        
        log_to_supabase(campanha_id, f"Message sent to {c_name} ({clean_phone})")
    else:
        err = send_res.get('message', 'Unknown Error')
        logger.error(f"❌ Falha ao enviar: {err}")
        
        supabase_client.table('campanhas_envios')\
            .update({
                'status': 'failed',
                'error_detail': f"Send Failed: {err}",
                'processed_at': 'NOW()'
            })\
            .eq('id', envio_id)\
            .execute()
        
        log_to_supabase(campanha_id, f"Failed to send to {c_name} ({clean_phone}): {err}", "ERROR")


def process_campaign(campanha_id: str):
    """
    Processa campanha completa
    """
    logger.info(f"🚀 Processando campanha: {campanha_id}")
    
    # 1. Buscar campanha
    try:
        camp_res = supabase_client.table('campanhas')\
            .select('*')\
            .eq('id', campanha_id)\
            .single()\
            .execute()
        
        if not camp_res.data:
            logger.error(f"❌ Campanha {campanha_id} não encontrada")
            return
            
        campanha = camp_res.data
        
        if campanha['status'] not in ['ativa', 'scheduled', 'running']:
            logger.warning(f"⚠️ Campanha {campanha_id} não está ativa (Status: {campanha['status']})")
            return
    except Exception as e:
        logger.error(f"❌ Erro ao buscar campanha: {e}")
        return
    
    # 2. Atualizar status para running
    try:
        supabase_client.table('campanhas')\
            .update({
                'status': 'running',
                'started_at': 'NOW()'
            })\
            .eq('id', campanha_id)\
            .execute()
        
        log_to_supabase(campanha_id, "Campaign started")
    except Exception as e:
        logger.error(f"❌ Erro ao atualizar status: {e}")
        return
    
    # Cancela todas as missões pendentes globais antes de enviar novas
    cancel_all_pending_missions()
    
    # 3. Buscar templates (REFATORADO: Usa coluna message_templates da tabela companhas)
    # Antes buscava em campanhas_templates (deprecated)
    templates = campanha.get('message_templates')
    
    if not templates or len(templates) == 0:
        # Fallback apenas se a coluna estiver vazia
        templates = ["Olá {nome}!"]
    
    logger.info(f"📝 {len(templates)} templates carregados")
    
    # 4. Buscar contatos pendentes via função RPC
    envios_res = supabase_client.rpc('get_campaign_pending_contacts', {
        'p_campaign_id': campanha_id
    }).execute()
    
    envios = envios_res.data if envios_res.data else []
    logger.info(f"📋 {len(envios)} contatos pendentes")
    
    if not envios:
        logger.warning("Nenhum contato para processar. Finalizando...")
        finish_campaign(campanha_id)
        return
    
    log_to_supabase(campanha_id, f"Processing {len(envios)} contacts")
    
    # 5. Processar cada contato
    min_delay = campanha.get('min_delay', 5)
    max_delay = campanha.get('max_delay', 10)
    
    for i, envio in enumerate(envios):
        # Verificar sinal de parada
        stop_signal = supabase_client.table('campanhas')\
            .select('status')\
            .eq('id', campanha_id)\
            .single()\
            .execute()
        
        if stop_signal.data and stop_signal.data['status'] == 'stopping':
            logger.warning("🛑 Sinal de parada recebido.")
            supabase_client.table('campanhas')\
                .update({'status': 'stopped', 'completed_at': 'NOW()'})\
                .eq('id', campanha_id)\
                .execute()
            log_to_supabase(campanha_id, "Stop signal received. Shutting down.", "WARNING")
            return
        
        # Processar contato (envio já tem todos os dados do JOIN)
        # Separar dados de envio e contato
        contact_data = {
            'id_contato': envio['contato_id'],
            'nome': envio['nome'],
            'telefone': envio['telefone'],
            'store_id': envio['store_id'],
            'role': envio['role']
        }
        
        process_contact(campanha, envio, contact_data, templates)
        
        # Delay entre envios
        if i < len(envios) - 1:
            delay = random.uniform(min_delay, max_delay)
            logger.debug(f"⏳ Aguardando {delay:.1f}s...")
            time.sleep(delay)
    
    # 6. Finalizar campanha
    finish_campaign(campanha_id, is_recurrent=campanha.get('recorrente', True))


def finish_campaign(campanha_id: str, is_recurrent: bool = True):
    """
    Finaliza campanha.
    - Campanhas recorrentes: marca como 'scheduled' para executar novamente
    - Campanhas únicas: marca como 'completed'
    """
    logger.info(f"🏁 Finalizando campanha: {campanha_id}")
    
    if is_recurrent:
        # ✅ NOVO: Campanhas recorrentes voltam para 'scheduled'
        # Isso permite que rodem novamente no próximo horário do cron
        # E RESETAMOS OS CONTATOS PARA PENDING
        
        # 1. Resetar campanha
        supabase_client.table('campanhas')\
            .update({
                'status': 'scheduled',
                'completed_at': None  # Remove completed_at para permitir re-execução
            })\
            .eq('id', campanha_id)\
            .execute()
            
        # 2. Resetar contatos para 'pending'
        # Importante: apenas reseta quem estava sent ou failed da execução anterior
        # para garantir que todos recebam novamente.
        supabase_client.table('campanhas_envios')\
            .update({
                'status': 'pending',
                'sent_at': None,
                'processed_at': None,
                'error_detail': None
            })\
            .eq('campanha_id', campanha_id)\
            .execute()
        
        log_to_supabase(campanha_id, "Recurrent campaign reset: status=scheduled, contacts=pending", "INFO")
        logger.success("✅ Campanha recorrente reagendada e contatos resetados!")
    else:
        # Campanhas únicas: marcar como completed
        supabase_client.table('campanhas')\
            .update({
                'status': 'completed',
                'completed_at': 'NOW()'
            })\
            .eq('id', campanha_id)\
            .execute()
        
        log_to_supabase(campanha_id, "Campaign finished successfully", "INFO")
        logger.success("✅ Campanha única finalizada!")


# ===================================================
# MAIN
# ===================================================

def run_scheduled_campaigns(disable_night_mode=False):
    """
    Verifica e executa campanhas baseado em horário_inicio e dias_semana
    Elimina dependência de croniter / string cron complexa.
    
    Args:
        disable_night_mode: Se True, desativa a janela de segurança noturna (para testes)
    """
    logger.info("🔍 Buscando campanhas agendadas para executar...")
    
    try:
        response = supabase_client.table('campanhas')\
            .select('*')\
            .eq('recorrente', True)\
            .in_('status', ['ativa', 'scheduled'])\
            .execute()
        
        if not response.data:
            logger.info("📭 Nenhuma campanha recorrente encontrada")
            return
        
        logger.info(f"📋 {len(response.data)} campanhas recorrentes encontradas")
        
        now = datetime.now()
        # Mapeamento Python Weekday (0=Mon, 6=Sun) -> DB/Cron (0=Sun, 1=Mon, ..., 6=Sat)
        # Seg (0) -> 1
        # Ter (1) -> 2
        # ...
        # Sab (5) -> 6
        # Dom (6) -> 0
        current_db_day = (now.weekday() + 1) % 7
        current_time_str = now.strftime("%H:%M:%S")
        today_str = now.strftime("%Y-%m-%d")

        # 🚨 GLOBAL SAFETY WINDOW (08:00 - 23:59)
        # Bloqueia envios de madrugada (solicitação do usuário)
        # Pode ser desativado com --no-night-mode ou DISABLE_NIGHT_MODE=true para testes
        if not disable_night_mode and current_time_str < "08:00:00":
             logger.warning(f"💤 Modo Noturno Ativo (00:00 - 08:00). Pausando worker. Hora atual: {current_time_str}")
             logger.info("💡 Dica: Use --no-night-mode para testar fora do horário")
             return

        for campaign in response.data:
            campaign_id = campaign['id']
            campaign_name = campaign.get('nome', 'Sem nome')
            current_status = campaign.get('status')
            
            # 1. Check Status
            if current_status in ['running', 'starting']:
                logger.warning(f"⚠️ Campanha '{campaign_name}' já está rodando. Pulando...")
                continue

            # 2. Check Day of Week
            dias_semana = campaign.get('dias_semana') # Esperado: [1, 2, 3, 4, 5]
            if not dias_semana:
                logger.debug(f"⏭️ '{campaign_name}': Sem dias configurados.")
                continue
                
            if isinstance(dias_semana, list):
                if current_db_day not in dias_semana:
                    logger.debug(f"⏭️ '{campaign_name}': Dia incorreto (Hoje: {current_db_day}, Config: {dias_semana})")
                    continue
            else:
                # Fallback se nao for lista
                if str(current_db_day) not in str(dias_semana):
                    continue

            # 3. Check Time Window
            horario_inicio = campaign.get('horario_inicio') # Ex: "19:00:00"
            horario_fim = campaign.get('horario_fim')       # Ex: "19:10:00"
            
            if not horario_inicio:
                logger.debug(f"⏭️ '{campaign_name}': Sem horário inicio configurado.")
                continue
                
            # Garante que as strings de tempo tenham segundos (formato HH:MM:SS)
            if len(horario_inicio) == 5: horario_inicio += ":00"
            if horario_fim and len(horario_fim) == 5: horario_fim += ":00"

            # Se não houver horário de fim, cria uma tolerância de 10 minutos
            if not horario_fim:
                try:
                    h_in = datetime.strptime(horario_inicio, "%H:%M:%S")
                    h_fim = h_in + timedelta(minutes=10)
                    horario_fim = h_fim.strftime("%H:%M:%S")
                except Exception:
                    horario_fim = "23:59:59" # Fallback de segurança

            # Start Check (Tem que ser MAIOR OU IGUAL ao inicio)
            if current_time_str < horario_inicio:
                logger.debug(f"⏭️ '{campaign_name}': Ainda cedo ({current_time_str} < {horario_inicio})")
                continue
                
            # End Check (Window enforcement - Tem que ser MENOR OU IGUAL ao fim)
            if current_time_str > horario_fim:
                logger.debug(f"⏭️ '{campaign_name}': Passou do horário de tolerância (Atual: {current_time_str} > Fim: {horario_fim})")
                continue

            # 4. Check If Already Ran TODAY (Timezone Aware)
            # ✅ FIX: Converte UTC para Local Time antes de comparar
            started_at = campaign.get('started_at')
            if started_at:
                try:
                    # Parse Supabase timestamp (UTC)
                    # Ex: 2026-02-13T01:10:00+00:00
                    started_dt = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                    
                    # Adjust to Local Time (UTC-3)
                    start_local = started_dt - timedelta(hours=3)
                    started_date_str = start_local.strftime("%Y-%m-%d")
                    
                    if started_date_str == today_str:
                         logger.debug(f"⏭️ '{campaign_name}': Já rodou hoje ({started_date_str})")
                         continue
                         
                except Exception as e:
                    # Fallback to simple string check if parsing fails
                    logger.warning(f"⚠️ Erro ao parsar data {started_at}: {e}. Tentando fallback string.")
                    if today_str in started_at:
                        continue
            
            # 5. EXECUTE
            logger.info(f"🚀 EXECUTANDO: {campaign_name} (Hoje é dia {current_db_day}, Hora {horario_inicio})")
            process_campaign(campaign_id)
                
    except Exception as e:
        logger.error(f"❌ Erro ao buscar campanhas: {e}")


def main():
    """
    Executa worker de campanhas
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Worker de Campanhas - Supabase Only')
    parser.add_argument('--campaign-id', required=False, help='ID da campanha específica a processar')
    parser.add_argument('--daemon', action='store_true', help='Modo daemon - executa campanhas agendadas automaticamente')
    parser.add_argument('--no-night-mode', action='store_true', help='Desativa janela de segurança noturna (08:00-23:59) - APENAS PARA TESTES')
    args = parser.parse_args()
    
    # Check environment variable override
    env_disable_night = os.getenv('DISABLE_NIGHT_MODE', 'false').lower() == 'true'
    disable_night_mode = args.no_night_mode or env_disable_night
    
    if disable_night_mode:
        logger.warning("⚠️  MODO NOTURNO DESATIVADO - Worker pode enviar mensagens a qualquer hora!")
    
    if args.daemon:
        logger.info("🚀 Modo DAEMON ativado - loop infinito")
        
        while True:
            try:
                run_scheduled_campaigns(disable_night_mode=disable_night_mode)
            except Exception as e:
                logger.error(f"❌ Erro no loop daemon: {e}")
            
            # Aguardar 60 segundos
            logger.info("😴 Aguardando 60 segundos...")
            time.sleep(60)
    
    elif args.campaign_id:
        process_campaign(args.campaign_id)
    else:
        parser.print_help()
        # Mudei para warning em vez de erro para não crashar facil
        logger.warning("Use --daemon ou --campaign-id")


if __name__ == "__main__":
    main()