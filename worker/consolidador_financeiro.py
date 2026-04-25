#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ETL Script: Consolidacao Financeira Blindada
Correções: Timezone BRT, Segurança, Paginação Automática e Backfill.
"""

import sys
import os
import time
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from loguru import logger
from supabase import create_client, Client

# ===============================
# 1. CONFIGURAÇÃO
# ===============================
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

try:
    from dotenv import load_dotenv
    # Tenta carregar .env da raiz
    load_dotenv(override=True)
except Exception as e:
    logger.warning(f"Dotenv não carregado: {e}")

# Logger Config
logger.remove()
logger.add(sys.stderr, format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{message}</cyan>")

# Credenciais (SEM FALLBACK INSEGURO)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.critical("❌ ERRO: SUPABASE_URL ou SUPABASE_KEY não definidos no .env")
    sys.exit(1)

# ===============================
# 2. FUNÇÕES AUXILIARES
# ===============================
def data_brasilia(data_iso_utc):
    """
    Converte UTC (banco) para Data Brasilia (Relatório).
    Ex: 2026-02-02T01:00:00Z (22h BRT) -> Retorna data do dia anterior
    """
    try:
        # Corrige string ISO se necessário e cria objeto datetime
        data_str = data_iso_utc.replace("Z", "+00:00")
        dt_utc = datetime.fromisoformat(data_str)
        
        # Subtrai 3 horas (Horário de Brasília)
        dt_brt = dt_utc - timedelta(hours=3)
        
        # REGRA DA MADRUGADA: Se for antes das 08:00, conta como plantão anterior
        # Ex: 04:20 de 10/02 -> Faturamento de 09/02
        if dt_brt.hour < 8:
            dt_brt = dt_brt - timedelta(days=1)

        return dt_brt.date().isoformat()
    except Exception:
        # Fallback seguro
        return data_iso_utc.split("T")[0]

def buscar_dados_paginados(client, data_inicio):
    """Loop para baixar mais de 1000 registros se necessário"""
    registros = []
    offset = 0
    limit = 1000
    
    logger.info(f"📡 Buscando dados a partir de {data_inicio}...")
    
    while True:
        response = client.table("fechamentos_caixa") \
            .select("loja_id, valor_declarado, gerente_responsavel, data_registro") \
            .gte("data_registro", f"{data_inicio}T00:00:00") \
            .order("data_registro", desc=False) \
            .range(offset, offset + limit - 1) \
            .execute()
            
        dados = response.data
        if not dados:
            break
            
        registros.extend(dados)
        logger.debug(f"   ↳ Baixados {len(dados)} registros (Total: {len(registros)})...")
        
        if len(dados) < limit:
            break # Fim dos dados
            
        offset += limit
        
    return registros

# ===============================
# 3. MOTOR DE CONSOLIDAÇÃO
# ===============================
def consolidar_financeiro(modo_full=False):
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        hoje = datetime.now().date()
        
        if modo_full:
            logger.warning("☢️ MODO FULL LOAD: Processando histórico desde 2023...")
            # Data distante para pegar tudo
            data_inicio = datetime(2023, 1, 1).date()
        else:
            logger.info("⏱️ MODO ROTINA: Verificando últimos 5 dias...")
            data_inicio = hoje - timedelta(days=5)
        
        # 1. Busca Dados (Paginado)
        fechamentos = buscar_dados_paginados(supabase, data_inicio)
        
        if not fechamentos:
            logger.warning("⚠️ Nenhum dado encontrado.")
            return

        logger.info(f"📊 Processando {len(fechamentos)} registros brutos...")
        
        # 2. Agrupamento em Memória
        grupos = {}
        
        for f in fechamentos:
            loja_id = f.get("loja_id")
            raw_date = f.get("data_registro")
            
            # Conversão Segura de Float
            try:
                valor = float(f.get("valor_declarado") or 0)
            except: 
                valor = 0.0
            
            gerente = f.get("gerente_responsavel")
            
            if not loja_id or not raw_date: continue
            
            # --- Correções ---
            data_ref = data_brasilia(raw_date) # Ajusta Fuso
            loja_key = loja_id.strip() # Remove espaços
            
            chave = f"{loja_key}_{data_ref}"
            
            if chave not in grupos:
                grupos[chave] = {
                    "loja_id": loja_key,
                    "data_referencia": data_ref,
                    "valor_total": 0.0,
                    "qtd": 0,
                    "ultimo_gerente": None
                }
            
            grupos[chave]["valor_total"] += valor
            grupos[chave]["qtd"] += 1
            grupos[chave]["ultimo_gerente"] = gerente # Como está ordenado ASC, o último vence
            
        # 3. Gravação (Upsert em Lote)
        payload = []
        for g in grupos.values():
            payload.append({
                "loja_id": g["loja_id"],
                "data_referencia": g["data_referencia"],
                "valor_total_oficial": round(g["valor_total"], 2),
                "qtd_fechamentos": g["qtd"],
                "ultimo_gerente_responsavel": g["ultimo_gerente"],
                "updated_at": datetime.now().isoformat()
            })
            
        if payload:
            logger.info(f"💾 Salvando {len(payload)} dias consolidados...")
            # Envia em blocos de 100
            for i in range(0, len(payload), 100):
                lote = payload[i:i+100]
                supabase.table("financeiro_consolidado_diario").upsert(
                    lote, on_conflict="loja_id,data_referencia"
                ).execute()
                
            logger.success(f"✅ Sincronização Concluída!")
        
    except Exception as e:
        logger.exception(f"💥 Erro Fatal: {e}")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="Recalcula todo o histórico")
    parser.add_argument("--loop", action="store_true", help="Executa continuamente a cada 1 hora")
    args = parser.parse_args()
    
    if args.loop:
        logger.info("🔁 MODO LOOP ATIVADO: Consolidação automática a cada 1 hora")
        logger.info("💡 Para parar: Ctrl+C")
        logger.info("💡 Para rodar em background: use 'screen' ou 'nohup'")
        logger.info("-" * 60)
        
        while True:
            try:
                consolidar_financeiro(modo_full=args.full)
                logger.info(f"⏰ Próxima execução em 1 hora ({datetime.now() + timedelta(hours=1):%H:%M:%S})")
                time.sleep(3600)  # 1 hora = 3600 segundos
            except KeyboardInterrupt:
                logger.warning("🛑 Loop interrompido pelo usuário.")
                sys.exit(0)
            except Exception as e:
                logger.error(f"⚠️ Erro no loop: {e}. Aguardando 5 min para retry...")
                time.sleep(300)  # Aguarda 5 min em caso de erro
    else:
        consolidar_financeiro(modo_full=args.full)