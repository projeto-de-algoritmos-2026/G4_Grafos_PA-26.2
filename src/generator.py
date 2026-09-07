import random
from datetime import datetime, timedelta
from graph import TransactionGraph

def generate_synthetic_network(seed=42, num_legit=200, num_rings=4):
    rng = random.Random(seed)
    graph = TransactionGraph()
    base_time = datetime(2026, 8, 1, 8, 0, 0)

    layers = 6
    accounts = [f"ACC-{i:04d}" for i in range(num_legit)]
    layer_of = {a: rng.randint(0, layers - 1) for a in accounts}

    target_edges = int(num_legit * 1.6)
    attempts = 0
    while len(graph.edges) < target_edges and attempts < target_edges * 25:
        attempts += 1
        a = rng.choice(accounts)
        if layer_of[a] >= layers - 1:
            continue
        candidates = [x for x in accounts if layer_of[x] > layer_of[a]]
        if not candidates:
            continue
        b = rng.choice(candidates)
        amount = rng.randint(50, 5000) * 10
        ts = base_time + timedelta(hours=layer_of[a] * 3 + rng.randint(0, 2),
                                    seconds=rng.randint(0, 3000))
        graph.add_edge(a, b, amount, ts)

    next_id = num_legit
    for r in range(num_rings):
        size = rng.randint(3, 7)
        ring = [f"ACC-{next_id + i:04d}" for i in range(size)]
        next_id += size

        t0 = base_time + timedelta(hours=rng.randint(0, (layers - 1) * 3),
                                    seconds=rng.randint(0, 3000))
        amt = rng.randint(20000, 80000)
        for i in range(size):
            frm, to = ring[i], ring[(i + 1) % size]
            amt = round(amt * rng.uniform(0.90, 0.98))
            t0 += timedelta(minutes=rng.randint(1, 25))
            graph.add_edge(frm, to, amt, t0)

        entry_pool = [a for a in accounts if layer_of[a] <= 2]
        n_entries = rng.randint(1, min(3, len(entry_pool)))
        entry_srcs = rng.sample(entry_pool, n_entries)
        for src in entry_srcs:
            target = rng.choice(ring)
            graph.add_edge(src, target, round(amt * 1.1 / n_entries),
                            t0 - timedelta(minutes=rng.randint(30, 90)))

        exit_pool = [a for a in accounts if layer_of[a] >= layers - 2]
        n_exits = rng.randint(1, min(3, len(exit_pool)))
        exit_sinks = rng.sample(exit_pool, n_exits)
        for sink in exit_sinks:
            source = rng.choice(ring)
            graph.add_edge(source, sink, round(amt * 0.85 / n_exits),
                            t0 + timedelta(minutes=rng.randint(5, 20)))

    return graph