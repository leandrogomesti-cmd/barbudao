#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script: Gerador de Relatórios PDF Consolidados
Gera relatórios PDF no formato padrão Sterna Café com dados financeiros.
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
from loguru import logger
from supabase import create_client, Client
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT

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
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{message}</cyan>"
)

# Credenciais
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.critical("❌ ERRO: Credenciais Supabase não definidas")
    sys.exit(1)

# ===============================
# 2. FUNÇÕES AUXILIARES
# ===============================
def formatar_valor(valor):
    """Formata valor em R$"""
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def buscar_dados_consolidado(client, data_inicio, data_fim):
    """Busca dados consolidados do período"""
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
            l["id_loja"]: l["nome_fantasia"]
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
        
        # Agrupa por loja
        lojas = {}
        total_geral = 0
        
        for d in dados:
            loja_id = d.get("loja_id")
            valor = float(d.get("valor_total_oficial") or 0)
            
            # FILTRO: Ignorar lojas administrativas
            if loja_id in lojas_admin:
                continue
            
            if loja_id not in lojas:
                lojas[loja_id] = 0
            
            lojas[loja_id] += valor
            total_geral += valor
        
        # Busca gerentes (contatos com role MANAGER)
        response_gerentes = client.table("contatos_erp") \
            .select("nome, store_id, role") \
            .eq("role", "MANAGER") \
            .execute()
        
        mapa_gerentes = {}
        for g in response_gerentes.data:
            store_id = g.get("store_id")
            nome = g.get("nome", "N/A")
            role = g.get("role")
            # FILTRO: Excluir gerentes admin
            if store_id and not filtrar_admin(nome, role):
                mapa_gerentes[store_id] = nome
        
        # Monta dados para tabela
        tabela_dados = []
        for loja_id, valor in sorted(lojas.items(), key=lambda x: x[1], reverse=True):
            nome_loja = mapa_lojas.get(loja_id, loja_id)
            gerente = mapa_gerentes.get(loja_id, "N/A")
            
            # Score simulado (pode ser calculado baseado em metas)
            score = "2/5"  # TODO: Implementar lógica de score real
            
            tabela_dados.append({
                "loja": nome_loja,
                "gerente": gerente,
                "faturamento": valor,
                "score": score
            })
        
        return {
            "lojas": tabela_dados,
            "total_geral": total_geral,
            "periodo_inicio": data_inicio,
            "periodo_fim": data_fim
        }
    
    except Exception as e:
        logger.error(f"Erro ao buscar dados: {e}")
        return None


def buscar_dados_diario_completo(client, data_referencia):
    """Busca dados de um dia específico COM detalhes de pagamento"""
    from loguru import logger
    
    try:
        # Busca dados consolidados
        response = client.table("financeiro_consolidado_diario") \
            .select("*") \
            .eq("data_referencia", data_referencia) \
            .execute()
        
        dados = response.data
        if not dados:
            return None
        
        # IMPORTANTE: Buscar nomes das lojas ANTES de agregar os dados
        response_lojas = client.table("empresas_erp") \
            .select("id_loja, nome_fantasia") \
            .execute()
        
        mapa_lojas = {
            l["id_loja"]: l["nome_fantasia"]
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
        
        # Agrupa por loja
        lojas = {}
        gerentes_loja = {}
        total_geral = 0
        
        for d in dados:
            loja_id = d.get("loja_id")
            valor = float(d.get("valor_total_oficial") or 0)
            gerente_responsavel = d.get("ultimo_gerente_responsavel")
            
            # FILTRO: Ignorar lojas administrativas
            if loja_id in lojas_admin:
                continue
            
            if loja_id not in lojas:
                lojas[loja_id] = 0
            
            lojas[loja_id] += valor
            total_geral += valor
            
            # FILTRO: Só adiciona gerente se não for admin
            if gerente_responsavel and loja_id not in gerentes_loja:
                if not filtrar_admin(gerente_responsavel):
                    gerentes_loja[loja_id] = gerente_responsavel
        
        # Busca gerentes fallback
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
        
        # Busca detalhes de pagamento
        response_fechamentos = client.table("fechamentos_caixa") \
            .select("loja_id, val_debito, val_credito, val_ticket, val_pix, val_dinheiro") \
            .gte("data_registro", f"{data_referencia} 00:00:00") \
            .lte("data_registro", f"{data_referencia} 23:59:59") \
            .execute()
        
        # Agrupa detalhes por loja
        detalhes_loja = {}
        for f in response_fechamentos.data:
            loja_id = f.get("loja_id")
            if loja_id not in detalhes_loja:
                detalhes_loja[loja_id] = {
                    "debito": 0,
                    "credito": 0,
                    "ticket": 0,
                    "pix": 0,
                    "dinheiro": 0
                }
            
            detalhes_loja[loja_id]["debito"] += float(f.get("val_debito") or 0)
            detalhes_loja[loja_id]["credito"] += float(f.get("val_credito") or 0)
            detalhes_loja[loja_id]["ticket"] += float(f.get("val_ticket") or 0)
            detalhes_loja[loja_id]["pix"] += float(f.get("val_pix") or 0)
            detalhes_loja[loja_id]["dinheiro"] += float(f.get("val_dinheiro") or 0)
        
        # Monta dados para tabela
        tabela_dados = []
        for loja_id, valor in sorted(lojas.items(), key=lambda x: x[1], reverse=True):
            nome_loja = mapa_lojas.get(loja_id, loja_id)
            gerente = gerentes_loja.get(loja_id) or mapa_gerentes_contatos.get(loja_id, "N/A")
            score = "2/5"
            
            # Adiciona detalhes se disponível
            detalhes = None
            if loja_id in detalhes_loja:
                det = detalhes_loja[loja_id]
                if any(det.values()):
                    detalhes = det
            
            tabela_dados.append({
                "loja": nome_loja,
                "gerente": gerente,
                "faturamento": valor,
                "score": score,
                "detalhes_pagamento": detalhes
            })
        
        return {
            "lojas": tabela_dados,
            "total_geral": total_geral,
            "periodo_inicio": data_referencia,
            "periodo_fim": data_referencia
        }
    
    except Exception as e:
        logger.error(f"Erro ao buscar dados diários: {e}")
        return None

def gerar_pdf(dados, arquivo_saida, cliente_nome="Sterna Café"):
    """Gera PDF no formato padrão"""
    try:
        doc = SimpleDocTemplate(
            arquivo_saida,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        story = []
        styles = getSampleStyleSheet()
        
        # Estilo customizado para título
        titulo_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.black,
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        # Estilo para informações
        info_style = ParagraphStyle(
            'Info',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=12,
            alignment=TA_LEFT
        )
        
        # Título
        titulo = Paragraph(f"Relatório Consolidado - {cliente_nome}", titulo_style)
        story.append(titulo)
        
        # Informações do período
        periodo_inicio = datetime.fromisoformat(dados["periodo_inicio"]).strftime("%d/%m/%Y")
        periodo_fim = datetime.fromisoformat(dados["periodo_fim"]).strftime("%d/%m/%Y")
        
        info_cliente = Paragraph(f"Cliente: {cliente_nome}", info_style)
        story.append(info_cliente)
        
        info_periodo = Paragraph(f"Período Analisado: {periodo_inicio} a {periodo_fim}", info_style)
        story.append(info_periodo)
        
        story.append(Spacer(1, 0.5*cm))
        
        # Faturamento Total
        total_style = ParagraphStyle(
            'Total',
            parent=styles['Normal'],
            fontSize=14,
            fontName='Helvetica-Bold',
            spaceAfter=20
        )
        total_texto = Paragraph(
            f"Faturamento Total: {formatar_valor(dados['total_geral'])}",
            total_style
        )
        story.append(total_texto)
        
        story.append(Spacer(1, 0.5*cm))
        
        # Verifica se alguma loja tem detalhes de pagamento
        tem_detalhes = any(row.get('detalhes_pagamento') for row in dados['lojas'])
        
        if tem_detalhes:
            # FORMATO COM DETALHES (cards por loja)
            for row in dados['lojas']:
                # Nome da loja
                story.append(Paragraph(
                    f"<b>{row['loja']}</b>",
                    ParagraphStyle('LojaNome', fontSize=12, textColor=colors.HexColor('#2C5F2D'), spaceAfter=4)
                ))
                
                # Gerente
                story.append(Paragraph(
                    f"Gerente: {row['gerente']}",
                    ParagraphStyle('LojaGerente', fontSize=10, textColor=colors.grey, spaceAfter=6)
                ))
                
                # Tabela de detalhes se disponível
                if row.get('detalhes_pagamento'):
                    det = row['detalhes_pagamento']
                    det_tabela = [
                        ['Forma de Pagamento', 'Valor'],
                        ['Débito', formatar_valor(det['debito'])],
                        ['Crédito', formatar_valor(det['credito'])],
                        ['Ticket', formatar_valor(det['ticket'])],
                        ['PIX', formatar_valor(det['pix'])],
                        ['Dinheiro', formatar_valor(det['dinheiro'])],
                        ['TOTAL', formatar_valor(row['faturamento'])]
                    ]
                    
                    t = Table(det_tabela, colWidths=[8*cm, 6*cm])
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                        ('BACKGROUND', (0, -1), (-1, -1), colors.Color(0.9, 0.9, 0.9)),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black),
                        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                        ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ]))
                    story.append(t)
                story.append(Spacer(1, 16))
            
            # Total consolidado
            story.append(Paragraph(
                f"<b>TOTAL CONSOLIDADO: {formatar_valor(dados['total_geral'])}</b>",
                ParagraphStyle('TotalGeral', fontSize=14, textColor=colors.HexColor('#2C5F2D'), spaceAfter=12)
            ))
        else:
            # FORMATO SEM DETALHES (tabela tradicional)
            tabela_header = [['Loja', 'Gerente', 'Faturamento', 'Score']]
            tabela_rows = [
                [
                    row['loja'],
                    row['gerente'],
                    formatar_valor(row['faturamento']),
                    row['score']
                ]
                for row in dados['lojas']
            ]
            
            # Soma total
            soma_faturamento = sum(row['faturamento'] for row in dados['lojas'])
            linha_soma = ['Soma', '', formatar_valor(soma_faturamento), '']
            
            tabela_completa = tabela_header + tabela_rows + [linha_soma]
            
            # Criação da tabela
            tabela = Table(tabela_completa, colWidths=[6*cm, 4*cm, 4*cm, 2*cm])
            
            # Estilo da tabela
            tabela.setStyle(TableStyle([
                # Cabeçalho
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                
                # Dados (exceto última linha)
                ('ALIGN', (0, 1), (1, -2), 'LEFT'),
                ('ALIGN', (2, 1), (-1, -2), 'RIGHT'),
                ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -2), 10),
                
                # Linha de SOMA (última linha)
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -1), (-1, -1), 12),
                ('ALIGN', (2, -1), (2, -1), 'RIGHT'),
                ('BACKGROUND', (0, -1), (-1, -1), colors.Color(0.9, 0.9, 0.9)),
                
                # Grid e layout geral
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.Color(0.95, 0.95, 0.95)])
            ]))
            
            story.append(tabela)
        
        # Build PDF
        doc.build(story)
        logger.success(f"✅ PDF gerado: {arquivo_saida}")
        return True
    
    except Exception as e:
        logger.error(f"Erro ao gerar PDF: {e}")
        return False

# ===============================
# 3. FUNÇÕES DE RELATÓRIO
# ===============================
def relatorio_hoje(cliente="Sterna Café"):
    """Gera relatório de hoje"""
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        hoje = datetime.now().date().isoformat()
        logger.info(f"📊 Gerando relatório de HOJE: {hoje}")
        
        dados = buscar_dados_diario_completo(supabase, hoje)
        
        if not dados:
            logger.warning("⚠️ Nenhum dado encontrado para hoje")
            return None
        
        arquivo_saida = f"logs/pdf/relatorio_hoje_{datetime.now():%Y%m%d_%H%M%S}.pdf"
        gerar_pdf(dados, arquivo_saida, cliente)
        
        return arquivo_saida
    
    except Exception as e:
        logger.error(f"Erro: {e}")
        return None

def relatorio_ontem(cliente="Sterna Café"):
    """Gera relatório de ontem"""
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        ontem = (datetime.now().date() - timedelta(days=1)).isoformat()
        logger.info(f"📊 Gerando relatório de ONTEM: {ontem}")
        
        dados = buscar_dados_diario_completo(supabase, ontem)
        
        if not dados:
            logger.warning("⚠️ Nenhum dado encontrado para ontem")
            return None
        
        arquivo_saida = f"logs/pdf/relatorio_ontem_{datetime.now():%Y%m%d_%H%M%S}.pdf"
        gerar_pdf(dados, arquivo_saida, cliente)
        
        return arquivo_saida
    
    except Exception as e:
        logger.error(f"Erro: {e}")
        return None

def relatorio_semana(cliente="Sterna Café"):
    """Gera relatório da última semana"""
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        hoje = datetime.now().date()
        inicio_semana = (hoje - timedelta(days=7)).isoformat()
        fim_semana = hoje.isoformat()
        
        logger.info(f"📊 Gerando relatório SEMANAL: {inicio_semana} a {fim_semana}")
        
        dados = buscar_dados_consolidado(supabase, inicio_semana, fim_semana)
        
        if not dados:
            logger.warning("⚠️ Nenhum dado encontrado para a semana")
            return None
        
        arquivo_saida = f"logs/pdf/relatorio_semana_{datetime.now():%Y%m%d_%H%M%S}.pdf"
        gerar_pdf(dados, arquivo_saida, cliente)
        
        return arquivo_saida
    
    except Exception as e:
        logger.error(f"Erro: {e}")
        return None

# ===============================
# 4. MAIN
# ===============================
def main():
    """Função principal"""
    logger.info("📄 Gerador de Relatórios PDF")
    logger.info("=" * 60)
    
    import argparse
    
    parser = argparse.ArgumentParser(description="Gerador de Relatórios PDF")
    parser.add_argument(
        "periodo",
        choices=["hoje", "ontem", "semana"],
        help="Período do relatório"
    )
    parser.add_argument(
        "--cliente",
        default="Sterna Café",
        help="Nome do cliente"
    )
    
    args = parser.parse_args()
    
    # Garante que pasta de logs existe
    Path("logs/pdf").mkdir(parents=True, exist_ok=True)
    
    if args.periodo == "hoje":
        arquivo = relatorio_hoje(args.cliente)
    elif args.periodo == "ontem":
        arquivo = relatorio_ontem(args.cliente)
    elif args.periodo == "semana":
        arquivo = relatorio_semana(args.cliente)
    
    if arquivo:
        logger.success(f"🎯 Relatório salvo em: {arquivo}")
    else:
        logger.error("❌ Falha ao gerar relatório")
        sys.exit(1)

if __name__ == "__main__":
    main()
