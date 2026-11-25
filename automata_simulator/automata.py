"""
AUTOMATA THEORY ENGINE - NORMAL NFA TO DFA SUBSET CONSTRUCTOR (PYTHON IMPLEMENTATION)
Implements formal Rabin-Scott powerset subset construction for Normal NFAs.
Generates canonical DFA state machines, transition tables, step-by-step
construction traces, and deterministic string simulations.
Directly aligns with standard formal automata theory specifications.
"""

import sys
import re
from typing import List, Dict, Set, Optional, Tuple, Any, Generator
import json

# Ensure UTF-8 output on Windows consoles if supported
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

EMPTY_SET_CHAR = "∅"
SIGMA_CHAR = "Σ"


def natural_sort_key(s: str):
    """Sort strings with embedded numbers naturally (e.g. s2 before s10)."""
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", str(s))]


class NFA:
    """
    Normal Nondeterministic Finite Automaton (NFA) without ε-transitions.
    Formal 5-tuple: M = (Q, Sigma, delta, q0, F)
    where delta: Q x Sigma -> P(Q)
    """

    def __init__(
        self,
        states: Optional[List[str]] = None,
        alphabet: Optional[List[str]] = None,
        transitions: Optional[Dict[str, Dict[str, List[str]]]] = None,
        start_state: str = "",
        accept_states: Optional[List[str]] = None,
    ):
        # Unique states preserving order
        self.states: List[str] = list(dict.fromkeys(states or []))
        raw_alpha = alphabet or []
        self.alphabet: List[str] = [
            a for a in dict.fromkeys(raw_alpha) if a.strip()
        ]
        self.start_state: str = start_state.strip()
        self.accept_states: List[str] = list(dict.fromkeys(accept_states or []))

        # transitions structure: { [state]: { [symbol]: [target_states] } }
        self.transitions: Dict[str, Dict[str, List[str]]] = {}

        # Initialize transition lists for all states and alphabet symbols
        for s in self.states:
            self.transitions[s] = {a: [] for a in self.alphabet}

        # Populate initial transitions if provided
        if transitions:
            for from_state, sym_map in transitions.items():
                if from_state not in self.transitions:
                    self.transitions[from_state] = {a: [] for a in self.alphabet}
                for sym, targets in sym_map.items():
                    if sym in self.alphabet:
                        t_list = targets if isinstance(targets, list) else [targets]
                        clean_targets = [str(t).strip() for t in t_list if str(t).strip()]
                        self.transitions[from_state][sym] = list(dict.fromkeys(clean_targets))

    def add_transition(self, from_state: str, symbol: str, to_state: str) -> None:
        """Add a directed transition delta(from_state, symbol) -> to_state."""
        if from_state not in self.transitions:
            self.transitions[from_state] = {a: [] for a in self.alphabet}
        if symbol not in self.transitions[from_state]:
            self.transitions[from_state][symbol] = []
        if to_state not in self.transitions[from_state][symbol]:
            self.transitions[from_state][symbol].append(to_state)

    def get_transitions(self, from_state: str, symbol: str) -> List[str]:
        """Returns the list of target states delta(from_state, symbol)."""
        return self.transitions.get(from_state, {}).get(symbol, [])

    def move(self, states_subset: List[str], symbol: str) -> List[str]:
        """
        Calculates Move(S, a) = ⋃ { δ(p, a) | p ∈ S }.
        Returns a sorted list of unique reachable states.
        """
        result: Set[str] = set()
        for s in states_subset:
            targets = self.get_transitions(s, symbol)
            for t in targets:
                result.add(t)
        return sorted(list(result), key=natural_sort_key)

    def move_and_close(self, states_subset: List[str], symbol: str) -> List[str]:
        """Calculates Move(S, a) for Normal NFAs."""
        return self.move(states_subset, symbol)

    def validate(self) -> Tuple[bool, List[str]]:
        """
        Validates NFA consistency against formal 5-tuple requirements.
        Returns (is_valid, list_of_errors).
        """
        errors: List[str] = []
        if not self.start_state:
            errors.append("Start state is not defined.")
        elif self.start_state not in self.states:
            errors.append(f'Start state "{self.start_state}" is not in the set of states.')

        if len(self.states) == 0:
            errors.append("States set is empty.")

        if len(self.alphabet) == 0:
            errors.append("Alphabet Σ is empty.")

        for a in self.accept_states:
            if a not in self.states:
                errors.append(f'Accept state "{a}" is not in the states set.')

        for s, sym_map in self.transitions.items():
            if s not in self.states:
                errors.append(f'Transition source state "{s}" is not in the states set.')
            for sym, targets in sym_map.items():
                if sym not in self.alphabet:
                    errors.append(f'Symbol "{sym}" is not in alphabet Σ.')
                for t in targets:
                    if t not in self.states:
                        errors.append(f'Transition target "{t}" from ({s}, {sym}) is not in states.')

        return len(errors) == 0, errors

    def to_dict(self) -> Dict[str, Any]:
        """Serializes NFA to a JSON-compatible dictionary."""
        return {
            "states": self.states,
            "alphabet": self.alphabet,
            "start_state": self.start_state,
            "startState": self.start_state,
            "accept_states": self.accept_states,
            "acceptStates": self.accept_states,
            "transitions": self.transitions,
        }

    def print_transition_table(self) -> None:
        """Displays ASCII transition table for the NFA."""
        cols = list(self.alphabet)
        print("\n--- NFA TRANSITION TABLE ---")
        headers = ["State"] + cols
        col_width = 16
        row_fmt = "".join([f"{{:<{col_width}}}" for _ in headers])
        print(row_fmt.format(*headers))
        print("-" * (col_width * len(headers)))

        for s in self.states:
            prefix = ""
            if s == self.start_state:
                prefix += "->"
            if s in self.accept_states:
                prefix += "*"
            state_label = f"{prefix}{s}"

            row = [state_label]
            for c in cols:
                targets = self.get_transitions(s, c)
                row.append("{" + ", ".join(targets) + "}" if targets else "∅")
            print(row_fmt.format(*row))


class DFA:
    """
    Deterministic Finite Automaton (DFA) generated via Subset Construction.
    Formal 5-tuple: M' = (Q', Sigma, delta', D0, F')
    DFA states are canonically labeled D0, D1, D2, ... with subsets mapping directly
    to NFA state sets.
    """

    def __init__(
        self,
        states: Optional[List[str]] = None,
        alphabet: Optional[List[str]] = None,
        transitions: Optional[Dict[str, Dict[str, str]]] = None,
        start_state: str = "",
        accept_states: Optional[List[str]] = None,
        subset_mapping: Optional[Dict[str, List[str]]] = None,
    ):
        self.states: List[str] = states or []  # ['D0', 'D1', ...]
        self.alphabet: List[str] = alphabet or []
        self.start_state: str = start_state
        self.accept_states: List[str] = accept_states or []
        self.transitions: Dict[str, Dict[str, str]] = transitions or {}  # { [state]: { [symbol]: targetState } }
        self.subset_mapping: Dict[str, List[str]] = subset_mapping or {}  # { 'D0': ['p0'], 'D1': ['p0', 'p1'] }

    def get_constituent_set(self, state_name: Optional[str]) -> List[str]:
        """Returns the underlying subset of NFA states corresponding to state_name."""
        if not state_name:
            return []
        return self.subset_mapping.get(state_name, [])

    def get_formatted_subset(self, state_name: Optional[str]) -> str:
        """Returns a formatted string of the subset e.g. '{ p0, p1 }' or '∅ (Dead/Trap)'."""
        sub = self.get_constituent_set(state_name)
        if not sub:
            return "∅ (Dead/Trap)"
        return "{ " + ", ".join(sub) + " }"

    def is_accept(self, state_name: Optional[str]) -> bool:
        """Checks if a given DFA state is an accepting state."""
        return state_name in self.accept_states if state_name else False

    def simulate_string(self, input_string: str) -> Dict[str, Any]:
        """
        Simulates an input string step-by-step on the deterministic DFA.
        Returns full trace history with tape index, character, active state, subset, and verdict.
        """
        history: List[Dict[str, Any]] = []
        current_state: Optional[str] = self.start_state

        history.append({
            "step": 0,
            "char": None,
            "state": current_state,
            "subset": self.get_constituent_set(current_state),
            "is_accept": self.is_accept(current_state),
            "isAccept": self.is_accept(current_state),
            "description": f"Start at initial DFA state {current_state} = {self.get_formatted_subset(current_state)}",
        })

        for i, char in enumerate(input_string):
            if char not in self.alphabet:
                return {
                    "accepted": False,
                    "history": history,
                    "error": f"Character '{char}' at index {i} is not in alphabet Σ = {{{', '.join(self.alphabet)}}}",
                    "final_state": current_state,
                    "finalState": current_state,
                }

            curr_trans = self.transitions.get(current_state) if current_state and self.transitions else None
            next_state = (curr_trans or {}).get(char)

            if not next_state:
                history.append({
                    "step": i + 1,
                    "char": char,
                    "state": None,
                    "subset": [],
                    "is_accept": False,
                    "isAccept": False,
                    "description": f"No transition defined from {current_state} on '{char}' -> Trap",
                })
                return {
                    "accepted": False,
                    "history": history,
                    "final_state": None,
                    "finalState": None,
                    "reason": f"Halted in undefined transition on symbol '{char}'",
                }

            current_state = next_state
            is_acc = self.is_accept(current_state)
            history.append({
                "step": i + 1,
                "char": char,
                "state": current_state,
                "subset": self.get_constituent_set(current_state),
                "is_accept": is_acc,
                "isAccept": is_acc,
                "description": f"Read '{char}' -> Transition to {current_state} = {self.get_formatted_subset(current_state)}",
            })

        accepted = self.is_accept(current_state)
        reason_msg = (
            f"String accepted in final state {current_state} ({self.get_formatted_subset(current_state)})"
            if accepted
            else f"String rejected in non-accept state {current_state} ({self.get_formatted_subset(current_state)})"
        )
        return {
            "accepted": accepted,
            "history": history,
            "final_state": current_state,
            "finalState": current_state,
            "reason": reason_msg,
        }

    def print_transition_table(self) -> None:
        """Displays ASCII transition table for the DFA with subset mappings."""
        print("\n--- DFA TRANSITION TABLE ---")
        headers = ["DFA State", "NFA Subset"] + self.alphabet
        col_width = 18
        row_fmt = "".join([f"{{:<{col_width}}}" for _ in headers])
        print(row_fmt.format(*headers))
        print("-" * (col_width * len(headers)))

        for s in self.states:
            prefix = ""
            if s == self.start_state:
                prefix += "->"
            if s in self.accept_states:
                prefix += "*"
            state_label = f"{prefix}{s}"
            subset_label = self.get_formatted_subset(s)

            row = [state_label, subset_label]
            for a in self.alphabet:
                target = self.transitions.get(s, {}).get(a, "∅")
                row.append(target)
            print(row_fmt.format(*row))

    def to_dict(self) -> Dict[str, Any]:
        """Serializes DFA to JSON-compatible dictionary."""
        return {
            "states": self.states,
            "alphabet": self.alphabet,
            "start_state": self.start_state,
            "startState": self.start_state,
            "accept_states": self.accept_states,
            "acceptStates": self.accept_states,
            "transitions": self.transitions,
            "subset_mapping": self.subset_mapping,
            "subsetMapping": self.subset_mapping,
        }


class SubsetConstructor:
    """
    Rabin-Scott Powerset Subset Construction Engine for Normal NFAs.
    Builds canonical DFA states D0, D1, D2, ... corresponding to reachable subsets of NFA states.
    Supports step generation (Python generator) and one-shot conversion.
    """

    @staticmethod
    def get_subset_key(subset: List[str]) -> str:
        """Creates a canonical, naturally sorted key for a subset of states."""
        return ",".join(sorted(list(set(subset)), key=natural_sort_key))

    @classmethod
    def generate_steps(cls, nfa: NFA) -> Generator[Dict[str, Any], None, DFA]:
        """
        Executes subset construction step-by-step.
        Yields step event dictionaries for visualizers, educational walkthroughs, or logs,
        and returns the final constructed DFA.
        """
        is_valid, errors = nfa.validate()
        if not is_valid:
            raise ValueError("; ".join(errors))

        # 1. Initial State: D0 = {q0}
        initial_subset = [nfa.start_state]
        initial_key = cls.get_subset_key(initial_subset)

        yield {
            "type": "LOG",
            "title": "Algorithm Initialization",
            "detail": f"Initializing DFA start state D0 = {{{nfa.start_state}}}.",
        }

        subset_to_name: Dict[str, str] = {}
        name_to_subset: Dict[str, List[str]] = {}
        dfa_transitions: Dict[str, Dict[str, str]] = {}
        dfa_states: List[str] = []
        dfa_accept_states: List[str] = []

        state_counter = 0
        initial_label = f"D{state_counter}"
        state_counter += 1

        subset_to_name[initial_key] = initial_label
        name_to_subset[initial_label] = initial_subset
        dfa_states.append(initial_label)
        dfa_transitions[initial_label] = {}

        is_initial_accept = any(s in nfa.accept_states for s in initial_subset)
        if is_initial_accept:
            dfa_accept_states.append(initial_label)

        yield {
            "type": "STATE_DISCOVERED",
            "state": initial_label,
            "subset": initial_subset,
            "is_start": True,
            "isStart": True,
            "is_accept": is_initial_accept,
            "isAccept": is_initial_accept,
            "title": f"Initial DFA State {initial_label} = {{{', '.join(initial_subset)}}}",
            "detail": (
                f"Start state subset {{{', '.join(initial_subset)}}}. "
                f"{'Contains NFA accept state -> Marked ACCEPT.' if is_initial_accept else 'Non-accepting state.'}"
            ),
        }

        queue: List[str] = [initial_label]

        # 2. Explore worklist queue
        while queue:
            current_label = queue.pop(0)
            current_subset = name_to_subset[current_label]

            yield {
                "type": "EXPLORING_STATE",
                "state": current_label,
                "subset": current_subset,
                "title": f"Expanding Transitions for {current_label}",
                "detail": (
                    f"Evaluating outgoing transitions for {current_label} = "
                    f"{{{', '.join(current_subset) if current_subset else '∅'}}} across alphabet Σ = {{{', '.join(nfa.alphabet)}}}"
                ),
            }

            for sym in nfa.alphabet:
                target_subset = nfa.move_and_close(current_subset, sym)
                target_key = cls.get_subset_key(target_subset)

                is_new = False
                if not target_subset:
                    # Empty subset: transition to complete Dead/Trap state
                    if "" not in subset_to_name:
                        trap_label = "Trap"
                        subset_to_name[""] = trap_label
                        name_to_subset[trap_label] = []
                        dfa_states.append(trap_label)
                        dfa_transitions[trap_label] = {a: trap_label for a in nfa.alphabet}
                    target_label = subset_to_name[""]
                else:
                    if target_key in subset_to_name:
                        target_label = subset_to_name[target_key]
                    else:
                        target_label = f"D{state_counter}"
                        state_counter += 1

                        subset_to_name[target_key] = target_label
                        name_to_subset[target_label] = target_subset
                        dfa_states.append(target_label)
                        dfa_transitions[target_label] = {}

                        is_acc = any(s in nfa.accept_states for s in target_subset)
                        if is_acc:
                            dfa_accept_states.append(target_label)

                        queue.append(target_label)
                        is_new = True

                dfa_transitions[current_label][sym] = target_label
                is_target_acc = target_label in dfa_accept_states

                yield {
                    "type": "TRANSITION_COMPUTED",
                    "from_state": current_label,
                    "fromState": current_label,
                    "from_subset": current_subset,
                    "fromSubset": current_subset,
                    "symbol": sym,
                    "move_set": target_subset,
                    "target_state": target_label,
                    "targetState": target_label,
                    "target_subset": target_subset,
                    "targetSubset": target_subset,
                    "is_new_target": is_new,
                    "isNewTarget": is_new,
                    "is_target_accept": is_target_acc,
                    "isTargetAccept": is_target_acc,
                    "title": f"Transition: {current_label} on '{sym}' → {target_label}",
                    "detail": (
                        f"δ({current_label}, '{sym}') = Move({{{', '.join(current_subset)}}}, '{sym}') = "
                        f"{{{', '.join(target_subset) if target_subset else '∅'}}} = {target_label} "
                        f"{'(NEW STATE DISCOVERED!)' if is_new else '(Existing)'}"
                    ),
                }

        final_dfa = DFA(
            states=dfa_states,
            alphabet=nfa.alphabet,
            transitions=dfa_transitions,
            start_state=initial_label,
            accept_states=dfa_accept_states,
            subset_mapping=name_to_subset,
        )

        yield {
            "type": "COMPLETE",
            "dfa": final_dfa,
            "title": "Subset Construction Complete!",
            "detail": (
                f"Generated equivalent DFA with {len(dfa_states)} states "
                f"({len(dfa_accept_states)} accept states)."
            ),
        }

        return final_dfa

    @classmethod
    def convert(cls, nfa: NFA) -> Tuple[DFA, List[Dict[str, Any]]]:
        """
        Executes immediate one-shot conversion of an NFA to a DFA.
        Returns a tuple: (DFA, list_of_step_events).
        """
        gen = cls.generate_steps(nfa)
        steps: List[Dict[str, Any]] = []
        final_dfa: Optional[DFA] = None

        try:
            while True:
                step = next(gen)
                steps.append(step)
                if step.get("type") == "COMPLETE":
                    final_dfa = step.get("dfa")
        except StopIteration as e:
            if e.value:
                final_dfa = e.value

        if final_dfa is None:
            raise RuntimeError("Subset construction did not produce a valid DFA.")

        return final_dfa, steps
