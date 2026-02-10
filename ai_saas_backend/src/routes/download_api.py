from flask import Blueprint, request, jsonify
from extensions import jwt_required, get_jwt_identity
from models.user import User
import asyncio
import sys
from pathlib import Path
import logging
import os

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Adicionar o caminho do automation_bot ao sys.path
SAAS_BASE_DIR = Path(__file__).parent.parent.parent.parent
AUTOMATION_BOT_DIR = SAAS_BASE_DIR / "automation_bot" / "backend"
sys.path.insert(0, str(AUTOMATION_BOT_DIR))

# Importar componentes diretamente em vez de importar main.py
try:
    # Importar config diretamente
    import importlib.util
    
    # Importar config
    config_spec = importlib.util.spec_from_file_location(
        "automation_bot_config",
        str(AUTOMATION_BOT_DIR / "config.py")
    )
    config_module = importlib.util.module_from_spec(config_spec)
    config_spec.loader.exec_module(config_module)
    
    # Importar módulos
    downloader_spec = importlib.util.spec_from_file_location(
        "automation_bot_downloader",
        str(AUTOMATION_BOT_DIR / "modules" / "downloader.py")
    )
    downloader_module = importlib.util.module_from_spec(downloader_spec)
    downloader_spec.loader.exec_module(downloader_module)
    
    drive_service_spec = importlib.util.spec_from_file_location(
        "automation_bot_drive_service",
        str(AUTOMATION_BOT_DIR / "modules" / "drive_service.py")
    )
    drive_service_module = importlib.util.module_from_spec(drive_service_spec)
    drive_service_spec.loader.exec_module(drive_service_module)
    
    # Criar classe AutomationApp localmente
    class AutomationApp:
        def __init__(self):
            # Inicializa o Downloader
            self.downloader = downloader_module.Downloader(
                freepik_creds={
                    'email': config_module.FREEPIK_EMAIL,
                    'password': config_module.FREEPIK_PASSWORD
                },
                envato_creds={
                    'email': config_module.ENVATO_EMAIL,
                    'password': config_module.ENVATO_PASSWORD
                },
                download_path=config_module.DOWNLOAD_PATH
            )
            
            # Inicializa o Drive Service
            self.drive_service = drive_service_module.DriveService(
                credentials_path=str(config_module.CREDENTIALS_PATH),
                folder_id=config_module.DRIVE_FOLDER_ID
            )

        async def process_download_and_upload(self, url, telegram_message=None):
            """Processa download e upload para Google Drive"""
            try:
                # 1. Faz o download do arquivo
                file_path = await self.downloader.download_file(url)
                
                if not file_path:
                    logger.error(f"Falha ao baixar o arquivo da URL: {url}")
                    return None
                
                # 2. Faz o upload para o Google Drive
                if self.drive_service and self.drive_service.service and config_module.DRIVE_FOLDER_ID:
                    drive_link = self.drive_service.upload_file(file_path)
                    
                    if drive_link:
                        # Remove o arquivo local após upload bem-sucedido
                        if os.path.exists(file_path):
                            os.remove(file_path)
                            logger.info(f"Arquivo local removido após upload: {file_path}")
                        return drive_link
                    else:
                        logger.error("Falha ao fazer upload para Google Drive")
                        return None
                else:
                    logger.warning("Google Drive não configurado. Arquivo salvo localmente.")
                    return file_path
                    
            except Exception as e:
                logger.error(f"Erro no fluxo de processamento: {e}")
                return None

        async def test_logins(self):
            """Testa os logins do Freepik, Envato e Google Drive"""
            results = {
                'freepik': None,
                'envato': None,
                'google_drive': None
            }
            
            # Testar Freepik
            if config_module.FREEPIK_EMAIL and config_module.FREEPIK_PASSWORD:
                try:
                    results['freepik'] = await self.downloader.test_freepik_login()
                except Exception as e:
                    logger.error(f"Erro ao testar login do Freepik: {e}")
                    results['freepik'] = False
            else:
                results['freepik'] = None
            
            # Testar Envato
            if config_module.ENVATO_EMAIL and config_module.ENVATO_PASSWORD:
                try:
                    results['envato'] = await self.downloader.test_envato_login()
                except Exception as e:
                    logger.error(f"Erro ao testar login do Envato: {e}")
                    results['envato'] = False
            else:
                results['envato'] = None
            
            # Testar Google Drive
            if self.drive_service:
                try:
                    results['google_drive'] = self.drive_service.test_connection()
                except Exception as e:
                    logger.error(f"Erro ao testar conexão do Google Drive: {e}")
                    results['google_drive'] = False
            else:
                results['google_drive'] = None
            
            return results
    
    logger.info("AutomationApp criado com sucesso")
    
except Exception as e:
    logger.error(f"Erro ao criar AutomationApp: {e}", exc_info=True)
    AutomationApp = None

download_api = Blueprint("download_api", __name__)

# Instância global do app
automation_app = None

def get_automation_app():
    """Obtém ou cria a instância do AutomationApp"""
    global automation_app
    if automation_app is None and AutomationApp is not None:
        try:
            automation_app = AutomationApp()
            logger.info("AutomationApp inicializado com sucesso")
        except Exception as e:
            logger.error(f"Erro ao inicializar AutomationApp: {e}", exc_info=True)
            raise
    return automation_app

def _has_download_access(user: User) -> bool:
    if not user or not user.plan or not getattr(user.plan, "features", None):
        return False
    for pf in user.plan.features:
        if getattr(pf, "feature", None) and pf.feature.key == "download_bot":
            return pf.value == "true"
    return False

@download_api.route("/status", methods=["GET"])
@jwt_required()
def get_status():
    """
    Retorna o status do serviço de download e das conexões
    """
    try:
        user = User.query.get(get_jwt_identity())
        if not _has_download_access(user):
            return jsonify({"error": "Recurso não disponível no seu plano"}), 403

        app = get_automation_app()
        if app is None:
            return jsonify({
                "status": "offline",
                "message": "Serviço não disponível",
                "freepik": False,
                "envato": False,
                "drive": False
            }), 503
        
        # Testar conexões de forma assíncrona
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            results = loop.run_until_complete(app.test_logins())
            
            return jsonify({
                "status": "online",
                "message": "Serviço de download disponível",
                "freepik": results.get("freepik", False),
                "envato": results.get("envato", False),
                "drive": results.get("google_drive", False)
            }), 200
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Erro ao verificar status: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": str(e),
            "freepik": False,
            "envato": False,
            "drive": False
        }), 500

@download_api.route("/process", methods=["POST"])
@jwt_required()
def process_download():
    """
    Processa um link do Freepik/Envato e retorna o link do Google Drive
    """
    try:
        data = request.get_json()
        url = data.get("url")
        
        if not url:
            return jsonify({
                "success": False,
                "error": "URL é obrigatória"
            }), 400
        
        # Validar se é uma URL válida do Freepik ou Envato
        if "freepik.com" not in url and "envato.com" not in url:
            return jsonify({
                "success": False,
                "error": "URL deve ser do Freepik ou Envato"
            }), 400
        
        # Obter usuário atual e validar plano
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not _has_download_access(user):
            return jsonify({"success": False, "error": "Recurso não disponível no seu plano"}), 403
        logger.info(f"Usuário {user_id} solicitou download de: {url}")
        
        # Obter instância do app
        app = get_automation_app()
        if app is None:
            return jsonify({
                "success": False,
                "error": "Serviço não disponível"
            }), 503
        
        # Processar download de forma assíncrona
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                app.process_download_and_upload(url, telegram_message=None)
            )
            
            if result:
                # Se result é uma string, é o link do Drive
                if isinstance(result, str):
                    return jsonify({
                        "success": True,
                        "drive_link": result,
                        "message": "Download concluído com sucesso"
                    }), 200
                # Se result é um caminho de arquivo, houve algum problema
                else:
                    return jsonify({
                        "success": False,
                        "error": "Arquivo baixado mas não foi possível fazer upload para o Drive"
                    }), 500
            else:
                return jsonify({
                    "success": False,
                    "error": "Falha ao processar download"
                }), 500
                
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Erro ao processar download: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
