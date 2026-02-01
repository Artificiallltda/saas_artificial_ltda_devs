import asyncio
import logging
import os
from .config import (
    TELEGRAM_TOKEN, FREEPIK_EMAIL, FREEPIK_PASSWORD,
    ENVATO_EMAIL, ENVATO_PASSWORD, DRIVE_FOLDER_ID, DOWNLOAD_PATH
)
from .modules.bot import TelegramBot
from .modules.downloader import Downloader
from .modules.drive_service import DriveService

# Configuração de logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

class AutomationApp:
    def __init__(self):
        # Inicializa o Downloader
        self.downloader = Downloader(
            freepik_creds={'email': FREEPIK_EMAIL, 'password': FREEPIK_PASSWORD},
            envato_creds={'email': ENVATO_EMAIL, 'password': ENVATO_PASSWORD},
            download_path=DOWNLOAD_PATH
        )
        
        # Inicializa o Drive Service
        # O arquivo 'credentials.json' deve estar na raiz do projeto
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        credentials_path = os.path.join(project_root, 'credentials.json')
        self.drive_service = DriveService(
            credentials_path=credentials_path,
            folder_id=DRIVE_FOLDER_ID
        )

    async def process_download_and_upload(self, url, telegram_message=None):
        """
        Esta função é o callback que o bot chama quando recebe um link.
        
        Fluxo de processamento:
        1. Faz o download do arquivo
        2. Se telegram_message for fornecido (bot no Telegram):
           - Tenta enviar o arquivo diretamente pelo Telegram
           - Se falhar (arquivo muito grande, erro, etc), faz upload para Google Drive e envia o link
        3. Se não tem telegram_message (GUI desktop):
           - Faz upload para Google Drive e retorna o link
           - Se não tem Google Drive configurado, salva localmente
        """
        try:
            # 1. Faz o download do arquivo
            file_path = await self.downloader.download_file(url)
            
            if not file_path:
                logging.error(f"Falha ao baixar o arquivo da URL: {url}")
                return None
            
            # Verifica o tamanho do arquivo (Telegram tem limite de 20MB para bots)
            file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
            telegram_max_size = 20 * 1024 * 1024  # 20MB em bytes
            
            # 2. Se temos acesso à mensagem do Telegram, tenta enviar diretamente
            if telegram_message:
                # Se o arquivo é muito grande para Telegram, vai direto para Drive
                if file_size > telegram_max_size:
                    logging.info(f"Arquivo muito grande ({file_size / 1024 / 1024:.2f}MB) para Telegram. Fazendo upload para Google Drive...")
                else:
                    try:
                        # Tenta enviar o arquivo diretamente pelo Telegram
                        with open(file_path, 'rb') as file:
                            await telegram_message.reply_document(document=file)
                        logging.info(f"Arquivo enviado pelo Telegram: {file_path}")
                        
                        # Remove o arquivo local após enviar
                        if os.path.exists(file_path):
                            os.remove(file_path)
                            logging.info(f"Arquivo local removido após envio: {file_path}")
                        
                        return file_path  # Retorna o caminho para indicar sucesso
                    except Exception as e:
                        logging.warning(f"Erro ao enviar arquivo pelo Telegram: {e}")
                        logging.info("Tentando fazer upload para Google Drive como fallback...")
                        # Se falhar, continua para fazer upload no Drive
            
            # 3. Faz o upload para o Google Drive (fallback ou quando não tem telegram_message)
            if self.drive_service and self.drive_service.service and DRIVE_FOLDER_ID:
                drive_link = self.drive_service.upload_file(file_path)
                
                if drive_link:
                    # Remove o arquivo local após upload bem-sucedido
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        logging.info(f"Arquivo local removido após upload: {file_path}")
                    
                    # Se estamos no Telegram, envia o link
                    if telegram_message:
                        await telegram_message.reply_text(f"📎 Arquivo disponível no Google Drive:\n{drive_link}")
                    
                    return drive_link
                else:
                    logging.error("Falha ao fazer upload para Google Drive")
                    if telegram_message:
                        await telegram_message.reply_text("❌ Erro ao processar o arquivo. Tente novamente mais tarde.")
                    return None
            else:
                # Se não tem Google Drive configurado
                if telegram_message:
                    await telegram_message.reply_text("❌ Google Drive não configurado. Não foi possível processar o arquivo.")
                else:
                    logging.warning("Google Drive não configurado e mensagem do Telegram não fornecida. Arquivo salvo localmente.")
                return file_path
            
        except Exception as e:
            logging.error(f"Erro no fluxo de processamento: {e}")
            if telegram_message:
                await telegram_message.reply_text("❌ Erro técnico ao processar o arquivo. Tente novamente mais tarde.")
            return None

    async def test_logins(self):
        """Testa os logins do Freepik, Envato e Google Drive"""
        results = {
            'freepik': None,
            'envato': None,
            'google_drive': None
        }
        
        # Testar Freepik
        if FREEPIK_EMAIL and FREEPIK_PASSWORD:
            try:
                results['freepik'] = await self.downloader.test_freepik_login()
            except Exception as e:
                logging.error(f"Erro ao testar login do Freepik: {e}")
                results['freepik'] = False
        else:
            results['freepik'] = None  # Não configurado
        
        # Testar Envato
        if ENVATO_EMAIL and ENVATO_PASSWORD:
            try:
                results['envato'] = await self.downloader.test_envato_login()
            except Exception as e:
                logging.error(f"Erro ao testar login do Envato: {e}")
                results['envato'] = False
        else:
            results['envato'] = None  # Não configurado
        
        # Testar Google Drive
        if self.drive_service:
            try:
                results['google_drive'] = self.drive_service.test_connection()
            except Exception as e:
                logging.error(f"Erro ao testar conexão do Google Drive: {e}")
                results['google_drive'] = False
        else:
            results['google_drive'] = None  # Não configurado
        
        return results
    
    def run(self):
        # Inicializa o Bot do Telegram com o callback de processamento
        bot = TelegramBot(
            token=TELEGRAM_TOKEN,
            download_callback=self.process_download_and_upload
        )
        bot.run()

if __name__ == "__main__":
    # Garantir que o diretório de downloads existe
    if not os.path.exists(DOWNLOAD_PATH):
        os.makedirs(DOWNLOAD_PATH)
        
    app = AutomationApp()
    app.run()
