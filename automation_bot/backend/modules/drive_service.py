import os
import logging
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

class DriveService:
    def __init__(self, credentials_path, folder_id):
        self.credentials_path = credentials_path
        self.folder_id = folder_id
        # Usar escopo mais amplo para acessar arquivos/pastas compartilhados
        self.scopes = ['https://www.googleapis.com/auth/drive']
        self.service = self._authenticate()

    def _authenticate(self):
        if not os.path.exists(self.credentials_path):
            logging.warning(f"Arquivo de credenciais do Google não encontrado em: {self.credentials_path}")
            return None
        
        try:
            creds = service_account.Credentials.from_service_account_file(
                self.credentials_path, scopes=self.scopes
            )
            return build('drive', 'v3', credentials=creds)
        except Exception as e:
            logging.error(f"Erro na autenticação do Google Drive: {e}")
            return None

    def upload_file(self, file_path):
        if not self.service:
            logging.error("Serviço do Google Drive não disponível.")
            return None

        if not os.path.exists(file_path):
            logging.error(f"Arquivo local não encontrado para upload: {file_path}")
            return None

        file_name = os.path.basename(file_path)
        file_metadata = {
            'name': file_name,
            'parents': [self.folder_id] if self.folder_id else []
        }
        
        media = MediaFileUpload(file_path, resumable=True)
        
        try:
            # Verificar se tem acesso à pasta antes de fazer upload
            if self.folder_id:
                try:
                    folder_info = self.service.files().get(
                        fileId=self.folder_id,
                        fields='id, name, permissions',
                        supportsAllDrives=True
                    ).execute()
                    logging.info(f"Acesso à pasta confirmado: {folder_info.get('name', 'N/A')}")
                except Exception as e:
                    error_msg = str(e).lower()
                    if 'permission denied' in error_msg or 'insufficient permissions' in error_msg:
                        logging.error(
                            f"ERRO DE PERMISSÃO: A Conta de Serviço não tem permissão de ESCRITA na pasta.\n"
                            f"SOLUÇÃO: Compartilhe a pasta (ID: {self.folder_id}) com o e-mail da Conta de Serviço\n"
                            f"com permissão de 'Editor' ou 'Proprietário'."
                        )
                    else:
                        logging.error(f"Erro ao verificar acesso à pasta: {e}")
                    return None
            
            # Upload do arquivo na pasta compartilhada
            # Usa supportsAllDrives=True para funcionar com pastas compartilhadas e Shared Drives
            # Verificar se a pasta está em um Shared Drive
            try:
                folder_info = self.service.files().get(
                    fileId=self.folder_id,
                    fields='id, name, driveId',
                    supportsAllDrives=True
                ).execute()
                
                # Se tem driveId, está em um Shared Drive (funciona com Service Account)
                if folder_info.get('driveId'):
                    logging.info(f"Pasta está em um Shared Drive (ID: {folder_info.get('driveId')})")
            except:
                pass
            
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, webViewLink',
                supportsAllDrives=True
            ).execute()
            
            file_id = file.get('id')
            logging.info(f"Arquivo enviado com sucesso. ID: {file_id}")

            # Alterar permissão para "qualquer pessoa com o link pode ler"
            # Para Shared Drives, usar 'reader' em vez de 'viewer'
            try:
                # Verificar se está em Shared Drive
                file_info_check = self.service.files().get(
                    fileId=file_id,
                    fields='driveId',
                    supportsAllDrives=True
                ).execute()
                
                # Se está em Shared Drive, usar 'reader', senão 'viewer'
                role = 'reader' if file_info_check.get('driveId') else 'viewer'
                
                self.service.permissions().create(
                    fileId=file_id,
                    body={'type': 'anyone', 'role': role},
                    supportsAllDrives=True
                ).execute()
                logging.info(f"Permissão pública configurada para o arquivo (role: {role})")
            except Exception as e:
                logging.warning(f"Não foi possível configurar permissão pública (arquivo já pode estar acessível): {e}")

            # Obter o link de compartilhamento final
            file_info = self.service.files().get(
                fileId=file_id,
                fields='webViewLink',
                supportsAllDrives=True
            ).execute()

            return file_info.get('webViewLink')

        except Exception as e:
            error_msg = str(e).lower()
            if 'storagequotaexceeded' in error_msg or 'storage quota' in error_msg:
                logging.error(
                    f"❌ ERRO: Conta de Serviço não tem cota de armazenamento no 'Meu Drive' pessoal.\n"
                    f"\n🔧 SOLUÇÃO: Use um Drive Compartilhado (Shared Drive) do Google Workspace:\n"
                    f"\n1. Crie um Drive Compartilhado no Google Drive:\n"
                    f"   - Acesse: https://drive.google.com\n"
                    f"   - Clique em 'Novo' → 'Drive compartilhado'\n"
                    f"   - Dê um nome (ex: 'Bot Downloads')\n"
                    f"   - Crie o Drive\n"
                    f"\n2. Crie uma pasta dentro do Drive Compartilhado:\n"
                    f"   - Dentro do Drive Compartilhado, crie a pasta 'Downloads Bot'\n"
                    f"   - Copie o ID da pasta da URL\n"
                    f"\n3. Compartilhe o Drive Compartilhado com a Conta de Serviço:\n"
                    f"   - Clique com botão direito no Drive Compartilhado → 'Compartilhar'\n"
                    f"   - Adicione o e-mail da Conta de Serviço com permissão 'Editor'\n"
                    f"\n4. Atualize o DRIVE_FOLDER_ID no arquivo .env com o ID da nova pasta\n"
                    f"\n📝 Nota: Se você não tem Google Workspace, contate o administrador para criar um Drive Compartilhado."
                )
            elif 'permission denied' in error_msg or 'insufficient permissions' in error_msg:
                logging.error(
                    f"ERRO DE PERMISSÃO: A Conta de Serviço não tem permissão de ESCRITA na pasta.\n"
                    f"SOLUÇÃO: Compartilhe a pasta do Google Drive com o e-mail da Conta de Serviço\n"
                    f"(encontrado no arquivo credentials.json, campo 'client_email')\n"
                    f"com permissão de 'Editor' ou 'Proprietário'.\n"
                    f"Pasta ID: {self.folder_id}"
                )
            else:
                logging.error(f"Erro ao fazer upload para o Google Drive: {e}")
            return None
    
    def test_connection(self):
        """Testa a conexão com o Google Drive e verifica permissões"""
        if not self.service:
            return False
        
        # Obter o e-mail da Conta de Serviço para mensagens de erro
        service_account_email = None
        try:
            import json
            with open(self.credentials_path, 'r') as f:
                creds_data = json.load(f)
                service_account_email = creds_data.get('client_email')
        except:
            pass
        
        try:
            if self.folder_id:
                # Verifica se consegue acessar a pasta e tem permissões
                folder_info = self.service.files().get(
                    fileId=self.folder_id,
                    fields='id, name, permissions',
                    supportsAllDrives=True
                ).execute()
                logging.info(f"✅ Conexão com Google Drive OK. Pasta: {folder_info.get('name', 'N/A')}")
                
                # Tenta verificar se tem permissão de escrita tentando listar arquivos na pasta
                # (isso não cria nada, apenas verifica permissões)
                self.service.files().list(
                    q=f"'{self.folder_id}' in parents",
                    pageSize=1,
                    fields='files(id, name)',
                    supportsAllDrives=True,
                    includeItemsFromAllDrives=True
                ).execute()
                logging.info("✅ Permissão de escrita na pasta confirmada")
                return True
            else:
                # Se não tem pasta configurada, apenas verifica se o serviço está funcionando
                self.service.files().list(pageSize=1).execute()
                logging.info("✅ Conexão com Google Drive OK (sem pasta específica)")
                return True
        except Exception as e:
            error_msg = str(e).lower()
            if 'file not found' in error_msg or 'notfound' in error_msg:
                logging.error(
                    f"❌ ERRO: Pasta não encontrada ou Conta de Serviço não tem acesso.\n"
                    f"Pasta ID: {self.folder_id}\n"
                    f"E-mail da Conta de Serviço: {service_account_email or 'Não encontrado'}\n"
                    f"\nSOLUÇÃO:\n"
                    f"1. Verifique se o ID da pasta está correto no arquivo .env\n"
                    f"2. Compartilhe a pasta do Google Drive com o e-mail: {service_account_email or 'da Conta de Serviço'}\n"
                    f"3. Defina a permissão como 'Editor' (não 'Visualizador')\n"
                    f"4. Aguarde 2-3 minutos após compartilhar para as permissões propagarem\n"
                    f"5. Verifique se o e-mail no credentials.json corresponde ao e-mail compartilhado"
                )
            elif 'permission denied' in error_msg or 'insufficient permissions' in error_msg:
                logging.error(
                    f"❌ ERRO DE PERMISSÃO: A Conta de Serviço não tem acesso à pasta.\n"
                    f"E-mail da Conta de Serviço: {service_account_email or 'Não encontrado'}\n"
                    f"SOLUÇÃO: Compartilhe a pasta (ID: {self.folder_id}) com o e-mail acima\n"
                    f"com permissão de 'Editor' ou 'Proprietário'."
                )
            else:
                logging.error(f"Erro ao testar conexão do Google Drive: {e}")
            return False