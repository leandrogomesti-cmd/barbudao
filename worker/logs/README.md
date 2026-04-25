# Gestão de Logs - Worker de Relatórios

## 📁 Estrutura de Pastas

```
worker/
└── logs/
    ├── consolidado/      # Logs do relatório semanal (relatorio_admin.py)
    ├── diario/           # Logs do relatório diário (relatorio_admin_ontem.py)
    ├── semanal/          # Logs futuros para análises semanais
    └── pdf/              # PDFs gerados (relatorio_pdf_generator.py)
```

## 🔄 Rotação Automática

- **Rotação**: Diária (novos arquivos a cada dia)
- **Retenção**: 30 dias (logs antigos são deletados automaticamente)
- **Formato**: `{script}_{YYYY-MM-DD}.log`

## 📋 Scripts e Logs

| Script | Pasta de Logs | Formato do Arquivo |
|--------|---------------|-------------------|
| `relatorio_admin.py` | `logs/consolidado/` | `relatorio_admin_YYYY-MM-DD.log` |
| `relatorio_admin_ontem.py` | `logs/diario/` | `relatorio_ontem_YYYY-MM-DD.log` |
| `relatorio_pdf_generator.py` | `logs/pdf/` | `relatorio_{periodo}_YYYYmmdd_HHMMSS.pdf` |

## ⚙️ Cron Jobs Atualizados

```bash
# Relatório Semanal - 22h
0 22 * * * cd /home/ubuntu/Disparador/worker && source .venv/bin/activate && python relatorio_admin.py

# Relatório Diário (Ontem) - 9h
0 9 * * * cd /home/ubuntu/Disparador/worker && source .venv/bin/activate && python relatorio_admin_ontem.py

# Gerar PDF Semanal - 23h (opcional)
0 23 * * 0 cd /home/ubuntu/Disparador/worker && source .venv/bin/activate && python relatorio_pdf_generator.py semana
```

**Nota**: Os logs agora são salvos automaticamente nas pastas, não precisa mais redirecionar com `>>`.

## 🎯 Benefícios

✅ **Organização**: Logs separados por tipo de relatório  
✅ **Automático**: Rotação e limpeza sem intervenção manual  
✅ **Rastreabilidade**: Histórico de 30 dias para debug  
✅ **Padrão**: Formato consistente em todos os logs
