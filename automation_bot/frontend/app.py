import threading
import queue
import asyncio
import os
import sys
from datetime import datetime
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox

# Adiciona o diretório raiz ao path para importar o backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Try to import backend AutomationApp
try:
    from backend.main import AutomationApp
    backend_app = AutomationApp()
    backend_available = True
    backend_error = None
except Exception as e:
    backend_app = None
    backend_available = False
    backend_error = str(e)

# Fila local de jobs
job_queue = queue.Queue()
worker_running = False
worker_thread = None

class AutomationBotGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("🤖 Automation Bot - Download Manager")
        self.root.geometry("900x700")
        self.root.minsize(800, 600)
        
        # Variáveis
        self.job_list_items = []
        
        # Configurar estilo
        self.setup_style()
        
        # Criar interface
        self.create_widgets()
        
        # Inicializar logs
        self.initialize_logs()
        
        # Atualizar status periodicamente
        self.update_status()
    
    def setup_style(self):
        """Configura o estilo da interface"""
        style = ttk.Style()
        style.theme_use('clam')
        
        # Cores personalizadas
        self.colors = {
            'bg': '#2b2b2b',
            'fg': '#ffffff',
            'success': '#4caf50',
            'error': '#f44336',
            'warning': '#ff9800',
            'info': '#2196f3',
            'frame_bg': '#3c3c3c',
            'entry_bg': '#404040',
            'button_bg': '#505050'
        }
        
        # Configurar cores do root
        self.root.configure(bg=self.colors['bg'])
    
    def create_widgets(self):
        """Cria todos os widgets da interface"""
        # Container principal
        main_frame = tk.Frame(self.root, bg=self.colors['bg'])
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Cabeçalho
        header_frame = tk.Frame(main_frame, bg=self.colors['bg'])
        header_frame.pack(fill=tk.X, pady=(0, 10))
        
        title_label = tk.Label(
            header_frame,
            text="🤖 Automation Bot - Download Manager",
            font=('Arial', 16, 'bold'),
            bg=self.colors['bg'],
            fg=self.colors['fg']
        )
        title_label.pack()
        
        # Status do Backend e Worker
        status_frame = tk.Frame(main_frame, bg=self.colors['frame_bg'], relief=tk.RAISED, bd=1)
        status_frame.pack(fill=tk.X, pady=(0, 10))
        
        status_inner = tk.Frame(status_frame, bg=self.colors['frame_bg'])
        status_inner.pack(fill=tk.X, padx=10, pady=10)
        
        # Status Backend
        backend_label = tk.Label(
            status_inner,
            text="Backend:",
            font=('Arial', 10, 'bold'),
            bg=self.colors['frame_bg'],
            fg=self.colors['fg']
        )
        backend_label.pack(side=tk.LEFT, padx=(0, 5))
        
        self.backend_status_label = tk.Label(
            status_inner,
            text="✅ Conectado" if backend_available else "❌ Desconectado",
            font=('Arial', 10),
            bg=self.colors['frame_bg'],
            fg=self.colors['success'] if backend_available else self.colors['error']
        )
        self.backend_status_label.pack(side=tk.LEFT, padx=(0, 15))
        
        # Status Freepik
        freepik_label = tk.Label(
            status_inner,
            text="Freepik:",
            font=('Arial', 10, 'bold'),
            bg=self.colors['frame_bg'],
            fg=self.colors['fg']
        )
        freepik_label.pack(side=tk.LEFT, padx=(0, 5))
        
        self.freepik_status_label = tk.Label(
            status_inner,
            text="⏳ Testando...",
            font=('Arial', 10),
            bg=self.colors['frame_bg'],
            fg='gray'
        )
        self.freepik_status_label.pack(side=tk.LEFT, padx=(0, 15))
        
        # Status Envato
        envato_label = tk.Label(
            status_inner,
            text="Envato:",
            font=('Arial', 10, 'bold'),
            bg=self.colors['frame_bg'],
            fg=self.colors['fg']
        )
        envato_label.pack(side=tk.LEFT, padx=(0, 5))
        
        self.envato_status_label = tk.Label(
            status_inner,
            text="⏳ Testando...",
            font=('Arial', 10),
            bg=self.colors['frame_bg'],
            fg='gray'
        )
        self.envato_status_label.pack(side=tk.LEFT, padx=(0, 15))
        
        # Status Google Drive
        google_label = tk.Label(
            status_inner,
            text="Google Drive:",
            font=('Arial', 10, 'bold'),
            bg=self.colors['frame_bg'],
            fg=self.colors['fg']
        )
        google_label.pack(side=tk.LEFT, padx=(0, 5))
        
        self.google_status_label = tk.Label(
            status_inner,
            text="⏳ Testando...",
            font=('Arial', 10),
            bg=self.colors['frame_bg'],
            fg='gray'
        )
        self.google_status_label.pack(side=tk.LEFT, padx=(0, 15))
        
        # Status Worker
        worker_label = tk.Label(
            status_inner,
            text="Worker:",
            font=('Arial', 10, 'bold'),
            bg=self.colors['frame_bg'],
            fg=self.colors['fg']
        )
        worker_label.pack(side=tk.LEFT, padx=(0, 5))
        
        self.worker_status_indicator = tk.Label(
            status_inner,
            text="●",
            font=('Arial', 14),
            bg=self.colors['frame_bg'],
            fg=self.colors['error']
        )
        self.worker_status_indicator.pack(side=tk.LEFT, padx=(0, 5))
        
        self.worker_status_text = tk.Label(
            status_inner,
            text="Parado",
            font=('Arial', 10),
            bg=self.colors['frame_bg'],
            fg=self.colors['fg']
        )
        self.worker_status_text.pack(side=tk.LEFT)
        
        # Botão para testar logins novamente
        test_logins_button = tk.Button(
            status_inner,
            text="🔄 Testar Logins",
            command=self.test_logins,
            bg=self.colors['info'],
            fg='white',
            font=('Arial', 8),
            relief=tk.FLAT,
            cursor='hand2',
            padx=10,
            pady=3
        )
        test_logins_button.pack(side=tk.RIGHT)
        
        # Área de entrada de links
        links_frame = tk.LabelFrame(
            main_frame,
            text="📎 Adicionar Links",
            font=('Arial', 10, 'bold'),
            bg=self.colors['frame_bg'],
            fg=self.colors['fg'],
            relief=tk.RAISED,
            bd=2
        )
        links_frame.pack(fill=tk.BOTH, expand=False, pady=(0, 10))
        
        links_inner = tk.Frame(links_frame, bg=self.colors['frame_bg'])
        links_inner.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        self.links_text = scrolledtext.ScrolledText(
            links_inner,
            height=6,
            bg=self.colors['entry_bg'],
            fg=self.colors['fg'],
            insertbackground=self.colors['fg'],
            font=('Consolas', 9),
            wrap=tk.WORD
        )
        self.links_text.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        links_buttons_frame = tk.Frame(links_inner, bg=self.colors['frame_bg'])
        links_buttons_frame.pack(fill=tk.X)
        
        add_button = tk.Button(
            links_buttons_frame,
            text="➕ Adicionar à Fila",
            command=self.add_links,
            bg=self.colors['success'],
            fg='white',
            font=('Arial', 9, 'bold'),
            relief=tk.FLAT,
            cursor='hand2',
            padx=15,
            pady=5
        )
        add_button.pack(side=tk.LEFT, padx=(0, 5))
        
        clear_links_button = tk.Button(
            links_buttons_frame,
            text="🗑️ Limpar",
            command=self.clear_links,
            bg=self.colors['button_bg'],
            fg=self.colors['fg'],
            font=('Arial', 9),
            relief=tk.FLAT,
            cursor='hand2',
            padx=15,
            pady=5
        )
        clear_links_button.pack(side=tk.LEFT)
        
        info_label = tk.Label(
            links_buttons_frame,
            text="Links suportados: Freepik.com | Elements.envato.com",
            font=('Arial', 8),
            bg=self.colors['frame_bg'],
            fg='gray'
        )
        info_label.pack(side=tk.RIGHT)
        
        # Fila de Jobs
        queue_frame = tk.LabelFrame(
            main_frame,
            text="📋 Fila de Processamento",
            font=('Arial', 10, 'bold'),
            bg=self.colors['frame_bg'],
            fg=self.colors['fg'],
            relief=tk.RAISED,
            bd=2
        )
        queue_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        queue_inner = tk.Frame(queue_frame, bg=self.colors['frame_bg'])
        queue_inner.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Listbox com scrollbar
        listbox_frame = tk.Frame(queue_inner, bg=self.colors['frame_bg'])
        listbox_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        scrollbar = tk.Scrollbar(listbox_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.job_listbox = tk.Listbox(
            listbox_frame,
            bg=self.colors['entry_bg'],
            fg=self.colors['fg'],
            font=('Consolas', 9),
            yscrollcommand=scrollbar.set,
            selectmode=tk.SINGLE
        )
        self.job_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.job_listbox.yview)
        
        queue_buttons_frame = tk.Frame(queue_inner, bg=self.colors['frame_bg'])
        queue_buttons_frame.pack(fill=tk.X)
        
        start_button = tk.Button(
            queue_buttons_frame,
            text="▶️ Iniciar Worker",
            command=self.start_worker,
            bg=self.colors['success'],
            fg='white',
            font=('Arial', 9, 'bold'),
            relief=tk.FLAT,
            cursor='hand2',
            padx=15,
            pady=5
        )
        start_button.pack(side=tk.LEFT, padx=(0, 5))
        
        stop_button = tk.Button(
            queue_buttons_frame,
            text="⏹️ Parar Worker",
            command=self.stop_worker,
            bg=self.colors['error'],
            fg='white',
            font=('Arial', 9, 'bold'),
            relief=tk.FLAT,
            cursor='hand2',
            padx=15,
            pady=5
        )
        stop_button.pack(side=tk.LEFT, padx=(0, 5))
        
        clear_queue_button = tk.Button(
            queue_buttons_frame,
            text="🗑️ Limpar Fila",
            command=self.clear_queue,
            bg=self.colors['button_bg'],
            fg=self.colors['fg'],
            font=('Arial', 9),
            relief=tk.FLAT,
            cursor='hand2',
            padx=15,
            pady=5
        )
        clear_queue_button.pack(side=tk.LEFT)
        
        self.queue_count_label = tk.Label(
            queue_buttons_frame,
            text="Jobs na fila: 0",
            font=('Arial', 9),
            bg=self.colors['frame_bg'],
            fg=self.colors['fg']
        )
        self.queue_count_label.pack(side=tk.RIGHT)
        
        # Logs
        logs_frame = tk.LabelFrame(
            main_frame,
            text="📝 Logs de Atividade",
            font=('Arial', 10, 'bold'),
            bg=self.colors['frame_bg'],
            fg=self.colors['fg'],
            relief=tk.RAISED,
            bd=2
        )
        logs_frame.pack(fill=tk.BOTH, expand=True)
        
        logs_inner = tk.Frame(logs_frame, bg=self.colors['frame_bg'])
        logs_inner.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        self.log_text = scrolledtext.ScrolledText(
            logs_inner,
            height=10,
            bg=self.colors['entry_bg'],
            fg=self.colors['fg'],
            insertbackground=self.colors['fg'],
            font=('Consolas', 9),
            wrap=tk.WORD,
            state=tk.DISABLED
        )
        self.log_text.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        logs_buttons_frame = tk.Frame(logs_inner, bg=self.colors['frame_bg'])
        logs_buttons_frame.pack(fill=tk.X)
        
        clear_log_button = tk.Button(
            logs_buttons_frame,
            text="🗑️ Limpar Logs",
            command=self.clear_logs,
            bg=self.colors['button_bg'],
            fg=self.colors['fg'],
            font=('Arial', 9),
            relief=tk.FLAT,
            cursor='hand2',
            padx=15,
            pady=5
        )
        clear_log_button.pack(side=tk.LEFT)
        
        self.last_update_label = tk.Label(
            logs_buttons_frame,
            text="",
            font=('Arial', 8),
            bg=self.colors['frame_bg'],
            fg='gray'
        )
        self.last_update_label.pack(side=tk.RIGHT)
        
        # Rodapé
        footer_frame = tk.Frame(main_frame, bg=self.colors['bg'])
        footer_frame.pack(fill=tk.X, pady=(10, 0))
        
        tip_label = tk.Label(
            footer_frame,
            text="💡 Dica: Adicione links, inicie o worker e acompanhe o progresso nos logs",
            font=('Arial', 8),
            bg=self.colors['bg'],
            fg='gray'
        )
        tip_label.pack(side=tk.LEFT)
        
        exit_button = tk.Button(
            footer_frame,
            text="❌ Sair",
            command=self.on_closing,
            bg=self.colors['error'],
            fg='white',
            font=('Arial', 9, 'bold'),
            relief=tk.FLAT,
            cursor='hand2',
            padx=15,
            pady=5
        )
        exit_button.pack(side=tk.RIGHT)
        
        # Bind para fechar janela
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
    
    def format_timestamp(self):
        """Retorna timestamp formatado"""
        return datetime.now().strftime("%H:%M:%S")
    
    def log_message(self, message, level="INFO"):
        """Adiciona mensagem ao log com timestamp"""
        timestamp = self.format_timestamp()
        icons = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "ERROR": "❌",
            "WARNING": "⚠️"
        }
        icon = icons.get(level, "ℹ️")
        
        log_text = f"[{timestamp}] {icon} {message}\n"
        
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, log_text)
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)
    
    def initialize_logs(self):
        """Inicializa os logs"""
        if backend_available:
            self.log_message("Backend conectado com sucesso!", "SUCCESS")
            self.log_message("Sistema pronto para processar downloads", "INFO")
            # Testar logins automaticamente ao iniciar
            self.test_logins()
        else:
            self.log_message(f"Backend não disponível: {backend_error}", "ERROR")
            self.log_message("Verifique as configurações no arquivo .env", "WARNING")
            self.freepik_status_label.config(text="❌ N/A", fg=self.colors['error'])
            self.envato_status_label.config(text="❌ N/A", fg=self.colors['error'])
            self.google_status_label.config(text="❌ N/A", fg=self.colors['error'])
    
    def test_logins(self):
        """Testa os logins do Freepik, Envato e Google Drive"""
        if not backend_available:
            messagebox.showerror("Erro", "Backend não disponível!")
            return
        
        self.freepik_status_label.config(text="⏳ Testando...", fg='gray')
        self.envato_status_label.config(text="⏳ Testando...", fg='gray')
        self.google_status_label.config(text="⏳ Testando...", fg='gray')
        self.log_message("Testando logins do Freepik, Envato e Google Drive...", "INFO")
        
        def test_in_thread():
            try:
                results = asyncio.run(backend_app.test_logins())
                
                # Atualizar status do Freepik
                if results['freepik'] is None:
                    self.root.after(0, lambda: self.freepik_status_label.config(
                        text="⚪ Não configurado", fg='gray'
                    ))
                    self.root.after(0, lambda: self.log_message("Freepik: Credenciais não configuradas", "WARNING"))
                elif results['freepik']:
                    self.root.after(0, lambda: self.freepik_status_label.config(
                        text="✅ Conectado", fg=self.colors['success']
                    ))
                    self.root.after(0, lambda: self.log_message("Freepik: Login realizado com sucesso!", "SUCCESS"))
                else:
                    self.root.after(0, lambda: self.freepik_status_label.config(
                        text="❌ Falhou", fg=self.colors['error']
                    ))
                    self.root.after(0, lambda: self.log_message("Freepik: Falha no login. Verifique as credenciais.", "ERROR"))
                
                # Atualizar status do Envato
                if results['envato'] is None:
                    self.root.after(0, lambda: self.envato_status_label.config(
                        text="⚪ Não configurado", fg='gray'
                    ))
                    self.root.after(0, lambda: self.log_message("Envato: Credenciais não configuradas", "WARNING"))
                elif results['envato']:
                    self.root.after(0, lambda: self.envato_status_label.config(
                        text="✅ Conectado", fg=self.colors['success']
                    ))
                    self.root.after(0, lambda: self.log_message("Envato: Login realizado com sucesso!", "SUCCESS"))
                else:
                    self.root.after(0, lambda: self.envato_status_label.config(
                        text="❌ Falhou", fg=self.colors['error']
                    ))
                    self.root.after(0, lambda: self.log_message("Envato: Falha no login. Verifique as credenciais.", "ERROR"))
                
                # Atualizar status do Google Drive
                if results['google_drive'] is None:
                    self.root.after(0, lambda: self.google_status_label.config(
                        text="⚪ Não configurado", fg='gray'
                    ))
                    self.root.after(0, lambda: self.log_message("Google Drive: Credenciais não configuradas", "WARNING"))
                elif results['google_drive']:
                    self.root.after(0, lambda: self.google_status_label.config(
                        text="✅ Conectado", fg=self.colors['success']
                    ))
                    self.root.after(0, lambda: self.log_message("Google Drive: Conexão realizada com sucesso!", "SUCCESS"))
                else:
                    self.root.after(0, lambda: self.google_status_label.config(
                        text="❌ Falhou", fg=self.colors['error']
                    ))
                    self.root.after(0, lambda: self.log_message("Google Drive: Falha na conexão. Verifique as credenciais e o arquivo credentials.json.", "ERROR"))
                
            except Exception as e:
                self.root.after(0, lambda: self.log_message(f"Erro ao testar logins: {e}", "ERROR"))
                self.root.after(0, lambda: self.freepik_status_label.config(
                    text="❌ Erro", fg=self.colors['error']
                ))
                self.root.after(0, lambda: self.envato_status_label.config(
                    text="❌ Erro", fg=self.colors['error']
                ))
                self.root.after(0, lambda: self.google_status_label.config(
                    text="❌ Erro", fg=self.colors['error']
                ))
        
        # Executar teste em thread separada para não travar a UI
        threading.Thread(target=test_in_thread, daemon=True).start()
    
    def add_links(self):
        """Adiciona links à fila"""
        links_text = self.links_text.get("1.0", tk.END).strip()
        links = [l.strip() for l in links_text.splitlines() if l.strip()]
        valid_links = [l for l in links if 'freepik.com' in l.lower() or 'envato.com' in l.lower()]
        
        if valid_links:
            for link in valid_links:
                job_queue.put(link)
                self.job_list_items.append(f"⏳ {link}")
            
            self.update_job_list()
            self.links_text.delete("1.0", tk.END)
            self.log_message(f"{len(valid_links)} link(s) adicionado(s) à fila", "SUCCESS")
        else:
            self.log_message("Nenhum link válido encontrado. Use links do Freepik ou Envato.", "WARNING")
            if links:
                messagebox.showwarning("Links Inválidos", "Nenhum link válido encontrado.\nUse links do Freepik.com ou Elements.envato.com")
    
    def clear_links(self):
        """Limpa a área de links"""
        self.links_text.delete("1.0", tk.END)
    
    def update_job_list(self):
        """Atualiza a lista de jobs"""
        self.job_listbox.delete(0, tk.END)
        for item in self.job_list_items:
            self.job_listbox.insert(tk.END, item)
        self.queue_count_label.config(text=f"Jobs na fila: {len(self.job_list_items)}")
    
    def start_worker(self):
        """Inicia o worker"""
        global worker_thread, worker_running
        
        if not worker_thread or not worker_thread.is_alive():
            if not backend_available:
                self.log_message("Não é possível iniciar: Backend não disponível", "ERROR")
                messagebox.showerror("Erro", "Backend não disponível!\nVerifique as configurações.")
            else:
                worker_running = True
                worker_thread = threading.Thread(target=self.worker_loop, daemon=True)
                worker_thread.start()
                self.worker_status_indicator.config(fg=self.colors['success'])
                self.worker_status_text.config(text="Rodando")
                self.log_message("Worker iniciado", "SUCCESS")
        else:
            self.log_message("Worker já está rodando", "WARNING")
    
    def stop_worker(self):
        """Para o worker"""
        global worker_running, worker_thread
        
        if worker_thread and worker_thread.is_alive():
            worker_running = False
            job_queue.put(None)
            worker_thread.join(timeout=2)
            self.worker_status_indicator.config(fg=self.colors['error'])
            self.worker_status_text.config(text="Parado")
            self.log_message("Worker parado", "INFO")
        else:
            self.log_message("Worker não está rodando", "WARNING")
    
    def clear_queue(self):
        """Limpa a fila de jobs"""
        while not job_queue.empty():
            try:
                job_queue.get_nowait()
            except:
                pass
        self.job_list_items.clear()
        self.update_job_list()
        self.log_message("Fila limpa", "INFO")
    
    def clear_logs(self):
        """Limpa os logs"""
        self.log_text.config(state=tk.NORMAL)
        self.log_text.delete("1.0", tk.END)
        self.log_text.config(state=tk.DISABLED)
        self.log_message("Logs limpos", "INFO")
    
    def process_job(self, job):
        """Processa um job (download)"""
        if not backend_available:
            return {"status": "error", "result": f"Backend não disponível: {backend_error}"}
        
        try:
            res = asyncio.run(backend_app.process_download_and_upload(job, telegram_message=None))
            
            if res:
                if isinstance(res, str) and res.startswith('http'):
                    return {"status": "done", "result": f"Link do Drive: {res}"}
                elif os.path.exists(res):
                    return {"status": "done", "result": f"Arquivo salvo em: {res}"}
                else:
                    return {"status": "done", "result": "Processado com sucesso"}
            else:
                return {"status": "error", "result": "Falha ao processar"}
        except Exception as e:
            return {"status": "error", "result": str(e)}

    def worker_loop(self):
        """Loop do worker que processa jobs da fila"""
        global worker_running
        
        while worker_running:
            try:
                job = job_queue.get(timeout=1)
                if job is None:
                    break
                
                # Atualiza UI
                self.root.after(0, self.update_job_status, job, "processing")
                self.root.after(0, self.log_message, f"Processando: {job}", "INFO")
                
                try:
                    res = self.process_job(job)
                    self.root.after(0, self.job_completed, job, res)
                except Exception as e:
                    self.root.after(0, self.job_error, job, str(e))
                
                job_queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                self.root.after(0, self.log_message, f"Erro no worker: {e}", "ERROR")
        
        worker_running = False
        self.root.after(0, lambda: self.worker_status_indicator.config(fg=self.colors['error']))
        self.root.after(0, lambda: self.worker_status_text.config(text="Parado"))
    
    def update_job_status(self, job, status):
        """Atualiza o status de um job na lista"""
        for i, item in enumerate(self.job_list_items):
            if job in item:
                if status == "processing":
                    self.job_list_items[i] = f"🔄 {job}"
                break
        self.update_job_list()
    
    def job_completed(self, job, res):
        """Chamado quando um job é concluído"""
        # Remove da lista
        self.job_list_items = [item for item in self.job_list_items if job not in item]
        self.update_job_list()
        
        if res.get('status') == 'done':
            self.log_message(f"✅ Concluído: {job}", "SUCCESS")
            if res.get('result'):
                self.log_message(f"   Resultado: {res['result']}", "INFO")
        else:
            self.log_message(f"❌ Erro: {job}", "ERROR")
            if res.get('result'):
                self.log_message(f"   Detalhes: {res['result']}", "ERROR")
    
    def job_error(self, job, err):
        """Chamado quando um job tem erro"""
        self.job_list_items = [item for item in self.job_list_items if job not in item]
        self.update_job_list()
        self.log_message(f"❌ Erro ao processar: {job}", "ERROR")
        self.log_message(f"   Detalhes: {err}", "ERROR")
    
    def update_status(self):
        """Atualiza o status periodicamente"""
        self.last_update_label.config(text=f"Última atualização: {self.format_timestamp()}")
        self.root.after(1000, self.update_status)
    
    def on_closing(self):
        """Chamado quando a janela é fechada"""
        global worker_running, worker_thread
        
        if worker_thread and worker_thread.is_alive():
            worker_running = False
            job_queue.put(None)
            worker_thread.join(timeout=2)
        
        self.root.destroy()

def main():
    root = tk.Tk()
    app = AutomationBotGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
