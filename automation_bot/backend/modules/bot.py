import logging
import re
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, filters

# Configuração de logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

class TelegramBot:
    def __init__(self, token, download_callback):
        self.token = token
        self.download_callback = download_callback
        self.app = ApplicationBuilder().token(self.token).build()

    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        # Ignora mensagens sem texto ou comandos
        if not update.message or not update.message.text:
            return

        text = update.message.text
        # Regex para identificar links do Freepik e Envato
        freepik_pattern = r'https?://(?:www\.)?freepik\.com/[^\s]+'
        envato_pattern = r'https?://(?:www\.)?elements\.envato\.com/[^\s]+'

        links = re.findall(f'({freepik_pattern}|{envato_pattern})', text)

        if links:
            for link in links:
                # Responde no grupo que recebeu o link e está processando
                await update.message.reply_text(
                    f"🔍 Link detectado!\n"
                    f"📥 Processando: {link}\n"
                    f"⏳ Aguarde, isso pode levar alguns instantes..."
                )
                
                # Chama o callback que fará o download e upload/envio
                try:
                    result = await self.download_callback(link, update.message)
                    # O callback já envia o arquivo ou link, então não precisamos fazer nada aqui
                    # Apenas logamos o resultado
                    if result:
                        logging.info(f"Processamento concluído para {link}")
                    else:
                        # Se result for None, o callback já deve ter enviado mensagem de erro
                        logging.warning(f"Processamento retornou None para {link}")
                except Exception as e:
                    logging.error(f"Erro ao processar link {link}: {e}")
                    await update.message.reply_text(
                        f"❌ Erro ao processar o link.\n"
                        f"Tente novamente mais tarde ou verifique se o link é válido."
                    )

    def run(self):
        message_handler = MessageHandler(filters.TEXT & (~filters.COMMAND), self.handle_message)
        self.app.add_handler(message_handler)
        print("Bot do Telegram iniciado...")
        self.app.run_polling()
