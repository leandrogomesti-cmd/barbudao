#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API Endpoint: Gerador de Relatórios PDF para n8n
Endpoint Flask para gerar relatórios PDF sob demanda via n8n.
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
from flask import Flask, request, send_file, jsonify
from loguru import logger

# Importa funções do gerador de PDF
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from relatorio_pdf_generator import relatorio_hoje, relatorio_ontem, relatorio_semana

app = Flask(__name__)

# Logger Config
LOG_DIR = Path(__file__).parent / "logs" / "api"
LOG_DIR.mkdir(parents=True, exist_ok=True)

logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{message}</cyan>"
)
logger.add(
    LOG_DIR / "api_relatorios_{time:YYYY-MM-DD}.log",
    rotation="1 day",
    retention="30 days",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}"
)

# ===============================
# ENDPOINTS
# ===============================
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "relatorio-pdf-api",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/gerar-relatorio', methods=['POST'])
def gerar_relatorio():
    """
    Gera relatório PDF sob demanda
    
    Body (JSON):
    {
        "periodo": "hoje|ontem|semana",
        "cliente": "Nome do Cliente" (opcional, padrão: "Sterna Café")
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"erro": "Body JSON não fornecido"}), 400
        
        periodo = data.get("periodo", "ontem")
        cliente = data.get("cliente", "Sterna Café")
        
        if periodo not in ["hoje", "ontem", "semana"]:
            return jsonify({"erro": "Período inválido. Use: hoje, ontem ou semana"}), 400
        
        logger.info(f"📊 Gerando relatório: período={periodo}, cliente={cliente}")
        
        # Gera o PDF
        if periodo == "hoje":
            arquivo = relatorio_hoje(cliente)
        elif periodo == "ontem":
            arquivo = relatorio_ontem(cliente)
        elif periodo == "semana":
            arquivo = relatorio_semana(cliente)
        
        if not arquivo:
            logger.error("❌ Falha ao gerar relatório")
            return jsonify({"erro": "Falha ao gerar relatório. Verifique os logs."}), 500
        
        # Retorna o arquivo PDF
        logger.success(f"✅ Relatório gerado: {arquivo}")
        
        return send_file(
            arquivo,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"relatorio_{periodo}_{datetime.now():%Y%m%d}.pdf"
        )
    
    except Exception as e:
        logger.exception(f"💥 Erro ao gerar relatório: {e}")
        return jsonify({"erro": str(e)}), 500

@app.route('/gerar-relatorio-custom', methods=['POST'])
def gerar_relatorio_custom():
    """
    Gera relatório PDF com período customizado
    
    Body (JSON):
    {
        "data_inicio": "2026-01-01",
        "data_fim": "2026-01-31",
        "cliente": "Nome do Cliente" (opcional)
    }
    """
    try:
        from relatorio_pdf_generator import buscar_dados_consolidado, gerar_pdf
        from supabase import create_client
        
        data = request.get_json()
        
        if not data:
            return jsonify({"erro": "Body JSON não fornecido"}), 400
        
        data_inicio = data.get("data_inicio")
        data_fim = data.get("data_fim")
        cliente = data.get("cliente", "Sterna Café")
        
        if not data_inicio or not data_fim:
            return jsonify({"erro": "data_inicio e data_fim são obrigatórios"}), 400
        
        logger.info(f"📊 Gerando relatório customizado: {data_inicio} a {data_fim}")
        
        # Busca dados
        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_KEY = os.getenv("SUPABASE_KEY")
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        dados = buscar_dados_consolidado(supabase, data_inicio, data_fim)
        
        if not dados:
            return jsonify({"erro": "Nenhum dado encontrado para o período"}), 404
        
        # Gera PDF
        arquivo_saida = f"logs/pdf/relatorio_custom_{datetime.now():%Y%m%d_%H%M%S}.pdf"
        gerar_pdf(dados, arquivo_saida, cliente)
        
        logger.success(f"✅ Relatório customizado gerado: {arquivo_saida}")
        
        return send_file(
            arquivo_saida,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"relatorio_{data_inicio}_a_{data_fim}.pdf"
        )
    
    except Exception as e:
        logger.exception(f"💥 Erro ao gerar relatório customizado: {e}")
        return jsonify({"erro": str(e)}), 500

# ===============================
# MAIN
# ===============================
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
