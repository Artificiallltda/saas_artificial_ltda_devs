from flask import Blueprint, request, jsonify
from extensions import jwt_required, db
from models.chat import Chat, ChatMessage, ChatAttachment, SenderType
from models.generated_content import GeneratedImageContent
from models.user import User  # <--- corrigido, import do modelo User
from flask_jwt_extended import get_jwt_identity
import os, uuid, base64, requests, time, mimetypes
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

def describe_reference_image_gemini(client, image_path: str) -> str:
    if not client or not image_path or not os.path.exists(image_path):
        return ""
    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type:
        mime_type = "image/png"
    try:
        with open(image_path, "rb") as f:
            image_bytes = f.read()
        prompt = (
            "Descreva a imagem com foco em estilo, aparência, cores, iluminação, "
            "cenário e principais elementos visuais. Seja direto."
        )
        contents = [
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            prompt,
        ]
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
        )
        return (resp.text or "").strip()
    except Exception as e:
        print(f"[WARN] Falha ao descrever imagem de referência (Gemini): {e}")
        return ""
    
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
        ratio = request.form.get("ratio", "1024x1024")
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
        ratio = data.get("ratio", "1024x1024")
        quality = data.get("quality", "auto")

    # Permitir envio apenas com imagem (sem prompt)
    if not prompt and not reference_image_path:
        return jsonify({"error": "Prompt ou imagem de referência é obrigatório"}), 400
    
    # Constrói o prompt final com contexto da imagem de referência
    if reference_image_path and not prompt:
        final_prompt = "Use esta imagem de referência como base para estilo, composição e elementos."
        print(f"[INFO] Usando imagem de referência (sem prompt): {reference_image_path}")
    elif reference_image_path and prompt:
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

        # OpenAI (gpt-image-1, dall-e, etc)
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

            # Sempre que houver imagem de referência, analisamos com um modelo de visão
            if reference_image_path:
                try:
                    with open(reference_image_path, "rb") as f:
                        image_b64 = base64.b64encode(f.read()).decode("utf-8")

                    # Modelo de visão para extrair características; usa o próprio modelo se for gpt-4*, senão gpt-4o-mini
                    vision_model = model if model.startswith("gpt-4") else "gpt-4o-mini"

                    messages = [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": final_prompt or "Analise a imagem e descreva estilo, paleta e composição."},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/{reference_image_path.split('.')[-1]};base64,{image_b64}"
                                    }
                                }
                            ]
                        }
                    ]

                    vision_resp = client.chat.completions.create(
                        model=vision_model,
                        messages=messages,
                        max_tokens=800
                    )
                    image_description = (vision_resp.choices[0].message.content or "").strip()

                    # Usa a descrição como prompt reforçado para o gerador de imagem
                    kwargs["prompt"] = (
                        f"Leve em conta a imagem de referência. {image_description}\n\n"
                        f"Pedido do usuário: {final_prompt}".strip()
                    )
                    response = client.images.generate(**kwargs)
                except Exception as e:
                    print(f"[WARN] Falha ao usar imagem de referência: {e}")
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

        # Gemini Imagen
        else:
            config_map = map_aspectratio_gemini(ratio)
            if not gemini_client:
                return jsonify({"error": "GEMINI_API_KEY ausente"}), 500
            
            gemini_prompt = final_prompt
            if reference_image_path:
                image_desc = describe_reference_image_gemini(gemini_client, reference_image_path)
                if image_desc:
                    gemini_prompt = (
                        "Use a descrição da imagem de referência para guiar estilo, "
                        "composição e elementos visuais.\n\n"
                        f"Descrição da imagem: {image_desc}\n\n"
                        f"Pedido do usuário: {final_prompt}".strip()
                    )
                else:
                    gemini_prompt = (
                        "Use a imagem de referência como base para estilo, composição "
                        f"e elementos visuais. Pedido do usuário: {final_prompt}".strip()
                    )

            response = gemini_client.models.generate_images(
                model=model,
                prompt=gemini_prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio=config_map["aspectRatio"],
                )
            )
            generated_images = getattr(response, "generated_images", None)
            if not generated_images:
                return jsonify({"error": "Resposta do Gemini Imagen não contém imagens geradas"}), 500
            generated_image = generated_images[0].image
            if not generated_image:
                return jsonify({"error": "Resposta do Gemini Imagen não contém imagem válida"}), 500
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
            return jsonify({"error": "Geração bloqueada pelo nosso sistema de segurança."}), 400
        return jsonify({"error": error_msg}), 500

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