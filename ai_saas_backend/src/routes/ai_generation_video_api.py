import os
import uuid
import time
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
client_gemini = genai.Client(api_key=GEMINI_API_KEY)

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

    data = request.get_json() or {}
    prompt = data.get("prompt", "").strip()
    model_used = data.get("model_used", "veo-3.0-fast-generate-001")
    aspect_ratio = data.get("ratio", "16:9")

    if not prompt:
        return jsonify({"error": "Campo 'prompt' é obrigatório"}), 400

    try:
        filename = f"{uuid.uuid4()}.mp4"
        save_path = os.path.join(VIDEO_UPLOAD_DIR, filename)
        print(f"[DEBUG] Gerando vídeo com modelo {model_used}, ratio {aspect_ratio}...")

        # Cria operação assíncrona
        operation = client_gemini.models.generate_videos(
            model=model_used,
            prompt=prompt,
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