import os
import uuid
import time
import base64
from io import BytesIO
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.generated_content import GeneratedVideoContent
from models.user import User
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client_gemini = None
if GEMINI_API_KEY:
    try:
        client_gemini = genai.Client(api_key=GEMINI_API_KEY)
    except Exception:
        pass

ai_generation_video_api = Blueprint("ai_generation_video_api", __name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "..", "static", "uploads")
VIDEO_UPLOAD_DIR = os.path.join(UPLOAD_DIR, "videos")
os.makedirs(VIDEO_UPLOAD_DIR, exist_ok=True)

@ai_generation_video_api.route("/generate-video", methods=["POST"])
@jwt_required()
def generate_video():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "Usuário inválido"}), 404

    # Verifica se é FormData (com imagem) ou JSON (sem imagem)
    content_type = request.content_type or ""
    reference_image_path = None
    
    if content_type.startswith("multipart/form-data"):
        # Recebe dados como FormData
        prompt = request.form.get("prompt", "").strip()
        model_used = request.form.get("model_used", "veo-3.0-fast-generate-001")
        aspect_ratio = request.form.get("ratio", "16:9")
        
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
            print(f"[INFO] Imagem de referência salva para vídeo: {reference_image_path}")
    else:
        # Recebe dados como JSON (comportamento antigo)
        data = request.get_json() or {}
        prompt = data.get("prompt", "").strip()
        model_used = data.get("model_used", "veo-3.0-fast-generate-001")
        aspect_ratio = data.get("ratio", "16:9")

    if not prompt:
        return jsonify({"error": "Campo 'prompt' é obrigatório"}), 400

    if not client_gemini:
        return jsonify({"error": "GEMINI_API_KEY não configurada"}), 500

    try:
        filename = f"{uuid.uuid4()}.mp4"
        save_path = os.path.join(VIDEO_UPLOAD_DIR, filename)
        
        # Constrói o prompt final com contexto da imagem de referência
        if reference_image_path:
            final_prompt = f"Use esta imagem de referência como base para estilo, composição e elementos do vídeo: {prompt}"
            print(f"[DEBUG] Gerando vídeo com imagem de referência: {reference_image_path}")
        else:
            final_prompt = prompt
            
        print(f"[DEBUG] Gerando vídeo com modelo {model_used}, ratio {aspect_ratio}...")

        # Se tiver imagem de referência, faz upload e usa na geração
        if reference_image_path:
            try:
                # Faz upload da imagem de referência
                ref_image_file = client_gemini.files.upload(file=reference_image_path)
                print(f"[INFO] Imagem de referência enviada para Gemini: {ref_image_file.name}")
                
                # Cria operação assíncrona com imagem de referência
                operation = client_gemini.models.generate_videos(
                    model=model_used,
                    prompt=final_prompt,
                    reference_image=ref_image_file,
                    config=types.GenerateVideosConfig(aspect_ratio=aspect_ratio)
                )
            except Exception as e:
                print(f"[WARN] Falha ao usar imagem de referência na geração de vídeo: {e}")
                # Fallback para geração normal sem imagem
                operation = client_gemini.models.generate_videos(
                    model=model_used,
                    prompt=final_prompt,
                    config=types.GenerateVideosConfig(aspect_ratio=aspect_ratio)
                )
        else:
            # Cria operação assíncrona sem imagem de referência
            operation = client_gemini.models.generate_videos(
                model=model_used,
                prompt=final_prompt,
                config=types.GenerateVideosConfig(aspect_ratio=aspect_ratio)
            )

        # Aguarda conclusão da operação
        while not operation.done:
            time.sleep(5)
            operation = client_gemini.operations.get(operation)

        generated_video = operation.response.generated_videos[0]
        video_bytes = client_gemini.files.download(file=generated_video.video)

        # Salva o arquivo localmente
        with open(save_path, "wb") as f:
            f.write(video_bytes)

        # Salva no banco
        video_entry = GeneratedVideoContent(
            user_id=user.id,
            prompt=prompt,
            model_used=model_used,
            file_path=save_path,
            created_at=datetime.utcnow(),
        )
        db.session.add(video_entry)
        db.session.commit()

        return jsonify({
            "message": "Vídeo gerado com sucesso!",
            "video": video_entry.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print("Erro ao gerar vídeo:", str(e))
        return jsonify({"error": str(e)}), 500