import os
import sys
import threading
import socket
import socketserver
import http.server
import time
import webview

DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def get_free_port():
    """Dynamically get an available port so it never conflicts or fails"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        pass

class ThreadedHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

def run_server(port):
    with ThreadedHTTPServer(('127.0.0.1', port), QuietHandler) as httpd:
        httpd.serve_forever()

class WindowBridge:
    def __init__(self, window):
        self.window = window

    def toggle_fullscreen(self):
        self.window.toggle_fullscreen()

def main():
    port = get_free_port()

    # Start HTTP daemon thread
    server_thread = threading.Thread(target=run_server, args=(port,), daemon=True)
    server_thread.start()

    # Brief wait for socket bind
    time.sleep(0.2)

    url = f"http://127.0.0.1:{port}/index.html"
    print(f"Starting STICK CLASH on {url}")

    window = webview.create_window(
        title='STICK CLASH: STAT OVERLOAD',
        url=url,
        width=1280,
        height=720,
        min_size=(960, 540),
        background_color='#030712',
        resizable=True,
        fullscreen=False
    )

    bridge = WindowBridge(window)
    window.expose(bridge.toggle_fullscreen)

    webview.start()

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        import traceback
        with open(os.path.join(DIRECTORY, 'desktop_crash.log'), 'w', encoding='utf-8') as f:
            traceback.print_exc(file=f)
        print("Application error:")
        traceback.print_exc()
        input("\nPress Enter to exit...")
