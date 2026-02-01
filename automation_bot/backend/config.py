import os
from dotenv import load_dotenv

# Encontrar a raiz do projeto (onde está o run_gui.py)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path_root = os.path.join(project_root, '.env')
env_path_backend = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')

# Tentar carregar o .env da raiz do projeto primeiro
if os.path.exists(env_path_root):
    load_dotenv(env_path_root)
    print(f"Carregando .env da raiz: {env_path_root}")
# Se não encontrar na raiz, tenta em backend/.env
elif os.path.exists(env_path_backend):
    load_dotenv(env_path_backend)
    print(f"Carregando .env do backend: {env_path_backend}")
else:
    # Se não encontrar em nenhum lugar, tenta no diretório atual (fallback)
    load_dotenv()
    print("Tentando carregar .env do diretório atual")

# Telegram Configuration
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")

# Freepik Configuration
FREEPIK_EMAIL = os.getenv("FREEPIK_EMAIL")
FREEPIK_PASSWORD = os.getenv("FREEPIK_PASSWORD")

# Envato Configuration
ENVATO_EMAIL = os.getenv("ENVATO_EMAIL")
ENVATO_PASSWORD = os.getenv("ENVATO_PASSWORD")

# Google Drive Configuration
DRIVE_FOLDER_ID = os.getenv("DRIVE_FOLDER_ID")

# Download Path
DOWNLOAD_PATH = os.path.join(os.getcwd(), "downloads")
