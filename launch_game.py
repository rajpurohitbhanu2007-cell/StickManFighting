import http.server
import socketserver
import webbrowser
import threading
import time
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

class ThreadedHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

def open_browser():
    time.sleep(0.8)
    webbrowser.open(f"http://localhost:{PORT}/index.html")

if __name__ == '__main__':
    with ThreadedHTTPServer(("", PORT), Handler) as httpd:
        print(f"==================================================")
        print(f"  STICK CLASH: STAT OVERLOAD is running!")
        print(f"  URL: http://localhost:{PORT}/index.html")
        print(f"  Opening browser automatically...")
        print(f"  Press Ctrl+C to stop the local server.")
        print(f"==================================================")
        threading.Thread(target=open_browser, daemon=True).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
