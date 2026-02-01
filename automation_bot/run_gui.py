#!/usr/bin/env python3
"""
Script para executar a interface gráfica do Automation Bot
Execute este arquivo para iniciar a GUI

Uso:
    python run_gui.py
"""

import sys
import os

# Adiciona o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    try:
        # Importa e executa o app
        from frontend import app
        # O código do app já está no nível do módulo, então não precisa fazer nada mais
    except Exception as e:
        print(f"Erro ao iniciar a aplicação: {e}")
        print("\nCertifique-se de que:")
        print("1. Todas as dependências estão instaladas:")
        print("   pip install -r backend/requirements.txt")
        print("2. Você está executando a partir da raiz do projeto")
        print("3. O arquivo .env está configurado corretamente (opcional)")
        import traceback
        traceback.print_exc()
        sys.exit(1)

