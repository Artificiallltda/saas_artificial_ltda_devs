from flask import Blueprint, request, jsonify
from extensions import jwt_required, db
from models.chat import Chat, ChatMessage, ChatAttachment, SenderType
from models.generated_content import GeneratedImageContent
from models.user import User  # <--- corrigido, import do modelo User
from flask_jwt_extended import get_jwt_identity
import os, uuid, base64, requests, time
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path
from google import genai
from google.genai import types
from openai import OpenAI
from io import BytesIO
from PIL import Image

load_dotenv()
OPENAI_API_KEY = os.getenv("API_KEY")

def _mask_key(k: str) -> str:
    if not k:
        return "EMPTY(len=0)"
    return f"{k[:8]}...(len={len(k)})"

def _get_env_keys():
    return {
        "OPENAI_API_KEY": (os.getenv("API_KEY") or "").strip(),
        "OPENROUTER_API_KEY": (os.getenv("OPENROUTER_API_KEY") or "").strip(),
        "GEMINI_API_KEY": (os.getenv("GEMINI_API_KEY") or "").strip(),
        "ANTHROPIC_API_KEY": (os.getenv("ANTHROPIC_API_KEY") or "").strip(),
        "PERPLEXITY_API_KEY": (os.getenv("PERPLEXITY_API_KEY") or "").strip(),
    }

BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # pasta src
UPLOAD_DIR = os.path.join(BASE_DIR, "..", "static", "uploads")
UPLOAD_DIR = os.path.abspath(UPLOAD_DIR)
os.makedirs(UPLOAD_DIR, exist_ok=True)
ai_generation_api = Blueprint("ai_generation_api", __name__)

GEMINI_MODELS = ("gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3-pro-preview")
OPENROUTER_PREFIXES = ("deepseek/", "google/", "tngtech/", "qwen/", "z-ai/")
OPENROUTER_SUFFIX = ":free"

def resolve_gemini_model(req_model: str) -> str:
    # mapeia temporariamente modelos sem quota para um que funciona
    fallback = {
        "gemini-2.5-pro": "gemini-2.5-flash",
        "gemini-3-pro-preview": "gemini-2.5-flash",
    }
    return fallback.get(req_model, req_model)

def is_gemini_model(model: str) -> bool:
    return model in GEMINI_MODELS

def is_openrouter_model(model: str) -> bool:
    return bool(model) and ("/" in model or model.endswith(OPENROUTER_SUFFIX) or model.startswith(OPENROUTER_PREFIXES))

def uses_completion_tokens_for_openai(model: str) -> bool:
    return model.startswith("o") or model.startswith("gpt-5")

def is_anthropic_model(model: str) -> bool:
    return bool(model) and model.startswith("claude-")

def is_perplexity_model(model: str) -> bool:
    return bool(model) and model.startswith("sonar")

def resolve_perplexity_try_models(model: str) -> list[str]:
    chain = [model]
    if model == "sonar-reasoning-pro":
        chain += ["sonar-reasoning", "sonar"]
    elif model == "sonar-reasoning":
        chain += ["sonar"]
    elif model == "sonar-deep-research":
        # deep-research pode exigir superfície/endpoint diferentes; fallback para sonar
        chain += ["sonar-reasoning", "sonar"]
    return chain

def is_model_allowed_for_basic_plan(model: str) -> bool:
    # Básico: gpt-4o, deepseek/deepseek-r1-0528:free, sonar, sonar-reasoning, claude-haiku-4-5 (inclui snapshots)
    if not model:
        return False
    m = model.strip().lower()
    if m == "gpt-4o":
        return True
    if m == "deepseek/deepseek-r1-0528:free":
        return True
    if m in ("sonar", "sonar-reasoning", "sonar-deep-research"):
        return True
    if m.startswith("claude-haiku-4-5"):
        return True
    if m == "gemini-2.5-flash-lite":
        return True
    return False

def supports_vision(model: str) -> bool:
    res = model.startswith("gpt-4o") or model.startswith("o") or model.startswith("gpt-5") or is_gemini_model(model)
    print(f"[DEBUG] supports_vision({model}) -> {res}")
    return res

def supports_generate_image(model: str) -> bool:
    res = model.startswith("gpt-4") or model.startswith("gpt-5")
    print(f"[DEBUG] supports_image({model}) -> {res}")
    return res

def to_data_url(path: str, mimetype: str) -> str:
    with open(path, "rb") as f:
        return f"data:{mimetype};base64,{base64.b64encode(f.read()).decode('utf-8')}"
    
def generate_system_message(model: str):
    print(f"[DEBUG] generate_system_message chamado com model={model}")
    if supports_generate_image(model):
        print(f"[DEBUG] caiu no if")
        return {
            "role": "system",
            "content": (
                "Você é uma IA de chat da plataforma Artificiall.\n"
                "📌 Funções disponíveis:\n"
                "- Geração de texto: todos os modelos.\n"
                "- Geração de imagens: apenas modelos GPT.\n"
                "⚠️ Importante:\n"
                f"- O Modelo atual PERMITE GERAR: {model}\n"
                "- Você pode gerar imagens quando o usuário pedir.\n"
                "- Não gere imagens automaticamente se o usuário não pediu.\n"
                "- Sempre use o modelo atual para decidir o que é possível."
            )
        }
    else:
        print(f"[DEBUG] caiu no else")
        return {
            "role": "system",
            "content": (
                "Você é uma IA de chat da plataforma Artificiall.\n"
                "📌 Funções disponíveis:\n"
                "- Geração de texto: todos os modelos.\n"
                "- Geração de imagens: **não disponível** neste modelo.\n"
                "- Se o usuário pedir para gerar imagens, responda educadamente que o modelo atual selecionado não suporta."
            )
        }

def build_messages_for_openai(session_messages, model: str):
    messages = []

    if model != "o1-mini":
        system_msg = generate_system_message(model)
        messages.append(system_msg)
        print("[DEBUG] Mensagens após system:", messages)
    else:
        print("[DEBUG] Modelo o1-mini detectado, pulando system message")

    vision_ok = supports_vision(model)

    for m in session_messages:
        role = m.get("role") if isinstance(m, dict) else getattr(m, "role", "user")
        text = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
        attachments = []

        if hasattr(m, "attachments") and m.attachments is not None:
            attachments = [a.to_dict() for a in m.attachments]
        elif isinstance(m, dict):
            attachments = m.get("attachments", [])

        if not attachments:
            msg = {"role": role, "content": text}
            messages.append(msg)
            print(f"[DEBUG] Mensagem sem anexos adicionada: {msg}")
            continue

        if vision_ok:
            parts = [{"type": "text", "text": text}] if text.strip() else []
            non_images = []

            for att in attachments:
                mimetype = att["mimetype"] if isinstance(att, dict) else att.mimetype
                path = att["path"] if isinstance(att, dict) else att.path
                name = att.get("name") if isinstance(att, dict) else att.name

                if mimetype.startswith("image/") and os.path.exists(path):
                    if role == "assistant":
                        print(f"[DEBUG] Pulando carregamento de imagem do assistant: {name}")
                    else:
                        img_part = {"type": "image_url", "image_url": {"url": to_data_url(path, mimetype)}}
                        parts.append(img_part)
                        print(f"[DEBUG] Imagem anexada adicionada: {img_part}")
                elif mimetype == "application/pdf" and os.path.exists(path):
                    with open(path, "rb") as f:
                        file_b64 = base64.b64encode(f.read()).decode("utf-8")
                    pdf_part = {
                        "type": "file",
                        "file": {"filename": name, "file_data": f"data:{mimetype};base64,{file_b64}"}
                    }
                    parts.append(pdf_part)
                    print(f"[DEBUG] PDF anexado adicionado: {pdf_part}")
                else:
                    non_images.append(name)

            if non_images:
                ni_part = {"type": "text", "text": f"Arquivos anexados (não-imagem): {', '.join(non_images)}"}
                parts.append(ni_part)
                print(f"[DEBUG] Anexos não-imagem adicionados: {ni_part}")

            msg = {"role": role, "content": parts}
            messages.append(msg)
            print(f"[DEBUG] Mensagem com suporte a visão adicionada: {msg}")

        else:
            names = ", ".join([a["name"] if isinstance(a, dict) else a.name for a in attachments])
            merge_text = (text + "\n\n" if text else "") + (f"[Anexos]: {names}" if names else text)
            msg = {"role": role, "content": merge_text}
            messages.append(msg)
            print(f"[DEBUG] Mensagem sem visão adicionada: {msg}")

    print("[DEBUG] Lista final de mensagens construída:", messages)
    return messages

def build_messages_for_openrouter(session_messages, model: str):
    return build_messages_for_openai(session_messages, model)

def build_messages_for_anthropic(session_messages):
    msgs = []
    for m in session_messages:
        role = m.get("role") if isinstance(m, dict) else getattr(m, "role", "user")
        text = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
        if not text:
            continue
        msgs.append({
            "role": role,  # "user" | "assistant"
            "content": [{"type": "text", "text": text}]
        })
    return msgs

def extract_text_from_anthropic(resp_json):
    blocks = resp_json.get("content", []) or []
    texts = []
    for b in blocks:
        if b.get("type") == "text":
            texts.append(b.get("text", ""))
    return "\n".join([t for t in texts if t])

def make_request_with_retry(url, headers, body, max_retries=5, backoff=3):
    for attempt in range(max_retries):
        response = requests.post(url, headers=headers, json=body, timeout=120)
        if response.status_code == 429:
            if attempt < max_retries - 1:
                print(f"nova tentativa OpenAI/OpenRouter {attempt+1}/{max_retries}")
                time.sleep(backoff * (attempt + 1))
                continue
        return response
    return response

def send_with_retry_gemini(chat, message, retries=5, delay=2):
    for attempt in range(retries):
        try:
            print(f"Tentativa {attempt+1} enviando para Gemini...")
            return chat.send_message(message)
        except Exception as e:
            if "503" in str(e) or "UNAVAILABLE" in str(e):
                print(f"Servidor Gemini ocupado, retry em {delay}s ({attempt+1}/{retries})")
                time.sleep(delay)
            elif "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f"Quota Gemini excedida, retry em {delay}s ({attempt+1}/{retries})")
                time.sleep(delay)
            else:
                raise
    raise Exception("Falha após várias tentativas Gemini")

@ai_generation_api.route("/generate-text", methods=["POST"])
@jwt_required()
def generate_text():
    try:
        # lê chaves atualizadas do ambiente a cada requisição
        env_keys = _get_env_keys()
        OPENAI_API_KEY = env_keys["OPENAI_API_KEY"]
        OPENROUTER_API_KEY = env_keys["OPENROUTER_API_KEY"]
        GEMINI_API_KEY = env_keys["GEMINI_API_KEY"]
        ANTHROPIC_API_KEY = env_keys["ANTHROPIC_API_KEY"]
        PERPLEXITY_API_KEY = env_keys["PERPLEXITY_API_KEY"]
        print(f"[CFG] Anthropic key: {_mask_key(ANTHROPIC_API_KEY)}")

        response = None  # evita NameError em fluxos sem resposta HTTP
        ct = request.content_type or ""
        files_to_save = []
        uploaded_images = []

        print("\n=== NOVA REQUISIÇÃO ===")
        
        if ct.startswith("multipart/form-data"):
            user_input = request.form.get("input", "")
            model = request.form.get("model", "gpt-4o")
            try:
                temperature = float(request.form.get("temperature", 0.7))
            except Exception:
                temperature = 0.7
            chat_id = request.form.get("chat_id")
            files = request.files.getlist("files") or []

            for f in files:
                try:
                    safe_name = f.filename or f"file_{uuid.uuid4().hex}"
                    final_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}_{safe_name}")
                    f.save(final_path)
                    file_size = os.path.getsize(final_path)
                    files_to_save.append({
                        "name": safe_name,
                        "path": final_path,
                        "mimetype": f.mimetype or "application/octet-stream",
                        "size_bytes": file_size
                    })
                except Exception as fe:
                    print(f"[WARN] Falha ao salvar arquivo {f.filename}: {fe}")

            print(f"[INFO] Arquivos processados: {[f['name'] for f in files_to_save]}")
        else:
            data = request.get_json(silent=True) or {}
            user_input = data.get("input", "")
            model = data.get("model", "gpt-4o")
            try:
                temperature = float(data.get("temperature", 0.7))
            except Exception:
                temperature = 0.7
            chat_id = data.get("chat_id")

        print(f"[INFO] Usuário: {get_jwt_identity()}, Chat ID: {chat_id}, Modelo: {model}, Input: {user_input[:50]}")

        if not user_input and not files_to_save:
            print("[ERROR] Nenhuma mensagem ou arquivo enviado")
            return jsonify({"error": "É necessário enviar uma mensagem ou anexos."}), 400

        user_id = get_jwt_identity()

        # Restrição por plano: Básico só pode usar modelos permitidos
        try:
            user = User.query.get(user_id)
            plan_name = (user.plan.name if user and user.plan else "").strip().lower()
        except Exception as _e:
            plan_name = ""
        if plan_name in ("básico", "basico"):
            if not is_model_allowed_for_basic_plan(model):
                return jsonify({
                    "error": "Modelo não disponível no plano Básico",
                    "allowed_models": [
                        "gpt-4o",
                        "deepseek/deepseek-r1-0528:free",
                        "sonar",
                        "sonar-reasoning",
                        "sonar-deep-research",
                        "claude-haiku-4-5",
                        "gemini-2.5-flash-lite"
                    ]
                }), 403

        # Buscar chat existente ou criar novo
        chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first() if chat_id else None
        if chat is None:
            chat_title = "Novo Chat"
            if user_input:
                try:
                    title_res = requests.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                        json={
                            "model": "gpt-3.5-turbo",
                            "messages": [{"role": "user", "content": f"Crie um título curto (menos de 5 palavras) sem aspas para: {user_input[:1000]}"}],
                            "max_tokens": 12,
                            "temperature": 0.5
                        },
                        timeout=10
                    )
                    if title_res.status_code == 200:
                        chat_title = title_res.json().get("choices", [{}])[0].get("message", {}).get("content", "Novo Chat").strip() or "Novo Chat"
                except Exception as e:
                    print(f"[WARN] Falha ao gerar título do chat: {e}")
                    chat_title = "Novo Chat"

            chat = Chat(user_id=user_id, title=chat_title, supports_vision=supports_vision(model))
            db.session.add(chat)
            db.session.commit()

        user_msg = ChatMessage(
            chat_id=chat.id,
            role=SenderType.USER.value,
            content=user_input,
            created_at=datetime.utcnow()
        )
        db.session.add(user_msg)
        db.session.commit()
        print(f"[MSG USER] Chat {chat.id} - Mensagem enviada: {user_input[:50]} (ID {user_msg.id})")

        uploaded_files = []
        for f in files_to_save:
            try:
                attachment_obj = ChatAttachment(
                    message_id=user_msg.id,
                    name=f["name"],
                    path=f["path"],
                    mimetype=f.get("mimetype", "application/octet-stream"),
                    size_bytes=f.get("size_bytes"),
                    created_at=datetime.utcnow()
                )
                db.session.add(attachment_obj)
                db.session.commit()
                uploaded_files.append({
                    "id": attachment_obj.id,
                    "name": attachment_obj.name,
                    "mimetype": attachment_obj.mimetype,
                    "size_bytes": attachment_obj.size_bytes,
                    "url": f"/api/chats/attachments/{attachment_obj.id}"
                })
                print(f"[ATTACHMENT] Chat {chat.id} - {attachment_obj.name} salvo (ID {attachment_obj.id})")
            except Exception as ae:
                print(f"[WARN] Falha ao salvar attachment {f['name']}: {ae}")

        history = ChatMessage.query.filter_by(chat_id=chat.id).order_by(ChatMessage.created_at).all()
        session_messages = [{"role": m.role, "content": m.content, "attachments": getattr(m, "attachments", [])} for m in history]
        print(f"[INFO] Iniciando envio para IA (modelo {model})")

        # Modelo efetivamente usado (pode mudar por fallback quando Gemini sem quota)
        used_model = model

        generated_text = ""
        # Acumuladores de uso de tokens (preenchidos quando o provedor devolver)
        usage_prompt = None
        usage_completion = None
        usage_total = None
        max_tokens_used = None
        try:
            if is_gemini_model(model):
                gemini_client = genai.Client(api_key=GEMINI_API_KEY)
                gemini_chat = None
                parts = []
                uploaded_images = []

                try:
                    print(f"[INFO] Inicializando chat Gemini para chat_id {chat.id}")

                    gm = resolve_gemini_model(model)
                    gemini_chat = gemini_client.chats.create(model=gm)
                    used_model = gm

                    # histórico
                    history = ChatMessage.query.filter_by(chat_id=chat.id).order_by(ChatMessage.created_at).all()
                    print(f"[INFO] Histórico carregado: {len(history)} mensagens")

                    for m in history:
                        if m.content:
                            parts.append(m.content)
                        for att in getattr(m, "attachments", []):
                            path = getattr(att, "path", None)
                            mimetype = getattr(att, "mimetype", "")
                            name = getattr(att, "name", "arquivo")
                            if not path or not os.path.exists(path):
                                continue
                            if mimetype.startswith("image/"):
                                uploaded_file = gemini_client.files.upload(file=path)
                                parts.append(uploaded_file)
                            elif mimetype == "application/pdf":
                                with open(path, "rb") as f:
                                    pdf_bytes = f.read()
                                parts.append(types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"))
                            else:
                                parts.append(f"[Anexo não suportado: {name}]")

                    if user_input:
                        parts.append(user_input)

                    # intenção de imagem
                    def should_generate_image(prompt: str) -> bool:
                        try:
                            analysis_prompt = (
                                "Você é um verificador de intenção. "
                                "Analise o texto e diga se ele pede geração de uma imagem. "
                                "Perguntas como 'pode gerar imagem?' não contam. "
                                "Responda apenas SIM ou NÃO.\n\n"
                                f"{prompt}"
                            )
                            resp = gemini_client.models.generate_content(
                                model=(model if is_gemini_model(model) else "gemini-2.5-flash"),
                                contents=analysis_prompt
                            )
                            answer = resp.text.strip().upper()
                            return answer == "SIM"
                        except Exception:
                            prompt_lower = prompt.lower()
                            keys = ["imagem", "desenhe", "faça um desenho", "gere uma imagem", "foto de", "pinte"]
                            return any(k in prompt_lower for k in keys)

                    user_asked_image = should_generate_image(user_input)

                    # envio com retry
                    response = send_with_retry_gemini(gemini_chat, parts)

                    generated_text_local = None
                    generated_images_paths = []

                    for cand in getattr(response, "candidates", []):
                        for part in getattr(cand.content, "parts", []):
                            if getattr(part, "text", None):
                                generated_text_local = part.text
                            elif getattr(part, "inline_data", None):
                                data = part.inline_data.data
                                mime = part.inline_data.mime_type or "image/png"
                                try:
                                    img_bytes = base64.b64decode(data)
                                except Exception:
                                    img_bytes = data
                                img = Image.open(BytesIO(img_bytes))
                                filename = f"gemini_{uuid.uuid4().hex}.png"
                                save_path = os.path.join(UPLOAD_DIR, filename)
                                img.save(save_path)
                                generated_images_paths.append(save_path)

                    if user_asked_image and not generated_images_paths:
                        try:
                            print("[INFO] Gerando imagem via API do Gemini...")
                            img_response = gemini_client.models.generate_images(
                                model="imagen-4.0-fast-generate-001",
                                prompt=user_input,
                                config=types.GenerateImagesConfig(
                                    number_of_images=1,
                                    aspect_ratio="1:1"
                                )
                            )
                            if img_response.generated_images:
                                img = img_response.generated_images[0].image
                                filename = f"gemini_{uuid.uuid4().hex}.png"
                                save_path = os.path.join(UPLOAD_DIR, filename)
                                img.save(save_path)
                                generated_images_paths.append(save_path)
                                print(f"[INFO] Imagem salva em {save_path}")
                        except Exception as e:
                            print(f"[ERROR] Falha ao gerar imagem via API: {e}")

                    for idx, p in enumerate(generated_images_paths):
                        uploaded_images.append({
                            "name": f"gemini_image_{idx}.png",
                            "path": p,
                            "url": f"/api/uploads/{os.path.basename(p)}"
                        })

                    generated_text = "" if uploaded_images else (generated_text_local or "[Sem retorno]")

                except Exception as e:
                    print(f"[ERROR] Gemini erro geral: {e}")
                    generated_text = "[Erro ao gerar resposta da IA]"
                    uploaded_images = []

            elif is_openrouter_model(model):
                endpoint = "https://openrouter.ai/api/v1/chat/completions"
                headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
                body = {
                    "model": model,
                    "messages": build_messages_for_openrouter(session_messages, model),
                    "temperature": temperature
                }
                try:
                    response = make_request_with_retry(endpoint, headers, body, max_retries=5, backoff=3)
                    try:
                        j = response.json()
                        generated_text = j["choices"][0]["message"]["content"]
                        u = j.get("usage") or {}
                        usage_prompt = u.get("prompt_tokens")
                        usage_completion = u.get("completion_tokens")
                        usage_total = u.get("total_tokens")
                        max_tokens_used = body.get("max_tokens")
                    except Exception:
                        print(f"[WARN] Resposta OpenRouter não é JSON:\n{response.text[:1000]}")
                        generated_text = "[Erro ao gerar resposta da IA]"
                except Exception as oe:
                    print(f"[ERROR] Falha na chamada OpenRouter: {oe}")
                    generated_text = "[Erro ao gerar resposta da IA]"

            elif is_anthropic_model(model):
                def call_anthropic(model_id: str):
                    endpoint = "https://api.anthropic.com/v1/messages"
                    headers = {
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    }
                    system_msg = generate_system_message(model_id)["content"]
                    body = {
                        "model": model_id,
                        "max_tokens": 1024,
                        "temperature": temperature,
                        "system": system_msg,
                        "messages": build_messages_for_anthropic(session_messages),
                    }
                    return make_request_with_retry(endpoint, headers, body, max_retries=5, backoff=3)

                try_models = [model]
                if model == "claude-opus-4-5":
                    try_models += ["claude-sonnet-4-5", "claude-haiku-4-5"]

                generated_text = ""
                for mid in try_models:
                    try:
                        response = call_anthropic(mid)
                    except Exception as ae:
                        print(f"[ERROR] Falha na chamada Anthropic ({mid}): {ae}")
                        if mid == try_models[-1]:
                            generated_text = "[Erro ao gerar resposta da IA]"
                        continue

                    status = getattr(response, "status_code", 0)
                    data = None
                    try:
                        data = response.json()
                    except Exception:
                        data = None

                    if status == 200 and data:
                        txt = extract_text_from_anthropic(data) or ""
                        if not txt:
                            content = data.get("content", [])
                            if isinstance(content, list) and content and isinstance(content[0], dict):
                                txt = content[0].get("text") or ""
                        if txt:
                            used_model = mid
                            generated_text = txt
                            # usage (Anthropic usa input/output tokens)
                            u = (data or {}).get("usage") or {}
                            _in = u.get("input_tokens")
                            _out = u.get("output_tokens")
                            if _in is not None or _out is not None:
                                usage_prompt = _in
                                usage_completion = _out
                                usage_total = (_in or 0) + (_out or 0)
                            break
                        else:
                            print(f"[WARN] Anthropic sem texto (model={mid}) payload={str(data)[:500]}")
                            if mid == try_models[-1]:
                                generated_text = "[Sem retorno]"
                    else:
                        err_msg = None
                        if data and isinstance(data, dict):
                            err = data.get("error") or {}
                            err_msg = err.get("message") or str(err) or response.text[:500]
                        else:
                            err_msg = getattr(response, "text", "")[:500]
                        print(f"[ERROR] Anthropic {status} ({mid}): {err_msg}")
                        # Se não for o último, tenta próximo; no último, devolve erro amigável
                        if mid == try_models[-1]:
                            generated_text = f"[Erro Anthropic {status}: {err_msg}]"

            elif is_perplexity_model(model):
                try_models = resolve_perplexity_try_models(model)
                generated_text = ""
                for mid in try_models:
                    endpoint = "https://api.perplexity.ai/chat/completions"
                    headers = {
                        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
                        "Content-Type": "application/json"
                    }
                    body = {
                        "model": mid,  # "sonar" | "sonar-reasoning" | "sonar-reasoning-pro" | "sonar-deep-research"
                        "messages": build_messages_for_openai(session_messages, mid),
                        "temperature": temperature,
                        "return_citations": True
                    }
                    try:
                        response = make_request_with_retry(endpoint, headers, body, max_retries=5, backoff=3)
                        status = getattr(response, "status_code", 0)
                        if status == 200:
                            try:
                                j = response.json()
                                generated_text = j.get("choices", [{}])[0].get("message", {}).get("content", "[Sem retorno]")
                                u = j.get("usage") or {}
                                usage_prompt = u.get("prompt_tokens")
                                usage_completion = u.get("completion_tokens")
                                usage_total = u.get("total_tokens")
                            except Exception:
                                print(f"[WARN] Resposta Perplexity não é JSON:\n{response.text[:1000]}")
                                generated_text = "[Erro ao gerar resposta da IA]"
                            used_model = mid
                            break
                        else:
                            # detecção de erro e fallback para próximo modelo
                            err_text = ""
                            try:
                                err_json = response.json()
                                err_text = str(err_json)[:500]
                            except Exception:
                                err_text = (getattr(response, "text", "") or "")[:500]
                            print(f"[ERROR] Perplexity {status} ({mid}): {err_text}")
                            if mid == try_models[-1]:
                                generated_text = f"[Erro Perplexity {status}: {err_text}]"
                            else:
                                continue
                    except Exception as pe:
                        print(f"[ERROR] Falha na chamada Perplexity ({mid}): {pe}")
                        if mid == try_models[-1]:
                            generated_text = "[Erro ao gerar resposta da IA]"
                        else:
                            continue

            else:
                endpoint = "https://api.openai.com/v1/chat/completions"
                headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
                body = {"model": model, "messages": build_messages_for_openai(session_messages, model)}
                if not uses_completion_tokens_for_openai(model):
                    body["temperature"] = temperature
                try:
                    response = make_request_with_retry(endpoint, headers, body, max_retries=5, backoff=3)
                    try:
                        j = response.json()
                        generated_text = j["choices"][0]["message"]["content"]
                        u = j.get("usage") or {}
                        usage_prompt = u.get("prompt_tokens")
                        usage_completion = u.get("completion_tokens")
                        usage_total = u.get("total_tokens")
                        max_tokens_used = body.get("max_tokens")
                    except Exception:
                        print(f"[WARN] Resposta OpenAI não é JSON:\n{response.text[:1000]}")
                        generated_text = "[Erro ao gerar resposta da IA]"
                    if supports_generate_image(model):
                        try:
                            client = OpenAI(api_key=OPENAI_API_KEY)
                            img_response = client.responses.create(
                                model=model,
                                input=[{"role": "user", "content": user_input}],
                                tools=[{"type": "image_generation"}]
                            )
                            image_outputs = [
                                o.result for o in getattr(img_response, "output", [])
                                if getattr(o, "type", "") == "image_generation_call"
                            ]
                            for idx, img_base64 in enumerate(image_outputs):
                                image_path = os.path.join(UPLOAD_DIR, f"ai_image_{uuid.uuid4().hex}.png")
                                with open(image_path, "wb") as f:
                                    f.write(base64.b64decode(img_base64))
                                uploaded_images.append({
                                    "name": f"ai_image_{idx}.png",
                                    "path": image_path,
                                    "url": f"/api/uploads/{os.path.basename(image_path)}"
                                })
                                print(f"[INFO] IA gerou imagem {uploaded_images[-1]['name']} salva em {image_path}")
                        except Exception as e:
                            if "moderation_blocked" in str(e):
                                print("[WARN] Geração de imagem bloqueada pelo sistema de moderação da OpenAI")
                                generated_text += "\n⚠️ A imagem não pôde ser gerada porque os termos utilizados não passaram pelo sistema de segurança."
                            else:
                                print(f"[WARN] Falha ao gerar imagem pelo GPT: {e}")
                    print(f"[INFO] Texto gerado: {generated_text[:200]}")
                except Exception as oe:
                    print(f"[ERROR] Falha na chamada OpenAI: {oe}")
                    generated_text = "[Erro ao gerar resposta da IA]"
                    uploaded_images = []

        except Exception as e:
            print(f"[ERROR] Falha geral ao gerar texto IA: {e}")
            generated_text = "[Erro ao gerar resposta da IA]"

        # cria a mensagem da IA
        try:
            safe_text = generated_text if not uploaded_images else ""
            ai_msg = ChatMessage(
                chat_id=chat.id,
                role=SenderType.AI.value,
                content=safe_text,
                model_used=used_model,
                temperature=None if uses_completion_tokens_for_openai(model) else temperature,
                max_tokens=max_tokens_used,
                prompt_tokens=usage_prompt,
                completion_tokens=usage_completion,
                total_tokens=usage_total,
                created_at=datetime.utcnow()
            )
            db.session.add(ai_msg)
            db.session.commit()
            print(f"[MSG AI] Chat {chat.id} - Mensagem gerada: {generated_text[:50]} (ID {ai_msg.id})")

            # agora salva os anexos da IA (se houver)
            for img in uploaded_images:
                try:
                    attachment_obj = ChatAttachment(
                        message_id=ai_msg.id,
                        name=img["name"],
                        path=img["path"],
                        mimetype="image/png",
                        size_bytes=os.path.getsize(img["path"]),
                        created_at=datetime.utcnow()
                    )
                    db.session.add(attachment_obj)
                    db.session.commit()
                    img["id"] = attachment_obj.id
                    img["mimetype"] = attachment_obj.mimetype
                    img["size_bytes"] = attachment_obj.size_bytes
                    img["url"] = f"/api/chats/attachments/{attachment_obj.id}"
                    print(f"[ATTACHMENT AI] Imagem {attachment_obj.name} salva (ID {attachment_obj.id})")
                    try:
                        generated_content = GeneratedImageContent(
                            user_id=chat.user_id,
                            prompt=user_input,
                            model_used=used_model,
                            content_data=None,
                            file_path=img["path"],
                            style=None,
                            ratio=None
                        )
                        db.session.add(generated_content)
                        db.session.commit()
                    except Exception as ge:
                        db.session.rollback()
                        print(f"[WARN] Falha ao salvar em GeneratedContent: {ge}")
                except Exception as ae:
                    db.session.rollback()
                    print(f"[WARN] Falha ao salvar attachment de IA {img['name']}: {ae}")
        except Exception as ae:
            db.session.rollback()
            print(f"[ERROR] Falha ao salvar mensagem AI: {ae}")
        
        response_text = "" if uploaded_images else generated_text
        print(f"[Mensagem gerada] {generated_text}")
        if response is not None:
            print(f"[Response gerado] {response}")

        return jsonify({
            "chat_id": chat.id,
            "chat_title": chat.title,
            "messages": [m.to_dict() for m in history] + [ai_msg.to_dict()] if 'ai_msg' in locals() else [m.to_dict() for m in history],
            "generated_text": response_text,
            "model_used": used_model,
            "temperature": None if uses_completion_tokens_for_openai(model) else temperature,
            "uploaded_files": uploaded_files + uploaded_images
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"[EXCEPTION] {str(e)}")
        return jsonify({"error": str(e)}), 500
# Mapeia proporção para tamanho da imagem baseado no modelo
def map_size(model, ratio):
    size_map = {
        "1024x1024": "1024x1024",
        "1536x1024": "1536x1024",  # landscape padrão
        "1024x1536": "1024x1536",  # portrait padrão
    }
    if model in ["dall-e-2", "dall-e-3"]:
        size_map = {
            "1024x1024": "1024x1024",
            "1536x1024": "1792x1024",  # landscape -> arredonda pro mais próximo válido
            "1024x1536": "1024x1792",  # portrait -> arredonda pro mais próximo válido
        }
    return size_map.get(ratio, "1024x1024")

def map_aspectratio_gemini(ratio):
    ratio_map = {
        "1024x1024": "1:1",
        "1536x1024": "16:9",
        "1024x1536": "9:16",
    }
    return {
        "aspectRatio": ratio_map.get(ratio, "1:1"),
    }

@ai_generation_api.route("/generate-image", methods=["POST"])
@jwt_required()
def generate_image():
    # lê chaves atualizadas do ambiente
    env_keys = _get_env_keys()
    OPENAI_API_KEY = env_keys["OPENAI_API_KEY"]
    GEMINI_API_KEY = env_keys["GEMINI_API_KEY"]
    gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "Usuário inválido"}), 403

    # Verifica se é FormData (com imagem) ou JSON (sem imagem)
    content_type = request.content_type or ""
    reference_image_path = None
    
    if content_type.startswith("multipart/form-data"):
        # Recebe dados como FormData
        prompt = request.form.get("prompt", "").strip()
        model = request.form.get("model", "gpt-image-1")
        style = request.form.get("style", "auto")
        ratio = request.form.get("ratio", "1024:1024")
        quality = request.form.get("quality", "auto")
        
        # Processa imagem de referência se enviada
        reference_image_file = request.files.get("reference_image")
        if reference_image_file and reference_image_file.filename:
            # Validação do tipo de arquivo
            allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
            if reference_image_file.mimetype not in allowed_types:
                return jsonify({"error": "Apenas imagens (.png, .jpg, .jpeg, .webp) são permitidas como referência."}), 400
            
            # Salva imagem de referência
            ref_filename = f"ref_{uuid.uuid4().hex}_{reference_image_file.filename}"
            reference_image_path = os.path.join(UPLOAD_DIR, ref_filename)
            reference_image_file.save(reference_image_path)
            print(f"[INFO] Imagem de referência salva: {reference_image_path}")
    else:
        # Recebe dados como JSON (comportamento antigo)
        data = request.get_json() or {}
        prompt = data.get("prompt", "").strip()
        model = data.get("model", "gpt-image-1")
        style = data.get("style", "auto")
        ratio = data.get("ratio", "1024:1024")
        quality = data.get("quality", "auto")

    if not prompt:
        return jsonify({"error": "Prompt é obrigatório"}), 400
    
    # Constrói o prompt final com contexto da imagem de referência
    if reference_image_path:
        final_prompt = f"Use esta imagem de referência como base para estilo, composição e elementos: {prompt}"
        print(f"[INFO] Usando imagem de referência: {reference_image_path}")
    elif style != "auto":
        final_prompt = f"O estilo da imagem deve ser: {style}. {prompt}"
    else:
        final_prompt = prompt

    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        filename = f"{uuid.uuid4()}.png"
        save_path = os.path.join(UPLOAD_DIR, filename)
        if not model.startswith("imagen-"):
            size = map_size(model, ratio)
            client = OpenAI(api_key=OPENAI_API_KEY)
            kwargs = {
                "model": model,
                "prompt": final_prompt,
                "n": 1,
                "size": size
            }
            if quality and quality != "auto":
                kwargs["quality"] = quality

            # Se tiver imagem de referência, adiciona como input para modelos que suportam
            if reference_image_path and model.startswith("gpt-4"):
                try:
                    # Converte imagem para base64
                    with open(reference_image_path, "rb") as f:
                        image_data = base64.b64encode(f.read()).decode('utf-8')
                    
                    # Cria mensagem com imagem
                    messages = [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": final_prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/{reference_image_path.split('.')[-1]};base64,{image_data}"
                                    }
                                }
                            ]
                        }
                    ]
                    
                    # Usa chat completions com visão em vez de images.generate
                    response = client.chat.completions.create(
                        model=model,
                        messages=messages,
                        max_tokens=1000
                    )
                    
                    # Extrai descrição da imagem gerada pelo modelo
                    image_description = response.choices[0].message.content
                    
                    # Gera imagem baseada na descrição
                    kwargs["prompt"] = f"Based on the reference image, generate: {image_description}"
                    response = client.images.generate(**kwargs)
                    
                except Exception as e:
                    print(f"[WARN] Falha ao usar imagem de referência com {model}: {e}")
                    # Fallback para geração normal sem imagem
                    kwargs["prompt"] = final_prompt
                    response = client.images.generate(**kwargs)
            else:
                # Geração normal sem imagem de referência
                response = client.images.generate(**kwargs)

            if hasattr(response.data[0], "b64_json") and response.data[0].b64_json:
                image_data = base64.b64decode(response.data[0].b64_json)
            elif hasattr(response.data[0], "url") and response.data[0].url:
                img_res = requests.get(response.data[0].url)
                img_res.raise_for_status()
                image_data = img_res.content
            else:
                return jsonify({"error": "Resposta da API OpenAI não contém imagem válida"}), 500
            with open(save_path, "wb") as f:
                f.write(image_data)
            final_ratio = size
        else:
            config_map = map_aspectratio_gemini(ratio)
            if not gemini_client:
                return jsonify({"error": "GEMINI_API_KEY ausente"}), 500
            
            # Para Gemini Imagen, usa imagem de referência se disponível
            if reference_image_path:
                try:
                    # Faz upload da imagem de referência
                    ref_image_file = gemini_client.files.upload(file=reference_image_path)
                    print(f"[INFO] Imagem de referência enviada para Gemini: {ref_image_file.name}")
                    
                    # Gera imagem com referência
                    response = gemini_client.models.generate_images(
                        model=model,
                        prompt=final_prompt,
                        reference_image=ref_image_file,
                        config=types.GenerateImagesConfig(
                            number_of_images=1,
                            aspect_ratio=config_map["aspectRatio"],
                        )
                    )
                except Exception as e:
                    print(f"[WARN] Falha ao usar imagem de referência com Gemini: {e}")
                    # Fallback para geração normal
                    response = gemini_client.models.generate_images(
                        model=model,
                        prompt=final_prompt,
                        config=types.GenerateImagesConfig(
                            number_of_images=1,
                            aspect_ratio=config_map["aspectRatio"],
                        )
                    )
            else:
                # Geração normal sem imagem de referência
                response = gemini_client.models.generate_images(
                    model=model,
                    prompt=final_prompt,
                    config=types.GenerateImagesConfig(
                        number_of_images=1,
                        aspect_ratio=config_map["aspectRatio"],
                    )
                )
            generated_image = response.generated_images[0].image
            generated_image.save(save_path)
            final_ratio = config_map["aspectRatio"]
            
        # Salva no banco
        generated = GeneratedImageContent(
            user_id=user.id,
            prompt=prompt,
            model_used=model,
            file_path=save_path,
            style=style,
            ratio=final_ratio
        )
        db.session.add(generated)
        db.session.commit()

        return jsonify({
            "message": "Imagem gerada com sucesso",
            "content": generated.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        error_msg = str(e)
        if "content_policy_violation" in error_msg:
            return jsonify({
                "error": "Geração bloqueada pelo nosso sistema de segurança."
            }), 400

        return jsonify({"error": error_msg}), 500