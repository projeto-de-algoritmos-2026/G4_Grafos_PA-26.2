import csv
from collections import defaultdict
from datetime import datetime

class TransactionGraph:
    """Directed graph of accounts (nodes) and wire transfers (edges),
    stored as an adjacency list, O(V+E) memory."""

    def __init__(self):
        self.adj = defaultdict(list)
        self.radj = defaultdict(list)
        self.edges = []
        self.nodes = set()

    def add_edge(self, frm, to, amount, timestamp):
        self.nodes.add(frm)
        self.nodes.add(to)
        self.adj[frm].append(to)
        self.radj[to].append(frm)
        self.edges.append((frm, to, amount, timestamp))

    def load_csv(self, path):
        with open(path, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                ts = datetime.fromisoformat(row["timestamp"])
                self.add_edge(row["from"], row["to"], float(row["amount"]), ts)