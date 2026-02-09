from flask import Blueprint, request, jsonify
from extensions import (
    jwt_required, get_jwt_identity, redis_client
)
from models import User
from dotenv import load_dotenv
import uuid, re, os, smtplib
from datetime import timedelta
from email.mime.text import MIMEText

email_api = Blueprint("email_api", __name__)

load_dotenv()

EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 465))

def send_verification_email(email, code):
    if not EMAIL_USER or not EMAIL_PASS:
        print("Erro ao enviar email: credenciais SMTP não configuradas")
        return False
    msg = MIMEText(f"Seu código de verificação é: {code}")
    msg["Subject"] = "Código de verificação - AI SaaS"
    msg["From"] = EMAIL_USER
    msg["To"] = email

    try:
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(EMAIL_USER, EMAIL_PASS)
            server.sendmail(EMAIL_USER, [email], msg.as_string())
        return True
    except Exception as e:
        print("Erro ao enviar email:", e)
        return False

# Rota para solicitar código de verificação de email (para cadastro)
@email_api.route("/request-email-code", methods=["POST"])
def request_email_code():
    data = request.get_json()
    email = data.get("email")

    if not email or not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"error": "Email inválido"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email já cadastrado"}), 400

    code = str(uuid.uuid4().int)[-6:]
    redis_client.setex(f"email_code:{email}", timedelta(minutes=10), code)
    if not send_verification_email(email, code):
        return jsonify({"error": "Falha ao enviar email"}), 500
    return jsonify({"message": "Código enviado com sucesso"}), 200

# Rota para verificar código de email
@email_api.route("/verify-email-code", methods=["POST"])
def verify_email_code():
    data = request.get_json()
    email = data.get("email")
    code = data.get("code")

    if not email or not code:
        return jsonify({"error": "Email e código são obrigatórios"}), 400

    expected = redis_client.get(f"email_code:{email}")

    if isinstance(expected, bytes):
        expected = expected.decode()

    if not expected or expected != code:
        return jsonify({"error": "Código inválido ou expirado"}), 400

    redis_client.setex(f"email_verified:{email}", timedelta(minutes=30), "true")
    redis_client.delete(f"email_code:{email}")
    return jsonify({"message": "Email verificado com sucesso"}), 200

# Enviar código de segurança para o usuário autenticado (para ações sensíveis)
@email_api.route("/send-security-code", methods=["POST"])
@jwt_required()
def send_security_code():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuário não autenticado"}), 401

    code = str(uuid.uuid4().int)[-6:]
    redis_client.setex(f"security_code:{user.email}", timedelta(minutes=10), code)
    if not send_verification_email(user.email, code):
        return jsonify({"error": "Falha ao enviar email"}), 500
    return jsonify({"message": "Código de segurança enviado"}), 200

# Verificar código de segurança
@email_api.route("/verify-security-code", methods=["POST"])
@jwt_required()
def verify_security_code():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuário inválido"}), 403

    data = request.get_json()
    code = data.get("code")
    if not code:
        return jsonify({"error": "Código é obrigatório"}), 400

    expected_code = redis_client.get(f"security_code:{user.email}")

    if not expected_code:
        return jsonify({"error": "Código incorreto ou expirado"}), 400

    if isinstance(expected_code, bytes):
        expected_code = expected_code.decode()

    if expected_code != code:
        return jsonify({"error": "Código incorreto ou expirado"}), 400

    redis_client.delete(f"security_code:{user.email}")
    return jsonify({"message": "Código verificado com sucesso"}), 200

def send_reset_password_email(to_email, link):
    if not EMAIL_USER or not EMAIL_PASS:
        print("Erro ao enviar email de redefinição: credenciais SMTP não configuradas")
        return False
    msg = MIMEText(
        f"Olá,\n\nClique no link abaixo para redefinir sua senha. Esse link expira em 1 hora.\n\n{link}\n\n"
        "Se você não solicitou essa redefinição, ignore esse email."
    )
    msg["Subject"] = "Redefinição de Senha"
    msg["From"] = EMAIL_USER
    msg["To"] = to_email

    try:
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Erro ao enviar email de redefinição: {e}")
        return False