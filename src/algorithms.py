from collections import defaultdict, deque
from graph import TransactionGraph

def kosaraju_scc(graph: TransactionGraph):
    """Returns a list of SCCs (each a list of account ids). O(V + E)."""
    visited = set()
    finish_order = []

    def dfs1(start):
        stack = [(start, iter(graph.adj[start]))]
        visited.add(start)
        while stack:
            node, it = stack[-1]
            advanced = False
            for nxt in it:
                if nxt not in visited:
                    visited.add(nxt)
                    stack.append((nxt, iter(graph.adj[nxt])))
                    advanced = True
                    break
            if not advanced:
                finish_order.append(node)
                stack.pop()

    for n in graph.nodes:
        if n not in visited:
            dfs1(n)

    visited2 = set()
    sccs = []

    def dfs2(start):
        stack = [start]
        visited2.add(start)
        comp = []
        while stack:
            u = stack.pop()
            comp.append(u)
            for v in graph.radj[u]:
                if v not in visited2:
                    visited2.add(v)
                    stack.append(v)
        return comp

    for node in reversed(finish_order):
        if node not in visited2:
            sccs.append(dfs2(node))

    return sccs


def kahn_topological_sort(node_ids, edges):
    """
    Attempts to topologically sort node_ids. Returns (success, order, stuck_nodes).
    """
    node_set = set(node_ids)
    indeg = {n: 0 for n in node_ids}
    adj = defaultdict(list)

    for frm, to, *_ in edges:
        if frm in node_set and to in node_set:
            adj[frm].append(to)
            indeg[to] += 1

    queue = deque([n for n in node_ids if indeg[n] == 0])
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)

    success = len(order) == len(node_ids)
    stuck = [] if success else [n for n in node_ids if n not in order]
    return success, order, stuck