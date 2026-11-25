# NFA to DFA Conversion Simulator
## Automata Theory & Computability — Classic Benchmark Suite

---

### Project Overview
- **Topic:** Normal NFA to DFA Conversion (Subset / Powerset Construction, Transition Matrices, Generated DFA States, and Interactive String Simulation)
- **Features:**
  1. Full support for **Normal NFAs** via canonical Rabin-Scott powerset subset construction.
  2. Curated **Classic Academic Benchmarks** for testing and demonstration.
  3. Real-time synchronized transition tables and interactive SVG vector graphs.
  4. Step-by-step educational stepper with play/pause and progress tracking.
  5. Deterministic string simulator with animated tape head and batch verification.

---

### 📂 Repository Structure
```
automata_simulator_python/
├── run_demo.bat                  # One-click launcher script
└── automata_simulator/
    ├── index.html                # Modern glassmorphism web UI
    ├── styles.css                # Dark-mode styling with responsive layouts
    ├── server.py                 # Python backend HTTP server & REST API
    ├── automata.py               # Core Normal NFA & DFA engine with powerset construction
    ├── presets.py                # Classic benchmark presets with sample strings
    ├── test_automata.py          # Automated verification test suite (100% pass)
    ├── run_demo.bat              # Local runner script
    └── js/
        ├── renderer.js           # SVG graph visualizer with draggable nodes & Bézier curves
        └── app.js                # UI coordinator with client-side engine & offline fallback
```

---

### 🚀 How to Run the Simulator

#### Option 1: Quick Launch via Batch Script
Double-click `run_demo.bat` in the project root or inside `automata_simulator/`.

#### Option 2: Python HTTP Server (Recommended)
```powershell
cd automata_simulator
python server.py
```
Open your browser and navigate to:
```
http://localhost:8000
```

#### Option 3: Standalone Offline Mode (Zero Installation)
Simply open `automata_simulator/index.html` directly in any modern browser (Chrome, Edge, Firefox, Safari). The simulator includes a complete, self-contained client-side engine.

#### Option 4: Run Verification Tests (CLI)
```powershell
cd automata_simulator
python test_automata.py
```

---

### 📚 Classic Academic Benchmarks Included
1. **Classic Benchmark: Ends with '01'** ($\Sigma = \{0, 1\}$, 3 NFA states $\to$ 3 DFA states)
2. **Classic Benchmark: Contains substring 'aa'** ($\Sigma = \{a, b\}$, 3 NFA states $\to$ 4 DFA states)
3. **Compiler Lexical Pattern: $(a|b)^*abb$** ($\Sigma = \{a, b\}$, 4 NFA states $\to$ 4 DFA states)
4. **Powerset Explosion: 3rd symbol from end is 1** ($\Sigma = \{0, 1\}$, 4 NFA states $\to$ 8 DFA states)
5. **Classic Benchmark: Contains substring '00'** ($\Sigma = \{0, 1\}$, 3 NFA states $\to$ 4 DFA states)
