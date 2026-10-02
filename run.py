import sys
import socket

# Ensure UTF-8 output encoding on Windows consoles
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import uvicorn

def get_local_ip():
    """Finds local network IP for mobile device access."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    local_ip = get_local_ip()
    port = 8000

    print("=" * 65)
    print(">> TubeLoad - Premium YouTube Video & Audio Downloader")
    print("=" * 65)
    print(f"[*] On this PC open:         http://localhost:{port}")
    print(f"[*] On Mobile Phone/Tablet:  http://{local_ip}:{port}")
    print("=" * 65)
    print("Press CTRL+C anytime to stop the server.\n")

    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
