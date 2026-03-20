#!/usr/bin/env python3
"""Start the Pokopia Group Planner locally and open it in a browser."""

from __future__ import annotations

import argparse
import functools
import http.server
import socketserver
import threading
import webbrowser
from pathlib import Path


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the Pokopia Group Planner locally and open it in your browser.",
    )
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind. Default: 127.0.0.1")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind. Default: 8000")
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Start the server without trying to open a browser automatically.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo_root = Path(__file__).resolve().parent
    url = f"http://{args.host}:{args.port}"

    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(repo_root))

    with ReusableTCPServer((args.host, args.port), handler) as httpd:
        httpd_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        httpd_thread.start()

        print("Pokopia Group Planner is running.")
        print(f"Folder: {repo_root}")
        print(f"Open:   {url}")
        print("Press Ctrl+C to stop the server.")

        if not args.no_open:
            webbrowser.open(url)

        try:
            httpd_thread.join()
        except KeyboardInterrupt:
            print("\nStopping server...")
            httpd.shutdown()


if __name__ == "__main__":
    main()
