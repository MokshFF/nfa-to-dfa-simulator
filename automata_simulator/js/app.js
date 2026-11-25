/**
 * AUTOMATA SIMULATOR - APPLICATION COORDINATOR & UI CONTROLLER
 * Full support for Normal NFAs.
 * Features:
 *  - Dual execution modes: Instant offline browser execution & Python backend (server.py)
 *  - Rabin-Scott powerset subset construction
 *  - Standard academic benchmark automata
 *  - Real-time transition matrix synchronization with SVG vector graph
 *  - Interactive step-by-step construction stepper & animated tape string tester
 */

// Curated Classic Benchmark Automata (matching presets.py)
const DEFAULT_FALLBACK_PRESETS = {
    contains_11: {
        id: 'contains_11',
        name: "Contains substring '11'",
        description: "Standard NFA accepting strings containing '11' over alphabet {0, 1}. Evaluates non-deterministic branch on symbol 1. Converts to 4-state DFA.",
        states: ['p0', 'p1', 'p2'],
        alphabet: ['0', '1'],
        startState: 'p0',
        acceptStates: ['p2'],
        transitions: {
            'p0': { '0': ['p0'], '1': ['p0', 'p1'] },
            'p1': { '0': [], '1': ['p2'] },
            'p2': { '0': ['p2'], '1': ['p2'] }
        },
        sampleStrings: [
            { text: '11', expect: true, note: "Minimal match '11'" },
            { text: '0110', expect: true, note: "Contains '11' in middle" },
            { text: '111', expect: true, note: "Overlapping '11'" },
            { text: '10101', expect: false, note: "Alternating bits without '11'" },
            { text: '0000', expect: false, note: "Zero occurrences of '1'" }
        ]
    },
    ends_with_01: {
        id: 'ends_with_01',
        name: "Ends with '01'",
        description: "Evaluates non-deterministic branch on symbol 0 over alphabet {0, 1}.",
        states: ['q0', 'q1', 'q2'],
        alphabet: ['0', '1'],
        startState: 'q0',
        acceptStates: ['q2'],
        transitions: {
            'q0': { '0': ['q0', 'q1'], '1': ['q0'] },
            'q1': { '0': [], '1': ['q2'] },
            'q2': { '0': [], '1': [] }
        },
        sampleStrings: [
            { text: '01', expect: true, note: 'Minimal accept string' },
            { text: '1001', expect: true, note: 'Ends with 01' },
            { text: '1010', expect: false, note: 'Ends with 10' },
            { text: '0000', expect: false, note: 'Does not end with 1' }
        ]
    },
    contains_aa: {
        id: 'contains_aa',
        name: "Contains substring 'aa'",
        description: "Standard NFA detecting substring 'aa' anywhere within a string over alphabet {a, b}.",
        states: ['q0', 'q1', 'q2'],
        alphabet: ['a', 'b'],
        startState: 'q0',
        acceptStates: ['q2'],
        transitions: {
            'q0': { 'a': ['q0', 'q1'], 'b': ['q0'] },
            'q1': { 'a': ['q2'], 'b': [] },
            'q2': { 'a': ['q2'], 'b': ['q2'] }
        },
        sampleStrings: [
            { text: 'aa', expect: true, note: 'Exact pattern match' },
            { text: 'baaab', expect: true, note: 'Contains aa internally' },
            { text: 'ababa', expect: false, note: 'Alternating without aa' },
            { text: 'bbbb', expect: false, note: 'Zero occurrences of a' }
        ]
    },
    ends_with_abb: {
        id: 'ends_with_abb',
        name: "Pattern: (a|b)*abb",
        description: "Standard compiler lexical token benchmark. Converts into an optimal 4-state DFA.",
        states: ['0', '1', '2', '3'],
        alphabet: ['a', 'b'],
        startState: '0',
        acceptStates: ['3'],
        transitions: {
            '0': { 'a': ['0', '1'], 'b': ['0'] },
            '1': { 'a': [], 'b': ['2'] },
            '2': { 'a': [], 'b': ['3'] },
            '3': { 'a': [], 'b': [] }
        },
        sampleStrings: [
            { text: 'abb', expect: true, note: 'Minimal accept' },
            { text: 'ababb', expect: true, note: 'Prefix followed by abb' },
            { text: 'abba', expect: false, note: 'Ends with a, not b' },
            { text: 'ab', expect: false, note: 'Incomplete' }
        ]
    },
    powerset_explosion: {
        id: 'powerset_explosion',
        name: 'Powerset Explosion: 3rd symbol from end is 1',
        description: 'Standard 4-state NFA generates 2^3 = 8 reachable DFA states.',
        states: ['q0', 'q1', 'q2', 'q3'],
        alphabet: ['0', '1'],
        startState: 'q0',
        acceptStates: ['q3'],
        transitions: {
            'q0': { '0': ['q0'], '1': ['q0', 'q1'] },
            'q1': { '0': ['q2'], '1': ['q2'] },
            'q2': { '0': ['q3'], '1': ['q3'] },
            'q3': { '0': [], '1': [] }
        },
        sampleStrings: [
            { text: '100', expect: true, note: '1 is 3rd from end' },
            { text: '111', expect: true, note: '1 is 3rd from end' },
            { text: '010', expect: false, note: '0 is 3rd from end' },
            { text: '11', expect: false, note: 'Length < 3' }
        ]
    },
    contains_00: {
        id: 'contains_00',
        name: "Contains substring '00'",
        description: 'NFA over {0, 1} that branches non-deterministically upon encountering the first zero.',
        states: ['A', 'B', 'C'],
        alphabet: ['0', '1'],
        startState: 'A',
        acceptStates: ['C'],
        transitions: {
            'A': { '0': ['A', 'B'], '1': ['A'] },
            'B': { '0': ['C'], '1': [] },
            'C': { '0': ['C'], '1': ['C'] }
        },
        sampleStrings: [
            { text: '00', expect: true, note: 'Minimal accept' },
            { text: '1001', expect: true, note: 'Contains 00 in middle' },
            { text: '01010', expect: false, note: 'Alternating bits' },
            { text: '1111', expect: false, note: 'Zero 0s' }
        ]
    }
};

// Helper: Natural sort comparator for states like ['s1', 's2', 's10']
function naturalSort(arr) {
    return arr.slice().sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
}

/**
 * Client-Side Automata Engine (Pure JavaScript Rabin-Scott Powerset Constructor for Normal NFAs)
 * Ensures 100% reliable offline/standalone execution without requiring a server
 */
class AutomataEngine {
    static validate(nfaData) {
        const errors = [];
        const states = nfaData.states || [];
        const alphabet = nfaData.alphabet || [];
        const startState = (nfaData.startState || nfaData.start_state || '').trim();
        const acceptStates = nfaData.acceptStates || nfaData.accept_states || [];
        const transitions = nfaData.transitions || {};

        if (!startState) errors.push("Start state is not defined.");
        if (startState && !states.includes(startState)) errors.push(`Start state "${startState}" is not in states set.`);
        if (states.length === 0) errors.push("States set is empty.");
        if (alphabet.length === 0) errors.push("Alphabet Σ is empty.");

        for (const [s, symMap] of Object.entries(transitions)) {
            if (!states.includes(s)) errors.push(`State "${s}" in transitions is not in states.`);
            for (const [sym, targets] of Object.entries(symMap || {})) {
                if (!alphabet.includes(sym)) {
                    errors.push(`Symbol "${sym}" is not in alphabet Σ.`);
                }
                for (const t of (targets || [])) {
                    if (!states.includes(t)) errors.push(`Target "${t}" from (${s}, ${sym}) is not in states.`);
                }
            }
        }
        return { isValid: errors.length === 0, errors };
    }

    static move(statesSubset, symbol, transitions) {
        const res = new Set();
        for (const s of statesSubset) {
            const currTrans = transitions[s] || {};
            const targets = currTrans[symbol] || [];
            for (const t of targets) res.add(t);
        }
        return naturalSort(Array.from(res));
    }

    static convert(nfaData) {
        const states = nfaData.states || [];
        const alphabet = nfaData.alphabet || [];
        const startState = (nfaData.startState || nfaData.start_state || '').trim();
        const acceptStates = nfaData.acceptStates || nfaData.accept_states || [];
        const transitions = nfaData.transitions || {};

        const subsetKey = (arr) => naturalSort(arr).join(',');

        // Initial DFA State: D0 = {q0}
        const initialSubset = [startState];
        const initialKey = subsetKey(initialSubset);

        let stateCounter = 0;
        const subsetToName = new Map();
        const nameToSubset = {};
        const dfaTransitions = {};
        const dfaStates = [];
        const dfaAcceptStates = [];

        const startName = `D${stateCounter++}`;
        subsetToName.set(initialKey, startName);
        nameToSubset[startName] = initialSubset;
        dfaStates.push(startName);
        dfaTransitions[startName] = {};

        if (initialSubset.some(s => acceptStates.includes(s))) {
            dfaAcceptStates.push(startName);
        }

        const queue = [startName];
        const steps = [];

        steps.push({
            type: "INIT",
            title: `Initialized Start State ${startName}`,
            detail: `Started with initial DFA state ${startName} = { ${initialSubset.join(', ')} }.`,
            state: startName,
            subset: initialSubset,
            isStart: true,
            isAccept: dfaAcceptStates.includes(startName)
        });

        while (queue.length > 0) {
            const currName = queue.shift();
            const currSubset = nameToSubset[currName];

            steps.push({
                type: "EXPLORING_STATE",
                title: `Processing DFA State ${currName}`,
                detail: `Expanding transitions for ${currName} = { ${currSubset.join(', ')} } across alphabet Σ = {${alphabet.join(', ')}}.`,
                state: currName,
                subset: currSubset
            });

            for (const sym of alphabet) {
                const targetSubset = AutomataEngine.move(currSubset, sym, transitions);
                const tKey = subsetKey(targetSubset);

                let targetName = "";
                let isNew = false;

                if (targetSubset.length === 0) {
                    // Total transition: Dead / Trap state
                    if (!subsetToName.has("")) {
                        const trapName = "Trap";
                        subsetToName.set("", trapName);
                        nameToSubset[trapName] = [];
                        dfaStates.push(trapName);
                        dfaTransitions[trapName] = {};
                        for (const a of alphabet) dfaTransitions[trapName][a] = trapName;
                    }
                    targetName = subsetToName.get("");
                } else {
                    if (!subsetToName.has(tKey)) {
                        targetName = `D${stateCounter++}`;
                        subsetToName.set(tKey, targetName);
                        nameToSubset[targetName] = targetSubset;
                        dfaStates.push(targetName);
                        dfaTransitions[targetName] = {};

                        if (targetSubset.some(s => acceptStates.includes(s))) {
                            dfaAcceptStates.push(targetName);
                        }
                        queue.push(targetName);
                        isNew = true;
                    } else {
                        targetName = subsetToName.get(tKey);
                    }
                }

                dfaTransitions[currName][sym] = targetName;

                steps.push({
                    type: "TRANSITION_COMPUTED",
                    title: `Transition: ${currName} on '${sym}' → ${targetName}`,
                    detail: `δ(${currName}, '${sym}') = Move({${currSubset.join(', ')}}, '${sym}') = { ${targetSubset.length ? targetSubset.join(', ') : '∅'} } → ${targetName} ${isNew ? '(NEW STATE DISCOVERED!)' : '(Existing)'}`,
                    fromState: currName,
                    fromSubset: currSubset,
                    symbol: sym,
                    targetState: targetName,
                    targetSubset: targetSubset,
                    isNewTarget: isNew,
                    isTargetAccept: dfaAcceptStates.includes(targetName)
                });
            }
        }

        const finalDFA = {
            states: dfaStates,
            alphabet: [...alphabet],
            transitions: dfaTransitions,
            startState: startName,
            start_state: startName,
            acceptStates: dfaAcceptStates,
            accept_states: dfaAcceptStates,
            subsetMapping: nameToSubset,
            subset_mapping: nameToSubset
        };

        steps.push({
            type: "COMPLETE",
            title: "Subset Construction Complete!",
            detail: `Generated equivalent DFA with ${dfaStates.length} states (${dfaAcceptStates.length} accept states).`,
            dfa: finalDFA
        });

        return { success: true, dfa: finalDFA, steps };
    }

    static simulate(dfaData, inputString) {
        const dfa = dfaData;
        const history = [];
        let currentState = dfa.startState || dfa.start_state;

        const getConstituent = (st) => (dfa.subsetMapping || dfa.subset_mapping || {})[st] || [];
        const isAccept = (st) => (dfa.acceptStates || dfa.accept_states || []).includes(st);

        history.push({
            step: 0,
            char: null,
            state: currentState,
            subset: getConstituent(currentState),
            is_accept: isAccept(currentState),
            isAccept: isAccept(currentState),
            description: `Start at initial DFA state ${currentState} = { ${getConstituent(currentState).join(', ')} }`
        });

        for (let i = 0; i < inputString.length; i++) {
            const char = inputString[i];
            if (!dfa.alphabet.includes(char)) {
                return {
                    accepted: false,
                    history,
                    error: `Character '${char}' at index ${i} is not in alphabet Σ = {${dfa.alphabet.join(', ')}}`,
                    finalState: currentState
                };
            }

            const currTrans = (dfa.transitions || {})[currentState] || {};
            const nextState = currTrans[char];

            if (!nextState) {
                history.push({
                    step: i + 1,
                    char,
                    state: null,
                    subset: [],
                    is_accept: false,
                    isAccept: false,
                    description: `No transition defined from ${currentState} on '${char}' -> Trap`
                });
                return {
                    accepted: false,
                    history,
                    finalState: null,
                    reason: `Halted in undefined transition on symbol '${char}'`
                };
            }

            currentState = nextState;
            const acc = isAccept(currentState);
            history.push({
                step: i + 1,
                char,
                state: currentState,
                subset: getConstituent(currentState),
                is_accept: acc,
                isAccept: acc,
                description: `Read '${char}' -> Transition to ${currentState} = { ${getConstituent(currentState).join(', ')} }`
            });
        }

        const accepted = isAccept(currentState);
        const sub = getConstituent(currentState);
        const reason = accepted
            ? `String accepted in final state ${currentState} ({ ${sub.join(', ')} })`
            : `String rejected in non-accept state ${currentState} ({ ${sub.length ? sub.join(', ') : '∅'} })`;

        return {
            accepted,
            history,
            finalState: currentState,
            reason
        };
    }
}

// Unified API Wrapper (Uses Python backend if accessible, smoothly falls back to JS engine)
const API = {
    async getPresets() {
        try {
            const res = await fetch('/api/presets', { signal: AbortSignal.timeout(1000) });
            if (res.ok) return await res.json();
        } catch (e) {}
        return DEFAULT_FALLBACK_PRESETS;
    },

    async validate(nfaData) {
        try {
            const res = await fetch('/api/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nfaData),
                signal: AbortSignal.timeout(2000)
            });
            if (res.ok) return await res.json();
        } catch (e) {}
        return AutomataEngine.validate(nfaData);
    },

    async convert(nfaData) {
        try {
            const res = await fetch('/api/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nfaData),
                signal: AbortSignal.timeout(3000)
            });
            if (res.ok) return await res.json();
        } catch (e) {}
        return AutomataEngine.convert(nfaData);
    },

    async simulate(dfa, inputString) {
        try {
            const res = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dfa, inputString }),
                signal: AbortSignal.timeout(2000)
            });
            if (res.ok) {
                const data = await res.json();
                return data.result;
            }
        } catch (e) {}
        return AutomataEngine.simulate(dfa, inputString);
    }
};

// UI Controller Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Graph Renderers
    const nfaRenderer = new AutomataGraphRenderer('nfa-graph-container', {
        themeColor: '#00f2fe',
        acceptColor: '#00f5a0'
    });
    const dfaRenderer = new AutomataGraphRenderer('dfa-graph-container', {
        themeColor: '#9b51e0',
        acceptColor: '#00f5a0'
    });

    // 2. Global State
    let currentNFA = null;
    let currentDFA = null;
    let conversionSteps = [];
    let currentStepIndex = -1;
    let isPlaying = false;
    let playInterval = null;
    let playSpeed = 700;
    let currentBatchTestCases = [];
    let stringSimResult = null;
    let stringSimStepIndex = 0;
    let stringSimInterval = null;
    let tableDebounceTimer = null;

    // 3. UI Element References
    const presetSelect = document.getElementById('preset-select');
    const nfaStatesInput = document.getElementById('nfa-states');
    const nfaAlphabetInput = document.getElementById('nfa-alphabet');
    const nfaStartInput = document.getElementById('nfa-start');
    const nfaAcceptInput = document.getElementById('nfa-accept');
    const btnUpdateNfa = document.getElementById('btn-update-nfa');

    const nfaTableContainer = document.getElementById('nfa-table-container');
    const dfaTableContainer = document.getElementById('dfa-table-container');

    const btnConvertFull = document.getElementById('btn-convert-full');
    const btnConvertStep = document.getElementById('btn-convert-step');
    const stepperControls = document.getElementById('stepper-controls');
    const btnStepPrev = document.getElementById('btn-step-prev');
    const btnStepPlay = document.getElementById('btn-step-play');
    const btnStepNext = document.getElementById('btn-step-next');
    const btnStepReset = document.getElementById('btn-step-reset');
    const stepSpeedSlider = document.getElementById('step-speed');
    const stepLogBox = document.getElementById('step-log-box');
    const stepProgressBar = document.getElementById('step-progress-bar');
    const stepCounterText = document.getElementById('step-counter-text');

    const testStringInput = document.getElementById('test-string-input');
    const btnRunString = document.getElementById('btn-run-string');
    const btnStepString = document.getElementById('btn-step-string');
    const btnAddToBatch = document.getElementById('btn-add-to-batch');
    const btnResetString = document.getElementById('btn-reset-string');
    const tapeContainer = document.getElementById('tape-container');
    const stringVerdictBanner = document.getElementById('string-verdict-banner');
    const stringLog = document.getElementById('string-log');

    const batchSuiteTitle = document.getElementById('batch-suite-title');
    const batchSuiteCount = document.getElementById('batch-suite-count');
    const batchTestsContainer = document.getElementById('batch-tests-container');
    const dfaStatsBadge = document.getElementById('dfa-stats-badge');

    // 4. Fetch & Populate Presets Dropdown
    let loadedPresets = await API.getPresets();
    if (!loadedPresets || Object.keys(loadedPresets).length === 0) {
        loadedPresets = DEFAULT_FALLBACK_PRESETS;
    }

    presetSelect.innerHTML = '';

    Object.keys(loadedPresets).forEach(key => {
        const p = loadedPresets[key];
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = p.name;
        presetSelect.appendChild(opt);
    });

    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = '✎ Custom Automaton (User Defined)';
    presetSelect.appendChild(customOpt);

    // Dropdown change listener
    presetSelect.addEventListener('change', async (e) => {
        if (e.target.value !== 'custom') {
            loadPreset(e.target.value);
        } else {
            // Activate Custom Automaton mode
            if (!currentNFA) {
                currentNFA = {
                    states: ['q0', 'q1', 'q2'],
                    alphabet: ['0', '1'],
                    startState: 'q0',
                    acceptStates: ['q2'],
                    transitions: {
                        'q0': { '0': ['q1'], '1': ['q0'] },
                        'q1': { '0': [], '1': ['q2'] },
                        'q2': { '0': [], '1': [] }
                    }
                };
            }
            presetSelect.value = 'custom';
            renderNFATable();
            nfaRenderer.setData(currentNFA.states, currentNFA.alphabet, currentNFA.transitions, currentNFA.startState, currentNFA.acceptStates);
            resetStepper();
            await executeFullConversion();
            clearStringTestUI();

            currentBatchTestCases = await generateSmartSuite(currentNFA.alphabet, currentDFA);
            renderBatchTestCases(currentBatchTestCases, 'Custom Automaton Test Suite');
        }
    });

    function getFormattedSubset(stateName) {
        if (!currentDFA || !currentDFA.subsetMapping) return `{ ${stateName} }`;
        const sub = currentDFA.subsetMapping[stateName] || [];
        if (sub.length === 0) return '∅ (Dead/Trap)';
        return `{ ${sub.join(', ')} }`;
    }

    function getConstituentSet(stateName) {
        return (currentDFA && currentDFA.subsetMapping && currentDFA.subsetMapping[stateName]) || [];
    }

    // Smart test suite generator for custom alphabets
    async function generateSmartSuite(alphabet, dfa) {
        const list = [];
        const seen = new Set();
        const candidateStrings = [''];

        alphabet.forEach(sym => candidateStrings.push(sym));
        if (alphabet.length > 0) {
            const a = alphabet[0];
            const b = alphabet.length > 1 ? alphabet[1] : alphabet[0];
            candidateStrings.push(a + a, a + b, b + a, b + b);
            if (alphabet.length > 1) {
                candidateStrings.push(a + b + a, b + a + b, a + a + b);
            }
        }

        for (const str of candidateStrings) {
            if (seen.has(str)) continue;
            seen.add(str);
            let exp = null;
            if (dfa) {
                try {
                    const sim = await API.simulate(dfa, str);
                    exp = sim.accepted;
                } catch (e) {}
            }
            list.push({
                text: str,
                expect: exp,
                note: `Generated pattern for alphabet {${alphabet.join(', ')}}`
            });
        }
        return list;
    }

    // 5. Load Preset Function
    async function loadPreset(presetKey) {
        const p = loadedPresets[presetKey];
        if (!p) return;

        presetSelect.value = presetKey;
        nfaStatesInput.value = p.states.join(', ');
        nfaAlphabetInput.value = p.alphabet.join(', ');
        nfaStartInput.value = p.startState;
        nfaAcceptInput.value = p.acceptStates.join(', ');

        currentNFA = {
            states: [...p.states],
            alphabet: [...p.alphabet],
            startState: p.startState,
            acceptStates: [...p.acceptStates],
            transitions: JSON.parse(JSON.stringify(p.transitions || {}))
        };

        renderNFATable();
        nfaRenderer.setData(currentNFA.states, currentNFA.alphabet, currentNFA.transitions, currentNFA.startState, currentNFA.acceptStates);

        resetStepper();
        clearStringTestUI();

        await executeFullConversion();

        // Load and execute preset batch test cases
        currentBatchTestCases = (p.sampleStrings || []).map(tc => ({ ...tc }));
        renderBatchTestCases(currentBatchTestCases, `${p.name} - Test Suite`);
        runBatchTestsAutomatically();
    }

    // 6. Update NFA Specification & Re-synchronize
    btnUpdateNfa.addEventListener('click', async () => {
        const states = nfaStatesInput.value.split(',').map(s => s.trim()).filter(Boolean);
        const alphabet = nfaAlphabetInput.value.split(',').map(s => s.trim()).filter(Boolean);
        const startState = nfaStartInput.value.trim();
        const acceptStates = nfaAcceptInput.value.split(',').map(s => s.trim()).filter(Boolean);

        // Sanitize and preserve existing transitions
        const oldTrans = (currentNFA && currentNFA.transitions) ? currentNFA.transitions : {};
        const newTransitions = {};

        states.forEach(s => {
            newTransitions[s] = {};
            alphabet.forEach(sym => {
                const existingTargets = (oldTrans[s] && oldTrans[s][sym]) || [];
                // Only keep targets that exist in current states set
                newTransitions[s][sym] = existingTargets.filter(t => states.includes(t));
            });
        });

        const newNfaData = {
            states,
            alphabet,
            startState,
            acceptStates,
            transitions: newTransitions
        };

        const val = await API.validate(newNfaData);
        if (!val.isValid) {
            alert(`NFA Validation Error:\n- ${val.errors.join('\n- ')}`);
            return;
        }

        currentNFA = newNfaData;
        presetSelect.value = 'custom';

        renderNFATable();
        nfaRenderer.setData(currentNFA.states, currentNFA.alphabet, currentNFA.transitions, currentNFA.startState, currentNFA.acceptStates);
        resetStepper();
        await executeFullConversion();
        clearStringTestUI();

        currentBatchTestCases = await generateSmartSuite(currentNFA.alphabet, currentDFA);
        renderBatchTestCases(currentBatchTestCases, 'Custom Automaton Test Suite');
    });

    // 7. Render Interactive NFA Transition Table
    function renderNFATable() {
        if (!currentNFA) return;
        const alphabetCols = [...currentNFA.alphabet];

        let html = `
            <table class="automata-table nfa-table">
                <thead>
                    <tr>
                        <th class="col-state">State</th>
                        ${alphabetCols.map(a => `<th>Input: ${a}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        currentNFA.states.forEach(state => {
            const isStart = state === currentNFA.startState;
            const isAccept = currentNFA.acceptStates.includes(state);
            const prefix = `${isStart ? '→ ' : ''}${isAccept ? '* ' : ''}`;

            html += `
                <tr>
                    <td class="row-header ${isAccept ? 'accept-state' : ''} ${isStart ? 'start-state' : ''}">
                        <span class="state-badge">${prefix}${state}</span>
                    </td>
                    ${alphabetCols.map(sym => {
                        const targets = (currentNFA.transitions[state] && currentNFA.transitions[state][sym]) || [];
                        const val = targets.join(', ');
                        return `
                            <td>
                                <input type="text" class="table-input" 
                                    data-from="${state}" 
                                    data-sym="${sym}" 
                                    value="${val}" 
                                    placeholder="∅" />
                            </td>
                        `;
                    }).join('')}
                </tr>
            `;
        });

        html += `</tbody></table>`;
        nfaTableContainer.innerHTML = html;

        // Attach live input & change listeners
        nfaTableContainer.querySelectorAll('.table-input').forEach(input => {
            const handleCellUpdate = async (e) => {
                const from = e.target.getAttribute('data-from');
                const sym = e.target.getAttribute('data-sym');
                const rawVal = e.target.value.trim();
                const targets = rawVal ? rawVal.split(',').map(s => s.trim()).filter(Boolean) : [];

                // Validate that all targets belong to states
                const invalidTargets = targets.filter(t => !currentNFA.states.includes(t));
                if (invalidTargets.length > 0) {
                    e.target.classList.add('input-error');
                    e.target.title = `Unknown state(s): ${invalidTargets.join(', ')}. Must be in Q = {${currentNFA.states.join(', ')}}`;
                    return;
                } else {
                    e.target.classList.remove('input-error');
                    e.target.title = '';
                }

                if (!currentNFA.transitions[from]) currentNFA.transitions[from] = {};
                currentNFA.transitions[from][sym] = targets;

                nfaRenderer.setData(currentNFA.states, currentNFA.alphabet, currentNFA.transitions, currentNFA.startState, currentNFA.acceptStates);
                presetSelect.value = 'custom';
                await executeFullConversion();
            };

            input.addEventListener('change', handleCellUpdate);
            input.addEventListener('input', (e) => {
                clearTimeout(tableDebounceTimer);
                tableDebounceTimer = setTimeout(() => handleCellUpdate(e), 300);
            });
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.target.blur();
                }
            });
        });
    }

    // 8. Full Conversion Execution
    async function executeFullConversion() {
        if (!currentNFA) return;
        try {
            stepLogBox.innerHTML = `<div class="log-item info"><span class="log-title">Processing</span><p>Executing Rabin-Scott powerset construction...</p></div>`;
            const result = await API.convert(currentNFA);
            if (!result.success) throw new Error(result.error);

            currentDFA = result.dfa;
            conversionSteps = result.steps;

            renderDFATable(currentDFA);
            dfaRenderer.setData(
                currentDFA.states,
                currentDFA.alphabet,
                currentDFA.transitions,
                currentDFA.startState,
                currentDFA.acceptStates,
                currentDFA.subsetMapping
            );

            dfaStatsBadge.textContent = `${currentDFA.states.length} DFA States (${currentDFA.acceptStates.length} Accept)`;
            stepLogBox.innerHTML = `
                <div class="log-item complete">
                    <span class="log-title">✓ NFA → DFA Conversion Complete!</span>
                    <p>Successfully determinized into equivalent DFA with <strong>${currentDFA.states.length} states</strong> (${currentDFA.acceptStates.length} accept states).</p>
                </div>
            `;
            stepperControls.style.display = 'none';
        } catch (err) {
            console.error(err);
            stepLogBox.innerHTML = `<div class="log-item warning"><span class="log-title">Conversion Notice</span><p>${err.message}</p></div>`;
        }
    }

    btnConvertFull.addEventListener('click', () => {
        pauseStepper();
        executeFullConversion();
    });

    // 9. Step-by-Step Conversion Stepper
    btnConvertStep.addEventListener('click', async () => {
        if (!currentNFA) return;
        try {
            const result = await API.convert(currentNFA);
            if (!result.success) throw new Error(result.error);

            conversionSteps = result.steps;
            stepperControls.style.display = 'flex';
            currentStepIndex = -1;

            currentDFA = null;
            dfaRenderer.setData([], [], {}, '', []);
            renderDFATable(null);
            stepProgressBar.style.width = '0%';
            stepCounterText.textContent = `Step 0 / ${conversionSteps.length}`;
            stepLogBox.innerHTML = `<div class="log-item info"><span class="log-title">Ready</span><p>Click "Next Step" or "Play" to step through the powerset construction algorithm.</p></div>`;

            stepForward();
        } catch (err) {
            alert(`Step Conversion Error: ${err.message}`);
        }
    });

    function resetStepper() {
        pauseStepper();
        stepperControls.style.display = 'none';
        currentStepIndex = -1;
        conversionSteps = [];
    }

    function stepForward() {
        if (currentStepIndex >= conversionSteps.length - 1) {
            pauseStepper();
            return;
        }
        currentStepIndex++;
        applyStep(currentStepIndex);
    }

    function stepBackward() {
        if (currentStepIndex <= 0) return;
        currentStepIndex--;
        replayUpTo(currentStepIndex);
    }

    function applyStep(index) {
        const step = conversionSteps[index];
        if (!step) return;

        const pct = Math.round(((index + 1) / conversionSteps.length) * 100);
        stepProgressBar.style.width = `${pct}%`;
        stepCounterText.textContent = `Step ${index + 1} / ${conversionSteps.length}`;

        stepLogBox.innerHTML = `
            <div class="log-item ${step.type.toLowerCase()}">
                <span class="log-badge">${step.type}</span>
                <span class="log-title">${step.title}</span>
                <p>${step.detail}</p>
            </div>
        `;

        buildIncrementalDFAView(index);

        if (index === conversionSteps.length - 1 && isPlaying) {
            pauseStepper();
        }
    }

    function replayUpTo(targetIndex) {
        buildIncrementalDFAView(targetIndex);
        const step = conversionSteps[targetIndex];
        stepProgressBar.style.width = `${Math.round(((targetIndex + 1) / conversionSteps.length) * 100)}%`;
        stepCounterText.textContent = `Step ${targetIndex + 1} / ${conversionSteps.length}`;
        stepLogBox.innerHTML = `
            <div class="log-item ${step.type.toLowerCase()}">
                <span class="log-badge">${step.type}</span>
                <span class="log-title">${step.title}</span>
                <p>${step.detail}</p>
            </div>
        `;
    }

    function buildIncrementalDFAView(upToIndex) {
        const statesSet = new Set();
        const acceptSet = new Set();
        const transitions = {};
        const subsetMapping = {};
        let startState = 'D0';

        for (let i = 0; i <= upToIndex; i++) {
            const s = conversionSteps[i];
            if (s.type === 'INIT' || s.type === 'STATE_DISCOVERED') {
                statesSet.add(s.state);
                subsetMapping[s.state] = s.subset;
                if (s.isAccept) acceptSet.add(s.state);
                if (s.isStart) startState = s.state;
                if (!transitions[s.state]) transitions[s.state] = {};
            } else if (s.type === 'TRANSITION_COMPUTED') {
                statesSet.add(s.fromState);
                statesSet.add(s.targetState);
                subsetMapping[s.fromState] = s.fromSubset;
                subsetMapping[s.targetState] = s.targetSubset;
                if (s.isTargetAccept) acceptSet.add(s.targetState);

                if (!transitions[s.fromState]) transitions[s.fromState] = {};
                if (!transitions[s.targetState]) transitions[s.targetState] = {};
                transitions[s.fromState][s.symbol] = s.targetState;
            }
        }

        const stateList = Array.from(statesSet);
        const partialDFA = {
            states: stateList,
            alphabet: currentNFA.alphabet,
            transitions,
            startState,
            acceptStates: Array.from(acceptSet),
            subsetMapping
        };
        currentDFA = partialDFA;
        renderDFATable(partialDFA);
        dfaRenderer.setData(stateList, currentNFA.alphabet, transitions, startState, Array.from(acceptSet), subsetMapping);

        const currentStep = conversionSteps[upToIndex];
        if (currentStep.state) {
            dfaRenderer.highlightState(currentStep.state);
        } else if (currentStep.fromState) {
            dfaRenderer.highlightState(currentStep.fromState);
            dfaRenderer.highlightEdge(currentStep.fromState, currentStep.targetState);
        }
    }

    function togglePlay() {
        if (isPlaying) {
            pauseStepper();
        } else {
            isPlaying = true;
            btnStepPlay.innerHTML = `<span>❚❚</span> Pause`;
            btnStepPlay.classList.add('btn-playing');
            playInterval = setInterval(() => {
                if (currentStepIndex >= conversionSteps.length - 1) {
                    pauseStepper();
                } else {
                    stepForward();
                }
            }, playSpeed);
        }
    }

    function pauseStepper() {
        isPlaying = false;
        if (playInterval) clearInterval(playInterval);
        playInterval = null;
        if (btnStepPlay) {
            btnStepPlay.innerHTML = `<span>▶</span> Play`;
            btnStepPlay.classList.remove('btn-playing');
        }
    }

    btnStepNext.addEventListener('click', () => { pauseStepper(); stepForward(); });
    btnStepPrev.addEventListener('click', () => { pauseStepper(); stepBackward(); });
    btnStepPlay.addEventListener('click', togglePlay);
    btnStepReset.addEventListener('click', () => {
        pauseStepper();
        currentStepIndex = -1;
        dfaRenderer.setData([], [], {}, '', []);
        renderDFATable(null);
        stepProgressBar.style.width = '0%';
        stepCounterText.textContent = `Step 0 / ${conversionSteps.length}`;
        stepLogBox.innerHTML = `<div class="log-item info"><span class="log-title">Reset</span><p>Algorithm reset to beginning.</p></div>`;
    });

    stepSpeedSlider.addEventListener('input', (e) => {
        playSpeed = parseInt(e.target.value, 10);
        if (isPlaying) {
            pauseStepper();
            togglePlay();
        }
    });

    // 10. Render DFA Transition Table
    function renderDFATable(dfa) {
        if (!dfa || !dfa.states || dfa.states.length === 0) {
            dfaTableContainer.innerHTML = `<div class="empty-table-notice">No DFA generated yet. Click "Convert Full" or run the stepper above.</div>`;
            return;
        }

        let html = `
            <table class="automata-table dfa-table">
                <thead>
                    <tr>
                        <th class="col-state">DFA State</th>
                        <th class="col-subset">Constituent NFA Subset</th>
                        ${dfa.alphabet.map(a => `<th>Input: ${a}</th>`).join('')}
                        <th>Classification</th>
                    </tr>
                </thead>
                <tbody>
        `;

        dfa.states.forEach(state => {
            const isStart = state === dfa.startState;
            const isAccept = dfa.acceptStates.includes(state);
            const prefix = `${isStart ? '→ ' : ''}${isAccept ? '* ' : ''}`;
            const sub = getFormattedSubset(state);
            const isDead = (getConstituentSet(state).length === 0);

            let badgeType = 'Intermediate';
            let badgeClass = 'badge-normal';
            if (isStart && isAccept) { badgeType = 'Start & Accept'; badgeClass = 'badge-both'; }
            else if (isStart) { badgeType = 'Initial State'; badgeClass = 'badge-start'; }
            else if (isAccept) { badgeType = 'Accept State'; badgeClass = 'badge-accept'; }
            else if (isDead) { badgeType = 'Dead / Trap'; badgeClass = 'badge-dead'; }

            html += `
                <tr id="dfa-row-${state}">
                    <td class="row-header ${isAccept ? 'accept-state' : ''} ${isStart ? 'start-state' : ''}">
                        <span class="state-badge">${prefix}${state}</span>
                    </td>
                    <td class="subset-cell"><code>${sub}</code></td>
                    ${dfa.alphabet.map(sym => {
                        const target = (dfa.transitions[state] && dfa.transitions[state][sym]) || '—';
                        return `<td class="target-cell">${target}</td>`;
                    }).join('')}
                    <td><span class="status-pill ${badgeClass}">${badgeType}</span></td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        dfaTableContainer.innerHTML = html;
    }

    // 11. String Simulation Engine & Tape UI
    function clearStringTestUI() {
        if (stringSimInterval) clearInterval(stringSimInterval);
        stringSimInterval = null;
        tapeContainer.innerHTML = '';
        stringVerdictBanner.innerHTML = '';
        stringVerdictBanner.className = 'verdict-banner hidden';
        stringLog.innerHTML = '<span class="text-muted">Enter a test string and click Run to observe execution.</span>';
        if (dfaRenderer) dfaRenderer.clearHighlights();
        if (nfaRenderer) nfaRenderer.clearHighlights();
    }

    btnResetString.addEventListener('click', clearStringTestUI);
    btnRunString.addEventListener('click', () => executeStringTest(false));
    btnStepString.addEventListener('click', () => executeStringTest(true));

    if (btnAddToBatch) {
        btnAddToBatch.addEventListener('click', async () => {
            const str = testStringInput.value.trim();
            if (currentNFA && currentNFA.alphabet) {
                const invalidChars = str.split('').filter(c => !currentNFA.alphabet.includes(c));
                if (invalidChars.length > 0) {
                    alert(`Warning: Characters '${invalidChars.join("', '")}' are not in alphabet {${currentNFA.alphabet.join(', ')}}.`);
                }
            }
            let exp = null;
            if (currentDFA) {
                try {
                    const sim = await API.simulate(currentDFA, str);
                    exp = sim.accepted;
                } catch (e) {}
            }
            currentBatchTestCases.push({
                text: str,
                expect: exp,
                note: 'User added test string'
            });
            renderBatchTestCases(currentBatchTestCases);
        });
    }

    async function executeStringTest(isStepMode = false) {
        if (!currentDFA) {
            alert("Please convert the NFA to a DFA first before testing strings.");
            return;
        }

        const inputStr = testStringInput.value.trim();
        try {
            stringSimResult = await API.simulate(currentDFA, inputStr);
        } catch (e) {
            alert(`Simulation error: ${e.message}`);
            return;
        }

        renderTape(inputStr, 0);

        if (stringSimResult.error) {
            stringVerdictBanner.className = 'verdict-banner verdict-reject';
            stringVerdictBanner.innerHTML = `<strong>REJECTED:</strong> ${stringSimResult.error}`;
            return;
        }

        if (isStepMode) {
            stringSimStepIndex = 0;
            renderStringSimStep(stringSimStepIndex);
        } else {
            stringSimStepIndex = 0;
            if (stringSimInterval) clearInterval(stringSimInterval);
            stringSimInterval = setInterval(() => {
                if (stringSimStepIndex >= stringSimResult.history.length - 1) {
                    clearInterval(stringSimInterval);
                    showFinalVerdict();
                } else {
                    stringSimStepIndex++;
                    renderStringSimStep(stringSimStepIndex);
                }
            }, 550);
        }
    }

    function renderTape(str, activeIdx) {
        if (str.length === 0) {
            tapeContainer.innerHTML = `<div class="tape-cell active">λ (Empty String)</div>`;
            return;
        }
        tapeContainer.innerHTML = str.split('').map((char, idx) => `
            <div class="tape-cell ${idx === activeIdx ? 'active' : ''}" data-idx="${idx}">
                <span class="tape-idx">${idx}</span>
                <span class="tape-char">${char}</span>
            </div>
        `).join('');
    }

    function renderStringSimStep(index) {
        const step = stringSimResult.history[index];
        if (!step) return;

        const cells = tapeContainer.querySelectorAll('.tape-cell');
        cells.forEach((cell, i) => {
            cell.classList.toggle('active', i === (index - 1));
            if (i < index - 1) cell.classList.add('consumed');
        });

        // Highlight in DFA
        if (step.state) {
            dfaRenderer.highlightState(step.state);
        } else {
            dfaRenderer.clearHighlights();
        }

        // Simultaneously highlight active constituent NFA states
        if (step.subset && step.subset.length > 0) {
            nfaRenderer.nodes.forEach(n => n.isActive = step.subset.includes(n.id));
            nfaRenderer.render();
        } else {
            nfaRenderer.clearHighlights();
        }

        document.querySelectorAll('.dfa-table tr').forEach(r => r.classList.remove('active-row'));
        const row = document.getElementById(`dfa-row-${step.state}`);
        if (row) row.classList.add('active-row');

        stringLog.innerHTML = `
            <div class="step-trace">
                <span class="trace-badge">Step ${step.step}</span>
                <strong>${step.description}</strong>
            </div>
        `;

        if (index === stringSimResult.history.length - 1) {
            showFinalVerdict();
        }
    }

    function showFinalVerdict() {
        const isAcc = stringSimResult.accepted;
        stringVerdictBanner.className = `verdict-banner ${isAcc ? 'verdict-accept' : 'verdict-reject'}`;
        const pathStr = stringSimResult.history.map(h => h.state || 'Trap').join(' → ');

        stringVerdictBanner.innerHTML = `
            <div class="verdict-header">
                <span class="verdict-icon">${isAcc ? '✓' : '✗'}</span>
                <h3>${isAcc ? 'STRING ACCEPTED' : 'STRING REJECTED'}</h3>
            </div>
            <p class="verdict-detail">${stringSimResult.reason}</p>
            <div class="verdict-path"><strong>Execution Trace:</strong> ${pathStr}</div>
        `;
    }

    // 12. Batch Test Suite Runner
    function renderBatchTestCases(testCases = currentBatchTestCases, title = '') {
        currentBatchTestCases = testCases;
        if (title && batchSuiteTitle) {
            batchSuiteTitle.textContent = title;
        }
        if (batchSuiteCount) {
            batchSuiteCount.textContent = `${testCases.length} Test Cases`;
        }

        let tableHtml = '';
        if (!testCases || testCases.length === 0) {
            tableHtml = `<div class="empty-table-notice">No test cases configured. Add one below or click "⚡ Auto Suite".</div>`;
        } else {
            tableHtml = `
                <table class="batch-table">
                    <thead>
                        <tr>
                            <th>Test String</th>
                            <th>Expected</th>
                            <th>DFA Result</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${testCases.map((tc, idx) => {
                            let expectBadge = '<span class="pill pill-custom">Auto</span>';
                            if (tc.expect === true) {
                                expectBadge = '<span class="pill pill-accept">ACCEPT</span>';
                            } else if (tc.expect === false) {
                                expectBadge = '<span class="pill pill-reject">REJECT</span>';
                            }
                            return `
                                <tr id="batch-row-${idx}">
                                    <td><code>"${tc.text === '' ? 'λ (empty)' : tc.text}"</code></td>
                                    <td>${expectBadge}</td>
                                    <td class="result-cell">—</td>
                                    <td class="verdict-cell"><span class="pill pill-pending">Pending</span></td>
                                    <td>
                                        <button class="btn-batch-run" data-idx="${idx}" title="Test this string on DFA">▶ Test</button>
                                        <button class="btn-batch-delete" data-idx="${idx}" title="Remove test case">✕</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }

        const actionsHtml = `
            <div class="batch-actions">
                <div class="batch-add-bar">
                    <input type="text" id="new-test-case-input" class="text-input" placeholder="New string (e.g. 0110)" />
                    <select id="new-test-case-expect" class="select-sm" title="Expected Outcome">
                        <option value="auto">Auto</option>
                        <option value="true">Expect ACCEPT</option>
                        <option value="false">Expect REJECT</option>
                    </select>
                    <button id="btn-add-test-case" class="btn btn-secondary btn-sm">+ Add</button>
                </div>
                <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                    <button id="btn-run-all-batch" class="btn btn-primary btn-sm">▶ Run All</button>
                    <button id="btn-generate-suite" class="btn btn-secondary btn-sm" title="Generate smart test strings for this alphabet">⚡ Auto Suite</button>
                    <button id="btn-clear-batch" class="btn btn-secondary btn-sm" title="Clear all test cases">🗑 Clear</button>
                </div>
            </div>
        `;

        batchTestsContainer.innerHTML = tableHtml + actionsHtml;

        // Run individual string
        batchTestsContainer.querySelectorAll('.btn-batch-run').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
                const tc = currentBatchTestCases[idx];
                if (!tc) return;
                testStringInput.value = tc.text;
                executeStringTest(false);
            });
        });

        // Delete test case
        batchTestsContainer.querySelectorAll('.btn-batch-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
                currentBatchTestCases.splice(idx, 1);
                renderBatchTestCases(currentBatchTestCases);
            });
        });

        // Add test case listener
        const btnAdd = document.getElementById('btn-add-test-case');
        const inputAdd = document.getElementById('new-test-case-input');
        const selectExpect = document.getElementById('new-test-case-expect');

        if (btnAdd && inputAdd) {
            const doAdd = async () => {
                const str = inputAdd.value.trim();
                if (currentNFA && currentNFA.alphabet) {
                    const invalidChars = str.split('').filter(c => !currentNFA.alphabet.includes(c));
                    if (invalidChars.length > 0) {
                        alert(`Warning: Characters '${invalidChars.join("', '")}' are not in alphabet {${currentNFA.alphabet.join(', ')}}.`);
                    }
                }

                let exp = null;
                const expectVal = selectExpect ? selectExpect.value : 'auto';
                if (expectVal === 'true') exp = true;
                else if (expectVal === 'false') exp = false;
                else if (currentDFA) {
                    try {
                        const sim = await API.simulate(currentDFA, str);
                        exp = sim.accepted;
                    } catch (e) {}
                }

                currentBatchTestCases.push({
                    text: str,
                    expect: exp,
                    note: 'Custom user test string'
                });
                renderBatchTestCases(currentBatchTestCases);
                inputAdd.value = '';
            };
            btnAdd.addEventListener('click', doAdd);
            inputAdd.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') doAdd();
            });
        }

        // Run all batch button
        const btnRunAll = document.getElementById('btn-run-all-batch');
        if (btnRunAll) {
            btnRunAll.addEventListener('click', runBatchTestsAutomatically);
        }

        // Generate auto suite button
        const btnGenerate = document.getElementById('btn-generate-suite');
        if (btnGenerate) {
            btnGenerate.addEventListener('click', async () => {
                if (!currentNFA || !currentNFA.alphabet) return;
                currentBatchTestCases = await generateSmartSuite(currentNFA.alphabet, currentDFA);
                renderBatchTestCases(currentBatchTestCases);
                runBatchTestsAutomatically();
            });
        }

        // Clear all test cases button
        const btnClear = document.getElementById('btn-clear-batch');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                currentBatchTestCases = [];
                renderBatchTestCases(currentBatchTestCases);
            });
        }
    }

    async function runBatchTestsAutomatically() {
        if (!currentDFA) return;
        for (let idx = 0; idx < currentBatchTestCases.length; idx++) {
            const tc = currentBatchTestCases[idx];
            const row = document.getElementById(`batch-row-${idx}`);
            if (!row) continue;

            const resCell = row.querySelector('.result-cell');
            const verCell = row.querySelector('.verdict-cell');

            try {
                const res = await API.simulate(currentDFA, tc.text);
                if (res.error) {
                    resCell.innerHTML = `<span class="pill pill-reject">INVALID</span>`;
                    verCell.innerHTML = `<span class="pill pill-fail" title="${res.error}">✗ NOT IN Σ</span>`;
                } else {
                    resCell.innerHTML = `<span class="pill ${res.accepted ? 'pill-accept' : 'pill-reject'}">${res.accepted ? 'ACCEPT' : 'REJECT'}</span>`;
                    if (tc.expect === true || tc.expect === false) {
                        const passed = (res.accepted === tc.expect);
                        verCell.innerHTML = `<span class="pill ${passed ? 'pill-pass' : 'pill-fail'}">${passed ? '✓ PASSED' : '✗ FAILED'}</span>`;
                    } else {
                        verCell.innerHTML = `<span class="pill ${res.accepted ? 'pill-pass' : 'pill-reject'}">${res.accepted ? '✓ ACCEPTED' : '✗ REJECTED'}</span>`;
                    }
                }
            } catch (err) {
                resCell.textContent = 'Err';
                verCell.innerHTML = `<span class="pill pill-fail">Error</span>`;
            }
        }
    }

    // 13. Viewport Zoom & Fit Controls
    document.getElementById('btn-reset-nfa-view').addEventListener('click', () => nfaRenderer.resetView());
    document.getElementById('btn-zoom-in-nfa').addEventListener('click', () => nfaRenderer.zoom(-1));
    document.getElementById('btn-zoom-out-nfa').addEventListener('click', () => nfaRenderer.zoom(1));

    document.getElementById('btn-reset-dfa-view').addEventListener('click', () => dfaRenderer.resetView());
    document.getElementById('btn-zoom-in-dfa').addEventListener('click', () => dfaRenderer.zoom(-1));
    document.getElementById('btn-zoom-out-dfa').addEventListener('click', () => dfaRenderer.zoom(1));

    // 14. Export Specification as JSON
    const btnExportJson = document.getElementById('btn-export-json');
    if (btnExportJson) {
        btnExportJson.addEventListener('click', () => {
            if (!currentNFA) return;
            const data = {
                nfa: currentNFA,
                dfa: currentDFA
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `automata_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // 15. Initial Load: Classic Benchmark (Ends with '01')
    loadPreset('ends_with_01');
});
