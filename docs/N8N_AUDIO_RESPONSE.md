# n8n — Resposta da IA em áudio quando o cliente envia áudio

**Workflow alvo:** `01. DelPierro Chatwoot.json` (em `docs/n8n/`).
**Aplicação:** manual no editor n8n (não há API automática para alterar workflows pelo app).

## Sintoma reportado
- Em versões antigas: cliente mandava áudio → IA respondia áudio.
- Hoje: cliente manda áudio → IA responde texto.

## Diagnóstico esperado
O workflow recebe webhook do Chatwoot e o payload contém `attachments[0].file_type`. Verifique:

1. **Detecção do tipo de mensagem**: deve haver um node IF/Switch logo após o webhook que classifica `inputType`:
   - Se `attachments[0].file_type === 'audio'` (ou `voice`/`opus`) → `inputType = 'audio'`.
   - Caso contrário → `inputType = 'text'`.
2. **Transcrição**: branch de áudio chama Whisper/Gemini para gerar `transcricao`.
3. **Geração da resposta**: branch único do agente IA gera `respostaTexto` (mesmo que tenha vindo de áudio).
4. **Envio**: hoje provavelmente está enviando sempre como mensagem de texto via `Chatwoot send-message`.

## Correção a aplicar

### 1. Set node "inputType" (se não existir)

Adicione um node **Set** logo após o `Buscar Contexto` com:
```
inputType = ={{ $json.attachments && $json.attachments[0]?.file_type === 'audio' ? 'audio' : 'text' }}
```
Repassar este valor por todos os branches subsequentes (use `$('Set inputType').item.json.inputType`).

### 2. Branch de TTS

Após o node que produz `respostaTexto`, adicione um **IF** com a condição:
```
{{ $('Set inputType').item.json.inputType === 'audio' }}
```

- **Branch `true`**: gerar áudio TTS e enviar como anexo no Chatwoot.
- **Branch `false`**: enviar como texto (comportamento atual).

### 3. Geração de áudio (TTS)

Opções:

- **Gemini TTS** (`gemini-2.5-flash-preview-tts`): chamar a API `models.generateContent` com `audioConfig`. Já existe credencial Google Generative AI no n8n.
- **ElevenLabs**: alta qualidade, requer API key dedicada. Documentar credencial em `tenants.config_ia` (Fase 3).

Salvar o áudio gerado em `binary` no n8n com o mime type adequado (`audio/ogg; codecs=opus` para WhatsApp).

### 4. Envio do áudio para Chatwoot

Endpoint:
```
POST {{ CHATWOOT_URL }}/api/v1/accounts/{{ ACCOUNT_ID }}/conversations/{{ conversation.id }}/messages
```
- `Content-Type: multipart/form-data`
- Campos:
  - `content`: opcional (pode ser vazio — apenas áudio)
  - `message_type`: `outgoing`
  - `attachments[]`: o binário de áudio gerado

### 5. Logging para debug

Adicione um node **Supabase Insert** numa nova tabela `n8n_audio_logs`:

```sql
CREATE TABLE IF NOT EXISTS n8n_audio_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text,
  contact_phone text,
  input_type text,
  response_type text,
  audio_generated boolean,
  audio_provider text,
  audio_duration_ms int,
  error text,
  created_at timestamptz DEFAULT now()
);
```

Persistir 1 linha por mensagem processada. Facilita o diagnóstico futuro de "por que não respondeu áudio".

## Critérios de aceite
- [ ] Cliente envia texto → IA responde texto (regressão).
- [ ] Cliente envia áudio → IA responde áudio.
- [ ] Tabela `n8n_audio_logs` recebe 1 linha para cada interação processada.
- [ ] Logs do n8n mostram `inputType` e `responseType` corretamente.

## Pendências e riscos
- **Credencial TTS**: confirmar qual provedor (Gemini ou ElevenLabs) e configurar a credencial no n8n. Sem credencial, o branch de áudio falha — pode ser configurado para fallback em texto + log de erro.
- **Tamanho do áudio**: WhatsApp limita áudio a ~16MB; truncar respostas longas ou avisar.
- **Custo**: TTS aumenta o custo por mensagem; monitorar.
- **Latência**: TTS adiciona 1–3s; aceitável para experiência de voz.

## Fase 3 (multi-tenant)
Quando o sistema virar SaaS, este workflow precisará buscar `tenants.config_ia.tts_provider` e `tts_credentials` em vez de usar credenciais globais do n8n.
