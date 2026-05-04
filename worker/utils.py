import os
import time
import requests
from loguru import logger
from postgrest.exceptions import APIError

# --- CHATWOOT CONFIG ---
CHATWOOT_URL          = os.getenv("CHATWOOT_URL")
CHATWOOT_ACCOUNT_ID   = os.getenv("CHATWOOT_ACCOUNT_ID")
CHATWOOT_INBOX_ID     = os.getenv("CHATWOOT_INBOX_ID")
CHATWOOT_API_TOKEN    = os.getenv("CHATWOOT_API_TOKEN")

def _chatwoot_headers() -> dict:
    return {
        "api_access_token": CHATWOOT_API_TOKEN,
    }

def _chatwoot_base_url() -> str:
    return f"{CHATWOOT_URL}/api/v1/accounts/{CHATWOOT_ACCOUNT_ID}"

def normalize_brazilian_phone(phone: str) -> str:
    """
    Normaliza telefone brasileiro para 12 dígitos (formato WhatsApp JID).
    - Remove formatação
    - Adiciona DDI 55 se necessário
    - Remove o 9 extra pós-2012 (13 → 12 dígitos)
    Retorna apenas dígitos, sem +.
    """
    if not phone: return ""
    digits = ''.join(filter(str.isdigit, str(phone)))

    # Adicionar DDI 55 se número local (10 ou 11 dígitos)
    if len(digits) in (10, 11):
        digits = '55' + digits

    # Strip do 9 extra: 55 + DDD(2) + 9 + número(8) = 13 → 12 dígitos
    if len(digits) == 13 and digits[4] == '9':
        digits = digits[:4] + digits[5:]

    return digits  # 12 dígitos, sem +

def _chatwoot_resolve_contact(name: str, phone_digits: str) -> int | None:
    """Passo 1 — Encontrar ou criar contato. Retorna contact_id."""
    if not all([CHATWOOT_URL, CHATWOOT_ACCOUNT_ID, CHATWOOT_API_TOKEN]):
        logger.error("❌ Chatwoot configuration missing!")
        return None
        
    phone_e164 = f"+{phone_digits}"
    base = _chatwoot_base_url()
    headers = _chatwoot_headers()

    # 1a. Buscar contato existente
    try:
        resp = requests.get(
            f"{base}/contacts/search",
            params={"q": phone_digits, "include_contacts": "true"},
            headers=headers,
            timeout=15,
        )
        if resp.status_code == 200:
            data = resp.json()
            contacts = data.get("payload", {}).get("contacts") or data.get("payload") or []
            if isinstance(contacts, list) and contacts:
                return contacts[0]["id"]
    except Exception as e:
        logger.warning(f"⚠️ Chatwoot search contact error: {e}")

    # 1b. Criar novo contato
    try:
        resp = requests.post(
            f"{base}/contacts",
            headers=headers,
            json={"name": name, "phone_number": phone_e164},
            timeout=15,
        )
        if resp.status_code in (200, 201):
            body = resp.json()
            contact = body.get("payload", {}).get("contact") or body.get("payload") or body
            contact_id = contact.get("id") if isinstance(contact, dict) else None
            if contact_id:
                return contact_id
        logger.error(f"❌ Chatwoot create contact: HTTP {resp.status_code} {resp.text}")
    except Exception as e:
        logger.error(f"❌ Chatwoot create contact exception: {e}")

    return None

def _chatwoot_resolve_conversation(contact_id: int, phone_digits: str) -> int | None:
    """Passo 2 — Encontrar ou criar conversa. Retorna conversation_id."""
    if not CHATWOOT_INBOX_ID:
        logger.error("❌ CHATWOOT_INBOX_ID missing!")
        return None
        
    inbox_id = int(CHATWOOT_INBOX_ID)
    base = _chatwoot_base_url()
    headers = _chatwoot_headers()

    # 2a. Buscar conversa aberta existente
    try:
        resp = requests.get(
            f"{base}/contacts/{contact_id}/conversations",
            headers=headers,
            timeout=15,
        )
        if resp.status_code == 200:
            convs = resp.json().get("payload") or []
            for c in convs:
                if c.get("inbox_id") == inbox_id and c.get("status") == "open":
                    return c["id"]
    except Exception as e:
        logger.warning(f"⚠️ Chatwoot list conversations error: {e}")

    # 2b. Criar nova conversa
    try:
        resp = requests.post(
            f"{base}/conversations",
            headers=headers,
            json={"contact_id": contact_id, "inbox_id": inbox_id, "source_id": phone_digits},
            timeout=15,
        )
        if resp.status_code in (200, 201):
            body = resp.json()
            conv_id = body.get("id") or (body.get("payload") or {}).get("id")
            if conv_id:
                return conv_id
        logger.error(f"❌ Chatwoot create conversation: HTTP {resp.status_code} {resp.text}")
    except Exception as e:
        logger.error(f"❌ Chatwoot create conversation exception: {e}")

    return None

def send_chatwoot_message(phone: str, name: str, message: str, media_url: str = None) -> dict:
    """
    Envia mensagem WhatsApp via Chatwoot (fluxo 3-passos canônico).
    Se media_url for fornecido, baixa a imagem e envia como anexo multipart.
    """
    normalized = normalize_brazilian_phone(phone)
    base = _chatwoot_base_url()
    headers = _chatwoot_headers()

    # Passo 1 — Contato
    contact_id = _chatwoot_resolve_contact(name, normalized)
    if not contact_id:
        return {"success": False, "message": f"Falha ao resolver contato para {phone}"}

    # Passo 2 — Conversa
    conv_id = _chatwoot_resolve_conversation(contact_id, normalized)
    if not conv_id:
        return {"success": False, "message": f"Falha ao resolver conversa para contactId={contact_id}"}

    # Passo 3 — Mensagem (com ou sem imagem)
    url = f"{base}/conversations/{conv_id}/messages"
    try:
        if media_url:
            # Baixa a imagem e envia via multipart/form-data
            try:
                img_resp = requests.get(media_url, timeout=15)
                img_resp.raise_for_status()
            except Exception as dl_err:
                logger.warning(f"⚠️ Não foi possível baixar imagem da campanha ({media_url}): {dl_err}. Enviando só texto.")
                media_url = None

        if media_url and img_resp.ok:
            content_type = img_resp.headers.get("Content-Type", "image/jpeg")
            ext = content_type.split("/")[-1].split(";")[0] or "jpg"
            filename = f"campanha.{ext}"
            # Cabeçalhos sem Content-Type (multipart define automaticamente)
            multipart_headers = {k: v for k, v in headers.items() if k.lower() != "content-type"}
            resp = requests.post(
                url,
                headers=multipart_headers,
                data={"content": message, "message_type": "outgoing", "private": "false"},
                files={"attachments[]": (filename, img_resp.content, content_type)},
                timeout=20,
            )
        else:
            resp = requests.post(
                url,
                headers=headers,
                json={"content": message, "message_type": "outgoing", "private": False},
                timeout=15,
            )

        if resp.status_code in (200, 201):
            return {"success": True, "data": resp.json()}
        return {"success": False, "message": f"HTTP {resp.status_code}: {resp.text}"}
    except Exception as e:
        return {"success": False, "message": str(e)}

def send_chatwoot_attachment(phone: str, name: str, file_path: str, caption: str = "") -> dict:
    """
    Envia anexo via Chatwoot.
    """
    normalized = normalize_brazilian_phone(phone)
    base = _chatwoot_base_url()
    headers = _chatwoot_headers()

    # Passo 1 & 2
    contact_id = _chatwoot_resolve_contact(name, normalized)
    if not contact_id: return {"success": False, "message": "Contact resolution failed"}
    
    conv_id = _chatwoot_resolve_conversation(contact_id, normalized)
    if not conv_id: return {"success": False, "message": "Conversation resolution failed"}

    # Passo 3 — Upload
    try:
        with open(file_path, 'rb') as f:
            files = {
                'attachments[]': (os.path.basename(file_path), f, 'application/octet-stream')
            }
            data = {
                'content': caption,
                'message_type': 'outgoing',
                'private': 'false'
            }
            # Remove content-type from headers to let requests set boundary
            upload_headers = headers.copy()
            resp = requests.post(
                f"{base}/conversations/{conv_id}/messages",
                headers=upload_headers,
                data=data,
                files=files,
                timeout=30
            )
            
            if resp.status_code in (200, 201):
                return {"success": True, "data": resp.json()}
            return {"success": False, "message": f"HTTP {resp.status_code}: {resp.text}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def safe_execute(query_builder, max_retries=5, initial_delay=2):
    """
    Executa uma query do Supabase com tratamento de erros de Gateway (502, 503, 504)
    e reconexão automática com backoff exponencial.
    """
    retries = 0
    delay = initial_delay
    
    while retries < max_retries:
        try:
            return query_builder.execute()
        except APIError as e:
            # Erros de Gateway comuns no Supabase quando a instância está 'acordando' ou instável
            status_code = getattr(e, 'code', None)
            error_msg = str(e).lower()
            
            is_gateway_error = (status_code in [502, 503, 504]) or \
                              ("gateway error" in error_msg) or \
                              ("network connection lost" in error_msg) or \
                              ("json could not be generated" in error_msg)

            if is_gateway_error:
                retries += 1
                if retries >= max_retries:
                    logger.error(f"❌ Falha crítica após {max_retries} tentativas: {e}")
                    raise e
                
                logger.warning(f"⚠️ Supabase instável ({status_code or 'Gateway Error'}). "
                               f"Tentativa {retries}/{max_retries} em {delay}s...")
                time.sleep(delay)
                delay *= 2
            else:
                # Se for outro erro de API (ex: erro de sintaxe, coluna não existe), não adianta tentar de novo
                raise e
        except Exception as e:
            error_msg = str(e).lower()
            if "connection lost" in error_msg or "network" in error_msg:
                retries += 1
                if retries >= max_retries:
                    raise e
                logger.warning(f"⚠️ Perda de conexão. Tentando reconectar ({retries}/{max_retries}) em {delay}s...")
                time.sleep(delay)
                delay *= 2
            else:
                raise e

def formatar_data_br(data_iso: str) -> str:
    from datetime import datetime
    try:
        if not data_iso: return ""
        dt = datetime.strptime(str(data_iso).split('T')[0], '%Y-%m-%d')
        return dt.strftime('%d/%m/%Y')
    except Exception:
        return str(data_iso)

def filtrar_admin(nome: str, role: str = None) -> bool:
    """
    Retorna True se o item deve ser EXCLUÍDO do relatório.
    Filtra lojas/usuários/contatos com 'admin' ou 'sistema' no nome ou role STRATEGIC.
    
    Args:
        nome: Nome da loja, usuário ou contato
        role: Role do usuário (opcional)
    
    Returns:
        True se deve ser excluído, False caso contrário
    """
    if not nome:
        return False
    
    nome_lower = str(nome).lower()
    
    # Verifica se contém "admin" ou "sistema" no nome (case-insensitive)
    if 'admin' in nome_lower or 'sistema' in nome_lower:
        return True
    
    # Verifica se é role STRATEGIC (administrador)
    if role and role.upper() == 'STRATEGIC':
        return True
    
    return False
