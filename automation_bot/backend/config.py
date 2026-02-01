import os
from pathlib import Path

# Quando usado no SaaS, as variáveis de ambiente já são carregadas pelo Flask
# Não precisamos usar dotenv aqui, apenas ler do os.getenv()

# Caminho base do projeto SaaS (raiz do saas_artificial_ltda_devs)
# automation_bot está em: saas_artificial_ltda_devs/automation_bot/
# Então precisamos subir 3 níveis: backend -> automation_bot -> saas_artificial_ltda_devs
SAAS_BASE_DIR = Path(__file__).parent.parent.parent
CREDENTIALS_PATH = SAAS_BASE_DIR / "credentials.json"
DOWNLOADS_DIR = SAAS_BASE_DIR / "downloads"

# Criar diretório de downloads se não existir
DOWNLOADS_DIR.mkdir(exist_ok=True)

# Telegram Configuration (opcional, não usado no SaaS)
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")

# Freepik Configuration
FREEPIK_EMAIL = os.getenv("FREEPIK_EMAIL")
FREEPIK_PASSWORD = os.getenv("FREEPIK_PASSWORD")

# Envato Configuration
ENVATO_EMAIL = os.getenv("ENVATO_EMAIL")
ENVATO_PASSWORD = os.getenv("ENVATO_PASSWORD")

# Google Drive Configuration
DRIVE_FOLDER_ID = os.getenv("DRIVE_FOLDER_ID", "0ABKe1A3GGydXUk9PVA")

# Download Path
DOWNLOAD_PATH = str(DOWNLOADS_DIR)
