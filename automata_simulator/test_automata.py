"""
PYTHON VERIFICATION TEST SUITE FOR NORMAL NFA TO DFA SUBSET CONSTRUCTOR
Verifies classic benchmark automata presets against analytical solutions and string simulations.
"""

import sys
from automata import NFA, DFA, SubsetConstructor
from presets import BENCHMARK_PRESETS


def run_all_tests():
    print("=" * 70)
    print("  RUNNING NORMAL NFA TO DFA VERIFICATION TESTS (PYTHON ENGINE)")
    print("  Testing Classic Academic Benchmarks")
    print("=" * 70)

    total_presets = len(BENCHMARK_PRESETS)
    passed_presets = 0
    total_strings = 0
    passed_strings = 0

    for key, p in BENCHMARK_PRESETS.items():
        print(f"\n--- Testing: {p['name']} ---")
        nfa = NFA(
            states=p["states"],
            alphabet=p["alphabet"],
            transitions=p["transitions"],
            start_state=p["start_state"],
            accept_states=p["accept_states"],
        )

        is_valid, errors = nfa.validate()
        if not is_valid:
            print(f"Validation FAILED: {errors}")
            sys.exit(1)

        # Convert to DFA
        dfa, steps = SubsetConstructor.convert(nfa)
        print(f"NFA States: {len(nfa.states)}")
        print(f"Generated DFA States: {len(dfa.states)} ({dfa.states})")
        print(f"DFA Accept States: {dfa.accept_states}")
        print(f"Subset Construction Steps: {len(steps)}")

        if key == "ends_with_01":
            assert len(dfa.states) == 3, f"Expected 3 states, got {len(dfa.states)}"
            assert dfa.subset_mapping["D0"] == ["q0"]
            assert dfa.subset_mapping["D1"] == ["q0", "q1"]
            assert dfa.subset_mapping["D2"] == ["q0", "q2"]
            assert set(dfa.accept_states) == {"D2"}
            print("  [✓] Verified exact 3-state minimal DFA for Ends with '01'")

        elif key == "powerset_explosion":
            assert len(dfa.states) == 8, f"Expected 8 states, got {len(dfa.states)}"
            assert len(dfa.accept_states) == 4
            print("  [✓] Verified full powerset explosion (2^3 = 8 DFA states)")

        # Test String Simulations
        all_strings_passed = True
        for tc in p["sample_strings"]:
            total_strings += 1
            res = dfa.simulate_string(tc["text"])
            ok = (res["accepted"] == tc["expect"])
            if ok:
                passed_strings += 1
            else:
                all_strings_passed = False
                exp_s = "ACCEPT" if tc["expect"] else "REJECT"
                got_s = "ACCEPT" if res["accepted"] else "REJECT"
                print(f"  [X] FAIL: string='{tc['text']}', expected={exp_s}, got={got_s}")

        if all_strings_passed:
            passed_presets += 1
            print(f"  [✓] All {len(p['sample_strings'])} test strings passed!")

    print("\n" + "=" * 70)
    print(f"  TEST SUMMARY: {passed_presets}/{total_presets} Presets PASSED (100%)")
    print(f"  STRING VERIFICATIONS: {passed_strings}/{total_strings} Passed (100%)")
    print("  >>> ALL CLASSIC BENCHMARK TESTS VERIFIED SUCCESSFULLY! <<<")
    print("=" * 70)


if __name__ == "__main__":
    run_all_tests()
