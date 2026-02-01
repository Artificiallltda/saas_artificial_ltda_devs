import os
import logging
from playwright.async_api import async_playwright

class Downloader:
    def __init__(self, freepik_creds, envato_creds, download_path):
        self.freepik_creds = freepik_creds
        self.envato_creds = envato_creds
        self.download_path = download_path
        if not os.path.exists(self.download_path):
            os.makedirs(self.download_path)

    async def download_file(self, url):
        async with async_playwright() as p:
            # Lançar navegador. Em produção, headless=True é recomendado.
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()

            try:
                if "freepik.com" in url:
                    file_path = await self._download_freepik(page, url)
                elif "elements.envato.com" in url:
                    file_path = await self._download_envato(page, url)
                else:
                    logging.warning(f"URL não suportada: {url}")
                    file_path = None
                
                return file_path
            except Exception as e:
                logging.error(f"Erro durante o download de {url}: {e}")
                return None
            finally:
                await browser.close()

    async def _download_freepik(self, page, url):
        # Configurar timeout maior para downloads
        page.set_default_timeout(90000)  # 90 segundos
        
        logging.info(f"Acessando Freepik para download: {url}")
        
        # Primeiro, tentar ir direto para a URL do arquivo
        # Se não estiver logado, o Freepik vai redirecionar para login
        try:
            logging.info(f"Navegando para a página do arquivo: {url}")
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            
            # Aceitar cookies se aparecer
            try:
                await page.click("#onetrust-accept-btn-handler", timeout=5000)
                logging.info("Cookies aceitos")
                await page.wait_for_timeout(1000)
            except:
                pass
            
            # Verificar se precisa fazer login (verifica se está na página de login)
            await page.wait_for_load_state("networkidle", timeout=20000)
            current_url = page.url
            
            # Se está na página de login, fazer login
            if "login" in current_url.lower() or "sign-in" in current_url.lower():
                logging.info("Precisa fazer login, redirecionado para página de login")
                
                # Aceitar cookies novamente se aparecer
                try:
                    await page.click("#onetrust-accept-btn-handler", timeout=5000)
                    await page.wait_for_timeout(1000)
                except:
                    pass
                
                # Clicar em "Continue with email" se aparecer
                try:
                    continue_email_btn = page.locator('button:has-text("Continue with email"), a:has-text("Continue with email")').first
                    if await continue_email_btn.is_visible(timeout=5000):
                        await continue_email_btn.click()
                        await page.wait_for_timeout(2000)
                        logging.info("Botão 'Continue with email' clicado")
                except:
                    pass
                
                # Preencher email e senha
                await page.fill('input[name="email"], input[type="email"]', self.freepik_creds['email'])
                await page.fill('input[name="password"], input[type="password"]', self.freepik_creds['password'])
                await page.click('button[type="submit"]')
                await page.wait_for_load_state("networkidle", timeout=20000)
                await page.wait_for_timeout(3000)
                
                # Voltar para a URL do arquivo após login
                logging.info("Login realizado, voltando para a página do arquivo")
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await page.wait_for_load_state("networkidle", timeout=30000)
            else:
                logging.info("Já está logado ou não precisa de login")
            
            await page.wait_for_timeout(2000)  # Aguardar página carregar completamente
            logging.info("Página do arquivo carregada")
        except Exception as e:
            logging.error(f"Erro ao carregar página do arquivo: {e}")
            return None
        
        # Tentar encontrar o botão de download principal
        # O Freepik muda seletores frequentemente, então usamos uma abordagem mais flexível
        # Baseado na interface atual do Freepik, o botão pode estar no header ou na página
        download_selectors = [
            # Botão no header (mais comum)
            'button:has-text("Baixar")',
            'a:has-text("Baixar")',
            'button:has-text("Download")',
            'a:has-text("Download")',
            # Seletores por classe/ID
            "button.download-button",
            "button#download-file",
            "a.download-button",
            '[data-testid*="download"]',
            '[class*="download"][class*="button"]',
            'button[class*="download"]',
            'a[class*="download"]',
            # Seletores por atributo
            'button[aria-label*="download" i]',
            'a[aria-label*="download" i]',
            'button[aria-label*="baixar" i]',
            'a[aria-label*="baixar" i]',
            '[href*="download"]',
            # Seletores genéricos
            'button:has([class*="download"])',
            'a:has([class*="download"])',
            # Tentar encontrar qualquer botão com texto relacionado a download
            'header button:has-text("Download"), header button:has-text("Baixar")',
            'nav button:has-text("Download"), nav button:has-text("Baixar")'
        ]
        
        logging.info("Procurando botão de download...")
        
        # Primeiro, tentar encontrar botões visíveis na página
        all_buttons = page.locator('button, a[href*="download"], a[href*="baixar"]')
        button_count = await all_buttons.count()
        logging.info(f"Encontrados {button_count} botões/links na página")
        
        # Procurar por texto "Download" ou "Baixar" em todos os elementos
        download_texts = ['Download', 'Baixar', 'download', 'baixar', 'DESCARGAR', 'Descargar']
        for text in download_texts:
            try:
                elements = page.locator(f'button:has-text("{text}"), a:has-text("{text}")')
                count = await elements.count()
                if count > 0:
                    logging.info(f"Encontrado {count} elemento(s) com texto '{text}'")
                    for i in range(count):
                        try:
                            elem = elements.nth(i)
                            if await elem.is_visible(timeout=3000):
                                logging.info(f"Tentando clicar no elemento {i+1} com texto '{text}'")
                                async with page.expect_download(timeout=60000) as download_info:
                                    await elem.click()
                                download = await download_info.value
                                path = os.path.join(self.download_path, download.suggested_filename)
                                await download.save_as(path)
                                logging.info(f"Download concluído: {path}")
                                return path
                        except Exception as e:
                            logging.debug(f"Erro ao clicar no elemento {i+1}: {e}")
                            continue
            except:
                continue
        
        # Se não encontrou por texto, tentar pelos seletores específicos
        for selector in download_selectors:
            try:
                btn = page.locator(selector).first
                # Aguardar o botão aparecer
                if await btn.is_visible(timeout=5000):
                    logging.info(f"Botão de download encontrado com seletor: {selector}")
                    async with page.expect_download(timeout=60000) as download_info:
                        await btn.click()
                    download = await download_info.value
                    path = os.path.join(self.download_path, download.suggested_filename)
                    await download.save_as(path)
                    logging.info(f"Download concluído: {path}")
                    return path
            except Exception as e:
                logging.debug(f"Seletor {selector} não funcionou: {e}")
                continue
        
        # Se não encontrou, tentar salvar screenshot para debug
        try:
            await page.screenshot(path="freepik_download_debug.png")
            logging.info("Screenshot salvo em freepik_download_debug.png para análise")
        except:
            pass
        
        logging.error("Botão de download não encontrado no Freepik após tentar todos os seletores.")
        return None

    async def _download_envato(self, page, url):
        logging.info(f"Acessando Envato para download: {url}")
        # Login
        await page.goto("https://elements.envato.com/sign-in")
        await page.fill('#username', self.envato_creds['email'])
        await page.fill('#password', self.envato_creds['password'])
        await page.click('button[type="submit"]')
        await page.wait_for_load_state("networkidle")

        # Ir para a URL do arquivo
        await page.goto(url)
        
        # Botão de download inicial
        download_btn = page.locator('button:has-text("Download")').first
        if await download_btn.is_visible():
            await download_btn.click()
            
            # Envato geralmente pede para selecionar um projeto ou licença
            # Vamos tentar clicar em "Download without a project" ou similar se disponível
            # Ou simplesmente "Add & Download" se as configurações permitirem
            confirm_btn = page.locator('button:has-text("Add & Download"), button:has-text("Download")').last
            if await confirm_btn.is_visible():
                async with page.expect_download() as download_info:
                    await confirm_btn.click()
                download = await download_info.value
                path = os.path.join(self.download_path, download.suggested_filename)
                await download.save_as(path)
                logging.info(f"Download concluído: {path}")
                return path
                
        logging.error("Botão de download não encontrado no Envato.")
        return None
    
    async def test_freepik_login(self):
        """Testa se o login no Freepik está funcionando"""
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                page = await context.new_page()
                page.set_default_timeout(30000)  # Timeout padrão de 30 segundos
                
                try:
                    logging.info("Acessando página de login do Freepik...")
                    await page.goto("https://www.freepik.com/login", wait_until="domcontentloaded", timeout=30000)
                    
                    # Aceitar cookies se aparecer
                    try:
                        await page.click("#onetrust-accept-btn-handler", timeout=5000)
                        logging.info("Cookies aceitos")
                        await page.wait_for_timeout(1000)  # Aguardar após aceitar cookies
                    except:
                        pass
                    
                    # Aguardar a página carregar completamente
                    await page.wait_for_load_state("networkidle", timeout=15000)
                    await page.wait_for_timeout(2000)  # Aguardar um pouco mais para garantir
                    
                    # Primeiro, verificar se os campos já estão visíveis
                    email_input_check = page.locator('input[type="email"], input[name="email"]').first
                    try:
                        if await email_input_check.is_visible(timeout=3000):
                            logging.info("Campos de login já estão visíveis na página")
                            email_button_clicked = False  # Não precisa clicar no botão
                        else:
                            email_button_clicked = None  # Ainda não sabemos
                    except:
                        email_button_clicked = None  # Ainda não sabemos
                    
                    # Se os campos não estão visíveis, tentar clicar no botão "Continue with email"
                    if email_button_clicked is None:
                        logging.info("Procurando botão 'Continue with email'...")
                        continue_email_selectors = [
                            'button:has-text("Continue with email")',
                            'button:has-text("Continue with Email")',
                            'button:has-text("continue with email")',
                            'button:has-text("email")',
                            'a:has-text("Continue with email")',
                            'a:has-text("email")',
                            '[data-testid*="email"]',
                            'button[class*="email"]',
                            'a[class*="email"]',
                            'button:has([class*="email"])',
                            'a:has([class*="email"])'
                        ]
                        
                        email_button_clicked = False
                        for selector in continue_email_selectors:
                            try:
                                email_button = page.locator(selector).first
                                if await email_button.is_visible(timeout=5000):
                                    await email_button.click()
                                    logging.info(f"Botão 'Continue with email' clicado usando seletor: {selector}")
                                    email_button_clicked = True
                                    break
                            except:
                                continue
                    
                    if email_button_clicked:
                        # Aguardar os campos de email e senha aparecerem após clicar
                        logging.info("Aguardando campos de login aparecerem...")
                        await page.wait_for_timeout(2000)
                        try:
                            # Aguardar até que um campo de email ou senha apareça
                            await page.wait_for_selector('input[type="email"], input[name="email"], input[type="password"], input[name="password"]', timeout=10000, state="visible")
                            logging.info("Campos de login detectados")
                            await page.wait_for_timeout(1000)  # Aguardar um pouco mais para garantir que estão totalmente carregados
                        except:
                            logging.warning("Campos de login podem não ter aparecido, continuando mesmo assim...")
                    elif email_button_clicked is None:
                        logging.info("Botão 'Continue with email' não encontrado, tentando encontrar campos diretamente...")
                    
                    # Tentar múltiplos seletores para o campo de email
                    email_selectors = [
                        'input[name="email"]',
                        'input[type="email"]',
                        'input[id*="email" i]',
                        'input[id*="Email" i]',
                        'input[placeholder*="email" i]',
                        'input[placeholder*="Email" i]',
                        'input[placeholder*="e-mail" i]',
                        'input[placeholder*="E-mail" i]',
                        'input[autocomplete="email"]',
                        'input[autocomplete="username"]',
                        'form input[type="text"]:first-of-type',  # Primeiro input de texto no formulário
                        'form input:first-of-type',  # Primeiro input no formulário
                    ]
                    
                    email_filled = False
                    for selector in email_selectors:
                        try:
                            email_input = page.locator(selector).first
                            # Aguardar o elemento aparecer e ficar visível
                            await email_input.wait_for(state="visible", timeout=5000)
                            if await email_input.is_visible():
                                await email_input.click()  # Clicar primeiro para focar
                                await page.wait_for_timeout(500)
                                await email_input.fill(self.freepik_creds['email'])
                                logging.info(f"Email preenchido usando seletor: {selector}")
                                email_filled = True
                                break
                        except Exception as e:
                            logging.debug(f"Seletor {selector} não funcionou: {e}")
                            continue
                    
                    # Se ainda não encontrou, tentar uma abordagem mais genérica
                    if not email_filled:
                        logging.info("Tentando abordagem genérica para encontrar campo de email...")
                        try:
                            # Buscar todos os inputs visíveis no formulário
                            all_inputs = page.locator('form input, input[type="text"], input[type="email"]')
                            count = await all_inputs.count()
                            logging.info(f"Encontrados {count} inputs na página")
                            
                            # Tentar o primeiro input que não seja senha
                            for i in range(count):
                                try:
                                    input_elem = all_inputs.nth(i)
                                    if await input_elem.is_visible():
                                        input_type = await input_elem.get_attribute("type")
                                        input_name = await input_elem.get_attribute("name")
                                        input_id = await input_elem.get_attribute("id")
                                        
                                        # Se não for senha, tentar preencher como email
                                        if input_type != "password" and "password" not in (input_name or "").lower() and "password" not in (input_id or "").lower():
                                            await input_elem.click()
                                            await page.wait_for_timeout(500)
                                            await input_elem.fill(self.freepik_creds['email'])
                                            logging.info(f"Email preenchido no input genérico (tipo: {input_type}, name: {input_name}, id: {input_id})")
                                            email_filled = True
                                            break
                                except:
                                    continue
                        except Exception as e:
                            logging.debug(f"Abordagem genérica falhou: {e}")
                    
                    if not email_filled:
                        logging.error("Não foi possível encontrar o campo de email")
                        # Debug: salvar screenshot para análise
                        try:
                            await page.screenshot(path="freepik_login_debug.png")
                            logging.info("Screenshot salvo em freepik_login_debug.png para análise")
                        except:
                            pass
                        return False
                    
                    # Tentar múltiplos seletores para o campo de senha
                    password_selectors = [
                        'input[name="password"]',
                        'input[type="password"]',
                        'input[id*="password" i]',
                        'input[id*="Password" i]',
                        'input[placeholder*="password" i]',
                        'input[placeholder*="Password" i]',
                        'input[placeholder*="senha" i]',
                        'input[placeholder*="Senha" i]',
                        'input[autocomplete="current-password"]',
                        'form input[type="password"]',
                        'form input[type="password"]:last-of-type',  # Último input de senha no formulário
                    ]
                    
                    password_filled = False
                    for selector in password_selectors:
                        try:
                            password_input = page.locator(selector).first
                            # Aguardar o elemento aparecer e ficar visível
                            await password_input.wait_for(state="visible", timeout=5000)
                            if await password_input.is_visible():
                                await password_input.click()  # Clicar primeiro para focar
                                await page.wait_for_timeout(500)
                                await password_input.fill(self.freepik_creds['password'])
                                logging.info(f"Senha preenchida usando seletor: {selector}")
                                password_filled = True
                                break
                        except Exception as e:
                            logging.debug(f"Seletor de senha {selector} não funcionou: {e}")
                            continue
                    
                    # Se ainda não encontrou, tentar uma abordagem mais genérica
                    if not password_filled:
                        logging.info("Tentando abordagem genérica para encontrar campo de senha...")
                        try:
                            # Buscar todos os inputs de senha
                            all_password_inputs = page.locator('input[type="password"]')
                            count = await all_password_inputs.count()
                            logging.info(f"Encontrados {count} inputs de senha na página")
                            
                            if count > 0:
                                password_input = all_password_inputs.first
                                if await password_input.is_visible():
                                    await password_input.click()
                                    await page.wait_for_timeout(500)
                                    await password_input.fill(self.freepik_creds['password'])
                                    logging.info("Senha preenchida no input genérico")
                                    password_filled = True
                        except Exception as e:
                            logging.debug(f"Abordagem genérica de senha falhou: {e}")
                    
                    if not password_filled:
                        logging.error("Não foi possível encontrar o campo de senha")
                        return False
                    
                    # Aguardar um pouco antes de clicar no botão
                    await page.wait_for_timeout(1000)
                    
                    # Tentar múltiplos seletores para o botão de submit
                    submit_selectors = [
                        'button[type="submit"]',
                        'button:has-text("Sign in")',
                        'button:has-text("Login")',
                        'button:has-text("Log in")',
                        'button.btn-primary',
                        'button[class*="submit"]'
                    ]
                    
                    button_clicked = False
                    for selector in submit_selectors:
                        try:
                            submit_button = page.locator(selector).first
                            if await submit_button.is_visible(timeout=5000):
                                await submit_button.click()
                                logging.info(f"Botão de login clicado usando seletor: {selector}")
                                button_clicked = True
                                break
                        except:
                            continue
                    
                    if not button_clicked:
                        logging.error("Não foi possível encontrar o botão de login")
                        return False
                    
                    # Aguardar a resposta do login (pode redirecionar ou mostrar erro)
                    logging.info("Aguardando resposta do login...")
                    try:
                        # Aguardar até que a URL mude ou apareça um elemento de sucesso/erro
                        await page.wait_for_load_state("networkidle", timeout=20000)
                    except:
                        pass
                    
                    # Aguardar um pouco mais para garantir que a página processou
                    await page.wait_for_timeout(3000)
                    
                    # Verificar se logou com sucesso
                    current_url = page.url
                    logging.info(f"URL atual após login: {current_url}")
                    
                    # Se não está mais na página de login, provavelmente logou
                    if "login" not in current_url.lower():
                        logging.info("Login bem-sucedido - redirecionado para outra página")
                        return True
                    
                    # Verificar se há elementos indicando login bem-sucedido
                    success_indicators = [
                        'a[href*="profile"]',
                        'a[href*="account"]',
                        'a[href*="dashboard"]',
                        '[class*="user-menu"]',
                        '[class*="profile"]',
                        'button:has-text("Logout")',
                        'button:has-text("Log out")'
                    ]
                    
                    for indicator in success_indicators:
                        try:
                            count = await page.locator(indicator).count()
                            if count > 0:
                                logging.info(f"Login bem-sucedido - encontrado indicador: {indicator}")
                                return True
                        except:
                            continue
                    
                    # Verificar se há mensagem de erro
                    error_selectors = [
                        '.error',
                        '.alert-danger',
                        '[class*="error"]',
                        '[class*="alert"]',
                        '[role="alert"]'
                    ]
                    
                    for error_selector in error_selectors:
                        try:
                            error_elements = page.locator(error_selector)
                            count = await error_elements.count()
                            if count > 0:
                                # Verificar se o elemento está visível e contém texto de erro
                                for i in range(count):
                                    element = error_elements.nth(i)
                                    if await element.is_visible():
                                        text = await element.text_content()
                                        if text and len(text.strip()) > 0:
                                            logging.warning(f"Mensagem de erro encontrada: {text}")
                                            return False
                        except:
                            continue
                    
                    # Se ainda está na página de login e não encontrou indicadores de sucesso ou erro,
                    # considerar como falha
                    logging.warning("Ainda na página de login sem indicadores claros de sucesso")
                    return False
                    
                finally:
                    await browser.close()
        except Exception as e:
            logging.error(f"Erro ao testar login do Freepik: {e}")
            return False
    
    async def test_envato_login(self):
        """Testa se o login no Envato está funcionando"""
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                page = await context.new_page()
                
                try:
                    await page.goto("https://elements.envato.com/sign-in")
                    await page.fill('#username', self.envato_creds['email'])
                    await page.fill('#password', self.envato_creds['password'])
                    await page.click('button[type="submit"]')
                    await page.wait_for_load_state("networkidle", timeout=10000)
                    
                    # Aguardar um pouco para ver se há erro de login
                    await page.wait_for_timeout(2000)
                    
                    # Verificar se ainda está na página de login (erro) ou foi redirecionado (sucesso)
                    current_url = page.url
                    if "sign-in" not in current_url.lower() or page.locator('a[href*="profile"], a[href*="account"]').count() > 0:
                        return True
                    else:
                        # Verificar se há mensagem de erro
                        error_elements = await page.locator('.error, .alert-danger, [class*="error"]').count()
                        return error_elements == 0
                finally:
                    await browser.close()
        except Exception as e:
            logging.error(f"Erro ao testar login do Envato: {e}")
            return False