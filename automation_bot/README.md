# Bot de Automação de Downloads (Freepik e Envato)

Projeto Python que automatiza o download de arquivos do Freepik e Envato Elements, faz upload para o Google Drive e pode ser controlado por Telegram ou por uma GUI desktop.

**Observação de segurança:** NÃO comite `credentials.json`, `.env` ou qualquer arquivo com credenciais ao Git.

## Estrutura do repositório

```
automation_bot/
├── backend/               # Lógica e entrypoint (backend)
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   └── modules/
│       ├── bot.py
│       ├── downloader.py
│       └── drive_service.py
├── frontend/              # GUI desktop (PySimpleGUI)
│   └── app.py
├── .gitignore
└── README.md
```

## 1. Pré-requisitos

- Python 3.8+
- pip
- Para usar o Playwright (navegador Chromium) você precisa instalar as dependências do sistema e baixar os navegadores.

Exemplo (Windows / PowerShell):

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
playwright install chromium
```

No Linux (Debian/Ubuntu) instale também bibliotecas do sistema:

```bash
sudo apt-get update
sudo apt-get install -y libnss3 libfontconfig libgtk-3-0 libgbm-dev
```

## 2. Configuração

1. Crie um arquivo `.env` na raiz (não comite). Exemplos de variáveis usadas em `backend/config.py`:

```dotenv
TELEGRAM_TOKEN=seu_token
FREEPIK_EMAIL=seu_email
FREEPIK_PASSWORD=sua_senha
ENVATO_EMAIL=seu_email_envato
ENVATO_PASSWORD=sua_senha_envato
DRIVE_FOLDER_ID=ID_DA_PASTA
```

2. Coloque o `credentials.json` da Conta de Serviço do Google Drive na raiz do projeto (não comitar) e compartilhe a pasta do Drive com o e-mail da conta de serviço.

## 3. Executando o backend (bot)

Para executar apenas o backend (bot + workers):

```powershell
cd backend
python main.py
# ou a partir da raiz:
python -m backend.main
```

## 4. Executando a GUI (desktop)

A GUI está em `frontend/app.py` (usa `PySimpleGUI`). Execute a partir da raiz do projeto para que o pacote `backend` seja importável:

```powershell
python -m frontend.app
```

Na GUI você pode colar links (uma por linha), enfileirá-los e inicializar o worker local que chama o fluxo de download/upload do backend.

## 5. Empacotamento (opcional)

Para distribuir um executável Windows, recomenda-se usar `PyInstaller` e incluir o passo `playwright install chromium` na máquina alvo.

Exemplo básico:

```powershell
pip install pyinstaller
pyinstaller --onefile frontend\app.py
```

Após gerar o binário, execute `playwright install chromium` no sistema destino antes do primeiro uso.

## 6. Boas práticas

- Nunca commit credenciais (`.env`, `credentials.json`).
- Confirme que sua conta de serviço do Google Drive tem permissão na pasta de destino.
- Teste com poucas requisições e monitore bloqueios por anti-bot em Freepik/Envato.

## 7. Próximos passos sugeridos

- Implementar pagina de configurações na GUI (salvar em `config.json` local seguro).
- Adicionar fila persistente (SQLite) se desejar tolerância a reinícios.
- Adicionar logs e monitoramento para uso em produção.

---

Se quiser, atualizo este README com instruções de empacotamento mais completas ou adiciono um script `run.ps1` para facilitar execução na Windows VM.
