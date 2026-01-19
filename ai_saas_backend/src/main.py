from flask import Flask, jsonify, send_from_directory, request, make_response
from flask_cors import CORS
from flask_limiter.errors import RateLimitExceeded
from flask_jwt_extended.exceptions import RevokedTokenError
from flask_migrate import Migrate
from dotenv import load_dotenv
from pathlib import Path
from extensions import bcrypt, jwt, db, limiter, jwt_required, get_jwt_identity, create_access_token
from utils import check_if_token_revoked, create_default_plans
from routes import (
    user_api, admin_api, auth_api, email_api, profile_api, project_api,
    generated_content_api, notification_api, plan_api, ai_generation_api,
    ai_generation_video_api, chat_api
)
from models import User, Plan
import os, uuid

load_dotenv()

app = Flask(__name__)

# =========================
# Ambiente
# =========================
ENV = os.getenv("ENV", "dev").lower()
DEV_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

# =========================
# CORS (DESENVOLVIMENTO)
# =========================
# Ambiente local: habilita CORS para localhost:3000 e ajusta cookies para HTTP
CORS(
    app,
    supports_credentials=True,
    origins=DEV_ORIGINS,
    allow_headers=["Content-Type", "X-CSRF-Token", "Authorization"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
)

@app.before_request
def handle_options_request():
    if request.method == "OPTIONS":
        response = make_response()
        origin = request.headers.get("Origin")
        if origin in DEV_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-CSRF-Token, Authorization"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.status_code = 200
        return response

@app.after_request
def add_cors_headers(resp):
    origin = request.headers.get("Origin")
    if origin in DEV_ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-CSRF-Token, Authorization"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    return resp

# =========================
# CORS/COOKIES (PRODUÇÃO)
# =========================
# Caso precisemos rodar em Produção, use este bloco no lugar do bloco de DEV acima:
#
# CORS(
#     app,
#     supports_credentials=True,
#     origins=[
#         "https://artificiall.ai",
#         "https://api.artificiall.ai"
#     ],
#     allow_headers=["Content-Type", "X-CSRF-Token", "Authorization"],
#     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
# )
# @app.before_request
# def handle_options_request_prod():
#     if request.method == "OPTIONS":
#         response = make_response()
#         response.headers["Access-Control-Allow-Origin"] = "https://artificiall.ai"
#         response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
#         response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-CSRF-Token, Authorization"
#         response.headers["Access-Control-Allow-Credentials"] = "true"
#         response.status_code = 200
#         return response

# =========================
# Config do Banco e JWT
# =========================
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.secret_key = os.getenv("SECRET_KEY")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")

# Local de armazenamento do token (cookies HTTPOnly)
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
app.config["JWT_ACCESS_COOKIE_PATH"] = "/"
app.config["JWT_COOKIE_CSRF_PROTECT"] = True
app.config["JWT_ACCESS_COOKIE_NAME"] = "access_token_cookie"

# Padrão PRODUÇÃO (comentado aqui; ver overrides de DEV abaixo)
# app.config["JWT_COOKIE_SECURE"] = True
# app.config["JWT_COOKIE_SAMESITE"] = "None"
# app.config["JWT_COOKIE_DOMAIN"] = ".artificiall.ai"

# Overrides para DESENVOLVIMENTO (localhost sem HTTPS)
app.config["JWT_COOKIE_SECURE"] = False
app.config["JWT_COOKIE_SAMESITE"] = "Lax"
app.config["JWT_COOKIE_DOMAIN"] = None

# =========================
# Extensões
# =========================
db.init_app(app)
migrate = Migrate(app, db)
bcrypt.init_app(app)
jwt.init_app(app)
limiter.init_app(app)

# =========================
# Seed de admin e planos
# =========================
def create_default_admin():
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    admin_name = os.getenv("ADMIN_NAME", "Administrador")
    admin_username = os.getenv("ADMIN_USERNAME", "admin")

    if not admin_email or not admin_password:
        print("⚠️ Variáveis de admin não configuradas. Pulei criação do admin.")
        return

    existing_admin = User.query.filter_by(email=admin_email).first()
    if existing_admin:
        print("✅ Admin já existe.")
        return

    hashed_pw = bcrypt.generate_password_hash(admin_password).decode("utf-8")

    admin = User(
        id=str(uuid.uuid4()),
        full_name=admin_name,
        username=admin_username,
        email=admin_email,
        password=hashed_pw,
        role="admin",
        is_active=True
    )

    db.session.add(admin)
    db.session.commit()
    print(f"👑 Admin criado: {admin_email}")

with app.app_context():
    db.create_all()
    create_default_plans()
    create_default_admin()

# =========================
# Tratadores de erro JWT/Limiter
# =========================
@jwt.token_in_blocklist_loader
def check_if_token_revoked_callback(jwt_header, jwt_payload):
    return check_if_token_revoked(jwt_header, jwt_payload)

@app.errorhandler(RateLimitExceeded)
def ratelimit_handler(e):
    return jsonify({"error": "Você excedeu o número máximo de tentativas de login. Tente novamente mais tarde."}), 429

@app.errorhandler(RevokedTokenError)
def handle_revoked_token(err):
    response = jsonify({"msg": str(err)})
    response.status_code = 401
    return response

# =========================
# Arquivos estáticos de upload
# =========================
@app.route("/static/uploads/<path:filename>")
def serve_user_photo(filename):
    uploads_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "static", "uploads"))
    return send_from_directory(uploads_path, filename)

# =========================
# Blueprints (rotas)
# =========================
app.register_blueprint(user_api, url_prefix="/api/users")
app.register_blueprint(admin_api, url_prefix="/api/admin")
app.register_blueprint(auth_api, url_prefix="/api/auth")
app.register_blueprint(email_api, url_prefix="/api/email")
app.register_blueprint(profile_api, url_prefix="/api/users")
app.register_blueprint(project_api, url_prefix="/api/projects")
app.register_blueprint(plan_api, url_prefix="/api/plans")
app.register_blueprint(generated_content_api, url_prefix="/api/contents")
app.register_blueprint(notification_api, url_prefix="/api/notifications")
app.register_blueprint(ai_generation_api, url_prefix="/api/ai")
app.register_blueprint(ai_generation_video_api, url_prefix="/api/ai")
app.register_blueprint(chat_api, url_prefix="/api/chats")

print("🚀 Ambiente:", "DESENVOLVIMENTO" if ENV == "dev" else "PRODUÇÃO")

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)