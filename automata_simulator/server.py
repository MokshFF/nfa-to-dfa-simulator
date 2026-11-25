"""
AUTOMATA SIMULATOR PYTHON BACKEND SERVER
Serves the web application and executes NFA/DFA algorithms in Python.
Endpoints:
  GET  /api/presets   - Retrieve curated benchmark automata
  POST /api/validate  - Validate NFA consistency
  POST /api/convert   - Convert Normal NFA to DFA via Rabin-Scott subset construction
  POST /api/simulate  - Deterministically simulate an input string on DFA
"""

import sys
import json
import os
import socket
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
if DIRECTORY not in sys.path:
    sys.path.insert(0, DIRECTORY)

from automata import NFA, DFA, SubsetConstructor
from presets import BENCHMARK_PRESETS

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

PORT = int(os.environ.get("PORT", 8000))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class AutomataRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _send_json(self, status_code: int, data: dict):
        response_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/presets":
            # Map presets for frontend
            presets_payload = {}
            for k, p in BENCHMARK_PRESETS.items():
                presets_payload[k] = {
                    "id": p.get("id", k),
                    "name": p.get("name", k),
                    "description": p.get("description", ""),
                    "states": p.get("states", []),
                    "alphabet": p.get("alphabet", []),
                    "startState": p.get("start_state", ""),
                    "acceptStates": p.get("accept_states", []),
                    "transitions": p.get("transitions", {}),
                    "sampleStrings": p.get("sample_strings", []),
                }
            self._send_json(200, presets_payload)
            return

        # Fallback to static file serving
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            body = json.loads(raw_body.decode("utf-8")) if raw_body else {}
        except Exception as e:
            self._send_json(400, {"success": False, "error": f"Invalid JSON payload: {str(e)}"})
            return

        # 1. Validation endpoint
        if parsed.path == "/api/validate":
            states = body.get("states", [])
            alphabet = body.get("alphabet", [])
            transitions = body.get("transitions", {})
            start_state = body.get("startState") or body.get("start_state", "")
            accept_states = body.get("acceptStates") or body.get("accept_states", [])

            nfa = NFA(states, alphabet, transitions, start_state, accept_states)
            is_valid, errors = nfa.validate()
            self._send_json(200, {"isValid": is_valid, "errors": errors})
            return

        # 2. Conversion endpoint
        elif parsed.path == "/api/convert":
            states = body.get("states", [])
            alphabet = body.get("alphabet", [])
            transitions = body.get("transitions", {})
            start_state = body.get("startState") or body.get("start_state", "")
            accept_states = body.get("acceptStates") or body.get("accept_states", [])

            try:
                nfa = NFA(states, alphabet, transitions, start_state, accept_states)
                dfa, raw_steps = SubsetConstructor.convert(nfa)

                # Format steps for JSON serialization
                serialized_steps = []
                for step in raw_steps:
                    step_copy = dict(step)
                    if "dfa" in step_copy and hasattr(step_copy["dfa"], "to_dict"):
                        step_copy["dfa"] = step_copy["dfa"].to_dict()
                    serialized_steps.append(step_copy)

                self._send_json(200, {
                    "success": True,
                    "dfa": dfa.to_dict(),
                    "steps": serialized_steps,
                })
            except Exception as e:
                self._send_json(400, {"success": False, "error": str(e)})
            return

        # 3. String Simulation endpoint
        elif parsed.path == "/api/simulate":
            dfa_data = body.get("dfa") or {}
            input_string = body.get("inputString", "")

            try:
                dfa = DFA(
                    states=dfa_data.get("states", []),
                    alphabet=dfa_data.get("alphabet", []),
                    transitions=dfa_data.get("transitions", {}),
                    start_state=dfa_data.get("startState") or dfa_data.get("start_state", ""),
                    accept_states=dfa_data.get("acceptStates") or dfa_data.get("accept_states", []),
                    subset_mapping=dfa_data.get("subsetMapping") or dfa_data.get("subset_mapping", {}),
                )
                result = dfa.simulate_string(input_string)
                self._send_json(200, {"success": True, "result": result})
            except Exception as e:
                self._send_json(400, {"success": False, "error": str(e)})
            return

        self._send_json(404, {"error": "API route not found"})


def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.connect(("127.0.0.1", port))
            return True
        except (ConnectionRefusedError, OSError):
            pass
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("127.0.0.1", port))
            return False
        except OSError:
            return True


def find_available_port(start_port: int = PORT) -> int:
    for p in range(start_port, start_port + 50):
        if not is_port_in_use(p):
            return p
    return start_port


class ReusableThreadingServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def run_server():
    port = find_available_port(PORT)
    server_address = ("127.0.0.1", port)
    ReusableThreadingServer.allow_reuse_address = True
    httpd = ReusableThreadingServer(server_address, AutomataRequestHandler)
    print("=" * 65)
    print("  PYTHON AUTOMATA BACKEND SERVER STARTED SUCCESSFULLY")
    print(f"  Access UI at: http://localhost:{port}")
    print("  API Endpoints:")
    print("   - GET  /api/presets")
    print("   - POST /api/validate")
    print("   - POST /api/convert")
    print("   - POST /api/simulate")
    print("=" * 65)
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
