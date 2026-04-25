# N8N — Agente Bia (Barbearia Del Pierro)

## Workflows

| Arquivo | Trigger | Função |
|---|---|---|
| `01. DelPierro Chatwoot.json` | Webhook Chatwoot (mensagem recebida) | Agente principal: atendimento, agendamento, cancelamento, reagendamento |
| `02. Lembrete (1h).json` | Cron `*/10 * * * *` | Envia lembrete 1h antes do agendamento via WhatsApp |
| `03. Follow up.json` | Cron `*/15 * * * *` | Envia avaliação 2h após atendimento finalizado |

---

## Ferramentas do agente (Workflow 01)

| Ferramenta (node) | Método | Endpoint/Destino | Função |
|---|---|---|---|
| `verificar_agenda` | GET | Google Calendar API | Verifica disponibilidade de horário (profissional = Indiferente) |
| `verificar_agenda_profissional` | GET | Google Calendar API | Verifica disponibilidade para profissional específico |
| `agendar_no_google` | POST | Google Calendar API | Cria evento no calendário |
| `cancelar_no_google` | DELETE | Google Calendar API | Remove evento do calendário |
| `atualizar_no_google` | PATCH | Google Calendar API | Atualiza evento (reagendamento/confirmação) |
| `salvar_agendamento_banco` | POST | Supabase REST `/controle_atendimentos` | Persiste agendamento no banco |
| `cancelar_agendamento_banco` | PATCH | Supabase REST `/controle_atendimentos?id_evento_google=eq.X` | Marca status como `Cancelado` |
| `atualizar_agendamento_banco` | PATCH | Supabase REST `/controle_atendimentos?id_evento_google=eq.X` | Atualiza dados do agendamento |
| `buscar_profissionais` | GET | Supabase REST `/profissionais` | Lista profissionais ativos |
| `buscar_servicos` | GET | `GET /api/v1/agent/context` | Retorna serviços, profissionais e unidades |
| `buscar_unidades` | GET | `GET /api/v1/agent/context` | Retorna serviços, profissionais e unidades |
| `desabilitar_marketing` | PUT | `PUT /api/v1/contacts/by-phone/:phone` | Marca `aceita_marketing = false` |

---

## Autenticação N8N → App

Os nós que chamam o app (`buscar_servicos`, `buscar_unidades`, `desabilitar_marketing`) usam:

```
Header: x-api-key
Value:  7f0932c1-2a1e-4b9e-8c0d-3f0b21a8c4e5
```

Esta chave deve ser igual à variável `APP_API_KEY` configurada no Firebase App Hosting.

---

## Autenticação N8N → Supabase

Os nós que acessam Supabase diretamente (`salvar_agendamento_banco`, `cancelar_agendamento_banco`, `atualizar_agendamento_banco`, `buscar_profissionais`) usam:

```
Header: apikey        → service_role key do projeto qtfmjdcheidhdmdnmjle
Header: Authorization → Bearer <service_role key>
```

---

## Memória do agente

O agente armazena o histórico de conversas na tabela `n8n_historico_mensagens`:

| Campo | Tipo | Descrição |
|---|---|---|
| `session_id` | text | ID da conversa Chatwoot |
| `message` | jsonb | `{ type, content, context }` |
| `created_at` | timestamptz | Timestamp da mensagem |

---

## Lembretes e Follow-up

Os workflows 02 e 03 consultam diretamente o Supabase via credencial Postgres (não via API REST):

**Workflow 02 — Lembrete:**
- Busca agendamentos com `inicio_agendado` entre `now() + 60min` e `now() + 70min`
- Filtra `lembrete_enviado_em IS NULL` e status não cancelado
- Envia mensagem via Chatwoot API
- Atualiza `lembrete_enviado_em = now()`

**Workflow 03 — Follow-up:**
- Busca atendimentos com `status_agendamento = 'Finalizado'` e `followup_enviado_em IS NULL`
- Filtra `fim_agendado < now() - 2h`
- Envia avaliação via Chatwoot API
- Atualiza `followup_enviado_em = now()`

---

## Variáveis de ambiente N8N

| Variável | Valor |
|---|---|
| `CHATWOOT_BASE_URL` | `http://chatai.agenticx.ia.br:3002` |
| Credencial Google Calendar | Conta `diego.freebsd@gmail.com` |
| Credencial Supabase | Connection string do projeto `qtfmjdcheidhdmdnmjle` |
| Credencial Chatwoot | Token da conta admin |

---

## Importar workflows

Para atualizar um workflow no N8N:
1. Abrir N8N → Workflows
2. Selecionar o workflow → botão "..." → **Import from file**
3. Selecionar o JSON da pasta `docs/n8n/`
4. Salvar e ativar
