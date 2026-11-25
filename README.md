# NFA to DFA Conversion Simulator & Verification Workbench
## Automata Theory & Computability (ATC) — Classic Benchmark Suite

An interactive web-based simulator and mathematical engine for **Normal Nondeterministic Finite Automata (NFA) to Deterministic Finite Automata (DFA) conversion** via the canonical **Rabin-Scott Powerset (Subset) Construction Algorithm**.

---

### 🌟 Key Features
1. **Rabin-Scott Powerset Construction:** Full support for Normal NFAs (without $\epsilon$-transitions). Generates canonical DFA states ($D_0, D_1, \dots$) with explicit subset mappings.
2. **Dual Execution Engine:**
   - **Full-Stack Mode:** Python multi-threaded REST backend (`server.py`) powered by `automata.py`.
   - **Zero-Install Offline Mode:** Complete client-side JavaScript engine running natively in any modern browser (`index.html`).
3. **Interactive Vector SVG Digraphs:** Draggable nodes, dynamic quadratic Bézier curves for bidirectional edges, self-loops, and concentric double rings for accept states.
4. **Step-by-Step Educational Stepper:** Visual forward/backward stepping with discovery logs and worklist queue inspection.
5. **Deterministic String Simulation Workbench:** Character-by-character tape-head animation with active state highlights and instant ACCEPT / REJECT verdicts.
6. **Classic Academic Benchmarks:** Pre-loaded with 6 textbook automata models and automated verification suite (100% test pass).

---

### 📂 Repository Structure
```
automata_simulator_python/
├── README.md                     # Repository landing page
├── .gitignore                    # Excludes PDFs, caches, and temp files
├── run_demo.bat                  # Root one-click launcher
└── automata_simulator/
    ├── index.html                # Modern glassmorphism web UI
    ├── styles.css                # Dark-mode responsive styling
    ├── server.py                 # Multi-threaded Python backend REST API
    ├── automata.py               # Core NFA & DFA engine with powerset construction
    ├── presets.py                # Classic academic benchmark automata presets
    ├── test_automata.py          # Automated verification test suite (100% pass)
    ├── run_demo.bat              # Local directory runner script
    └── js/
        ├── renderer.js           # Vector SVG graph visualizer with draggable physics
        └── app.js                # UI coordinator, offline engine & simulation controller
```

---

### 🚀 Quick Start

#### 1. Quick Launch (Windows)
Double-click `run_demo.bat` in the repository root.

#### 2. Python Backend Server
```powershell
cd automata_simulator
python server.py
```
Open your browser and navigate to:
```
http://localhost:8001
```

#### 3. Zero-Install Standalone Mode
Double-click `automata_simulator/index.html` to open directly in Google Chrome, Microsoft Edge, Firefox, or Safari.

#### 4. Run Automated Test Suite
```powershell
cd automata_simulator
python test_automata.py
```

---

### 📚 Curated Classic Benchmarks Included
1. **Ends with '01'** ($\Sigma = \{0, 1\}$, 3 NFA states $\to$ 3 DFA states)
2. **Contains substring '11'** ($\Sigma = \{0, 1\}$, 3 NFA states $\to$ 4 DFA states)
3. **Contains substring 'aa'** ($\Sigma = \{a, b\}$, 3 NFA states $\to$ 4 DFA states)
4. **Compiler Lexical Token: $(a|b)^*abb$** ($\Sigma = \{a, b\}$, 4 NFA states $\to$ 4 DFA states)
5. **Powerset Explosion: 3rd symbol from end is 1** ($\Sigma = \{0, 1\}$, 4 NFA states $\to$ 8 DFA states)
6. **Contains substring '00'** ($\Sigma = \{0, 1\}$, 3 NFA states $\to$ 4 DFA states)
