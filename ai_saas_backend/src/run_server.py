from waitress import serve
from main import app  # importa seu Flask app

if __name__ == "__main__":
    import sys
    port = 8000
    sys.stdout.flush()
    sys.stderr.flush()
    print("", flush=True)
    print(f"  Backend rodando em http://0.0.0.0:{port}", flush=True)
    print(f"  Ctrl+C para parar.", flush=True)
    print("", flush=True)
    sys.stdout.flush()
    # Serve em 0.0.0.0 para aceitar conexões externas
    serve(app, host="0.0.0.0", port=port)
