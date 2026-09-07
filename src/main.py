import sys
import csv
import os
from graph import TransactionGraph
from algorithms import kosaraju_scc, kahn_topological_sort
from scoring import score_rings
from generator import generate_synthetic_network

def run_pipeline(graph: TransactionGraph):
    print(f"Loaded graph: {len(graph.nodes)} accounts, {len(graph.edges)} transactions\n")

    all_ids = list(graph.nodes)
    ok, order, stuck = kahn_topological_sort(all_ids, graph.edges)
    print("== Step 1: Kahn's topological sort on the RAW ledger ==")
    if ok:
        print("Sort succeeded -- no cycles detected. Nothing to flag.\n")
        return
    print(f"Sort FAILED after ordering {len(order)}/{len(all_ids)} accounts.")
    print(f"{len(stuck)} accounts never reached in-degree 0 -- this alone proves a cyclic pattern exists.\n")

    print("== Step 2: Kosaraju's algorithm -- locating the cycles ==")
    sccs = kosaraju_scc(graph)
    flagged = [scc for scc in sccs if len(scc) > 1]
    flagged_ids = {n for scc in flagged for n in scc}
    print(f"Found {len(flagged)} fraud rings ({len(flagged_ids)} accounts total).\n")

    ranked = score_rings(flagged, graph.edges)
    for i, r in enumerate(ranked, 1):
        print(f"  Ring #{i}: {r['size']} accounts | risk score {r['score']}/100")
    print()

    print("== Step 3: Kahn's topological sort AFTER removing flagged accounts ==")
    clean_ids = [n for n in all_ids if n not in flagged_ids]
    ok2, order2, stuck2 = kahn_topological_sort(clean_ids, graph.edges)
    if ok2:
        print(f"Sort succeeded: {len(order2)} accounts ordered into a clean timeline.\n")
    else:
        print(f"Sort still failed on {len(stuck2)} accounts.\n")

    # Output to data folder
    os.makedirs('data', exist_ok=True)
    with open("data/flagged_accounts.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["account_id", "ring_rank", "risk_score", "ring_size"])
        for i, r in enumerate(ranked, 1):
            for acc in r["scc"]:
                w.writerow([acc, i, r["score"], r["size"]])

    with open("data/clean_timeline.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["order", "account_id"])
        for i, acc in enumerate(order2, 1):
            w.writerow([i, acc])

    print("Wrote data/flagged_accounts.csv and data/clean_timeline.csv")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        g = TransactionGraph()
        g.load_csv(sys.argv[1])
    else:
        print("No CSV given -- running on a generated synthetic dataset.\n")
        g = generate_synthetic_network()
    run_pipeline(g)