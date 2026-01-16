from flask import Blueprint, request, jsonify
from extensions import jwt_required, db
from models.chat import Chat, ChatMessage, ChatAttachment, SenderType
from models.generated_content import GeneratedImageContent
from models.user import User  # <--- corrigido, import do modelo User
from flask_jwt_extended import get_jwt_identity
import os, uuid, base64, requests, time
from datetime import datetime
from dotenv import load_dotenv
from google import genai
from google.genai import types
from openai import OpenAI
from io import BytesIO
from PIL import Image

load_dotenv()
OPENAI_API_KEY = os.getenv("API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # pasta src
UPLOAD_DIR = os.path.join(BASE_DIR, "..", "static", "uploads")
UPLOAD_DIR = os.path.abspath(UPLOAD_DIR)
os.makedirs(UPLOAD_DIR, exist_ok=True)

client_gemini = genai.Client(api_key=GEMINI_API_KEY)
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
        try:
            if is_gemini_model(model):
                gemini_chat = None
                parts = []
                uploaded_images = []

                try:
                    print(f"[INFO] Inicializando chat Gemini para chat_id {chat.id}")
                    # gemini_chat = client_gemini.chats.create(model=model)

                    gm = resolve_gemini_model(model)
                    gemini_chat = client_gemini.chats.create(model=gm)
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
                                uploaded_file = client_gemini.files.upload(file=path)
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
                            resp = client_gemini.models.generate_content(
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
                            img_response = client_gemini.models.generate_images(
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
                        generated_text = response.json()["choices"][0]["message"]["content"]
                    except Exception:
                        print(f"[WARN] Resposta OpenRouter não é JSON:\n{response.text[:1000]}")
                        generated_text = "[Erro ao gerar resposta da IA]"
                except Exception as oe:
                    print(f"[ERROR] Falha na chamada OpenRouter: {oe}")
                    generated_text = "[Erro ao gerar resposta da IA]"

            else:
                endpoint = "https://api.openai.com/v1/chat/completions"
                headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
                body = {"model": model, "messages": build_messages_for_openai(session_messages, model)}
                if not uses_completion_tokens_for_openai(model):
                    body["temperature"] = temperature
                try:
                    response = make_request_with_retry(endpoint, headers, body, max_retries=5, backoff=3)
                    try:
                        generated_text = response.json()["choices"][0]["message"]["content"]
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
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "Usuário inválido"}), 403

    data = request.get_json() or {}
    prompt = data.get("prompt")
    model = data.get("model", "gpt-image-1")  # modelo enviado do frontend
    style = data.get("style", "auto")
    ratio = data.get("ratio", "1024:1024")  # ex: "1:1", "16:9", "9:16"
    quality = data.get("quality", "auto")

    if not prompt:
        return jsonify({"error": "Prompt é obrigatório"}), 400
    
    if style != "auto":
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
            response = client_gemini.models.generate_images(
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