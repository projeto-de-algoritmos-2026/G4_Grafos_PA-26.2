def score_rings(flagged_sccs, edges):
    """Scores each flagged SCC 0-100 using size, internal volume, edge density, and transfer velocity."""
    feats = []
    for scc in flagged_sccs:
        id_set = set(scc)
        internal = [e for e in edges if e[0] in id_set and e[1] in id_set]
        volume = sum(e[2] for e in internal)
        max_edges = len(scc) * (len(scc) - 1)
        density = len(internal) / max_edges if max_edges else 0
        times = sorted(e[3] for e in internal)
        gaps = [
            (times[i] - times[i - 1]).total_seconds() / 60
            for i in range(1, len(times))
        ]
        avg_gap = sum(gaps) / len(gaps) if gaps else 999
        velocity = max(0, min(60, 60 - avg_gap)) / 60
        feats.append(dict(scc=scc, size=len(scc), volume=volume,
                           density=density, velocity=velocity, avg_gap=avg_gap))

    def minmax(vals):
        lo, hi = min(vals), max(vals)
        return [(v - lo) / (hi - lo) if hi > lo else 0.6 for v in vals]

    if not feats:
        return []

    size_n = minmax([f["size"] for f in feats])
    vol_n = minmax([f["volume"] for f in feats])
    den_n = minmax([f["density"] for f in feats])
    vel_n = minmax([f["velocity"] for f in feats])

    for i, f in enumerate(feats):
        f["score"] = round(100 * (
            0.25 * size_n[i] + 0.35 * vol_n[i] + 0.20 * den_n[i] + 0.20 * vel_n[i]
        ))

    return sorted(feats, key=lambda f: -f["score"])