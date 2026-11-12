from collections import deque


def shortest_path(graph, start, goal, max_expansions=100):
    """Return a shortest edge-count route, None if unreachable; reject invalid inputs."""
    if not isinstance(graph, dict) or not graph:
        raise ValueError("Expected a nonempty graph dictionary")
    if any(not isinstance(node, str) or not node for node in graph):
        raise ValueError("Node identifiers must be nonempty strings")
    for neighbors in graph.values():
        if not isinstance(neighbors, (tuple, list)):
            raise ValueError("Neighbors must be lists or tuples")
        if any(not isinstance(node, str) or node not in graph for node in neighbors):
            raise ValueError("Every neighbor must name a known node")
    if not isinstance(start, str) or not isinstance(goal, str) or start not in graph or goal not in graph:
        raise ValueError("Unknown start or goal")
    if type(max_expansions) is not int or max_expansions <= 0:
        raise ValueError("Expansion budget must be a positive integer")

    frontier = deque([start])
    parent = {start: None}
    expanded = 0
    while frontier:
        node = frontier.popleft()
        if node == goal:
            route = []
            while node is not None:
                route.append(node)
                node = parent[node]
            return list(reversed(route))
        if expanded >= max_expansions:
            raise RuntimeError("Expansion budget exhausted")
        expanded += 1
        for neighbor in sorted(graph[node]):
            if neighbor not in parent:
                parent[neighbor] = node
                frontier.append(neighbor)
    return None


if __name__ == "__main__":
    workflow = {
        "received": ["verified", "review"],
        "verified": ["resolved"],
        "review": ["verified"],
        "resolved": [],
        "archived": [],
    }
    route = shortest_path(workflow, "received", "resolved")
    print("route:", " -> ".join(route))
    print("missing route:", shortest_path(workflow, "received", "archived"))
    try:
        shortest_path(workflow, "missing", "resolved")
    except ValueError as error:
        print("rejected:", error)
