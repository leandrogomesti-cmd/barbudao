# API REST — Barbearia Del Pierro

Base URL produção: `https://barbearia--dbltecnologia-de408.us-east4.hosted.app`

---

## Autenticação

Todos os endpoints `/api/v1/*` exigem:

```
x-api-key: 7f0932c1-2a1e-4b9e-8c0d-3f0b21a8c4e5
```

Também aceita o header alternativo `x-app-api-key` com o mesmo valor.
A chave é configurada via variável de ambiente `APP_API_KEY`.

---

## Profissionais

### `GET /api/v1/professionals`
Lista profissionais. Por padrão retorna apenas ativos.

**Query params:**
| Param | Tipo | Descrição |
|---|---|---|
| `ativo` | boolean | Filtrar por ativo/inativo. Padrão: `true` |
| `unidade` | string | Filtrar por `unidade_padrao` |

### `POST /api/v1/professionals`
Cria profissional. Retorna `201`.

**Body obrigatório:** `nome` (string, mín. 2 caracteres)

**Body opcional:** `apelido`, `email`, `telefone`, `cpf`, `funcao`, `unidade_padrao`, `perfil_acesso` (`ADMIN|GERENTE|PROFISSIONAL|RECEPCAO`), `possui_agenda`, `comissao_servico`, `comissao_produto`, `prolabore_fixo`

### `GET /api/v1/professionals/:id`
Retorna profissional por ID.

### `PATCH /api/v1/professionals/:id`
Atualiza campos parcialmente.

### `DELETE /api/v1/professionals/:id`
Soft-delete: marca `ativo = false`. Não remove do banco.

---

## Serviços

### `GET /api/v1/services`
Lista serviços. Por padrão retorna apenas ativos.

**Query params:** `ativo` (boolean), `categoria_id` (string)

### `POST /api/v1/services`
Cria serviço.

**Body obrigatório:** `nome`, `preco_venda`

**Body opcional:** `descricao`, `duracao_minutos`, `categoria_id`, `ativo`

### `GET /api/v1/services/:id`
Retorna serviço por ID.

### `PATCH /api/v1/services/:id`
Atualiza campos parcialmente.

### `DELETE /api/v1/services/:id`
Remove serviço. Bloqueado se existirem insumos vinculados (`servico_insumos`).

---

## Agendamentos

### `GET /api/v1/appointments`
Lista agendamentos com filtros opcionais.

**Query params:** `data` (YYYY-MM-DD), `unidade`, `profissional`, `status`

### `POST /api/v1/appointments`
Cria agendamento com validação Zod e verificação de conflito de horário.

**Body obrigatório:** `nome_cliente`, `telefone`, `servico`, `inicio_agendado`, `fim_agendado`, `unidade`

**Body opcional:** `profissional` (padrão: `"Indiferente"`), `status_agendamento`, `id_conversa_chatwoot`, `id_evento_google`

**Resposta de conflito:** `409 Conflict`

### `GET /api/v1/appointments/:id`
Retorna agendamento por ID.

### `PATCH /api/v1/appointments/:id`
Atualiza campos. Se `profissional`, `inicio_agendado` ou `fim_agendado` forem alterados, verifica conflito de horário antes de salvar.

**Campos permitidos:** `nome_cliente`, `telefone`, `servico`, `profissional`, `inicio_agendado`, `fim_agendado`, `status_agendamento`, `unidade`, `id_evento_google`, `forma_pagamento`, `id_conversa_chatwoot`, `ultima_interacao_em`, `lembrete_enviado_em`, `followup_enviado_em`

---

## Contatos

### `PATCH /api/v1/contacts/by-phone/:phone`
### `PUT /api/v1/contacts/by-phone/:phone`
Atualiza contato pelo telefone. Normaliza dígitos automaticamente.

**Body (campos permitidos):** `aceita_marketing` (boolean), `nome`, `email`

---

## Contexto do Agente

### `GET /api/v1/agent/context`
Retorna dados consolidados para o agente IA (serviços, profissionais, unidades).

**Query params:**
| Param | Tipo | Descrição |
|---|---|---|
| `unidade` | string | Filtrar profissionais por unidade |

**Resposta:**
```json
{
  "services": [{ "id": "...", "nome": "Corte", "preco_venda": 59.90, "duracao_minutos": 30 }],
  "professionals": [{ "id": "...", "nome": "João", "unidade_padrao": "Del Pierro", "possui_agenda": true }],
  "units": [{ "id_loja": "...", "nome": "Del Pierro" }],
  "timestamp": "2026-04-11T..."
}
```

---

## Campanhas

### `GET /api/campaigns`
Lista campanhas.

### `POST /api/campaigns`
Cria campanha.

### `PUT /api/campaigns/:id`
Atualiza campanha (inclui mudança de status: `draft → ativa → pausada → concluida`).

### `DELETE /api/campaigns/:id`
Remove campanha (bloqueia se estiver ativa).
