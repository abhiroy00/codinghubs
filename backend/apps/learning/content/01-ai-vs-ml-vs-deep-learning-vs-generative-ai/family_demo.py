from collections import Counter, defaultdict
from math import fsum, isfinite

END = "<end>"


def number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("Expected a finite bounded number")
    try:
        value = float(value)
    except OverflowError as error:
        raise ValueError("Expected a finite bounded number") from error
    if not isfinite(value) or abs(value) > 1_000_000:
        raise ValueError("Expected a finite bounded number")
    return value


def fit_line(rows):
    if not isinstance(rows, (list, tuple)) or not 2 <= len(rows) <= 10_000:
        raise ValueError("Provide 2 to 10000 training pairs")
    if any(not isinstance(row, (list, tuple)) or len(row) != 2 for row in rows):
        raise ValueError("Each training row must contain x and y")
    pairs = [(number(x), number(y)) for x, y in rows]
    mean_x = fsum(x for x, _ in pairs) / len(pairs)
    mean_y = fsum(y for _, y in pairs) / len(pairs)
    variance = fsum((x - mean_x) ** 2 for x, _ in pairs)
    if variance == 0:
        raise ValueError("Training inputs must vary at supported numerical precision")
    slope = fsum((x - mean_x) * (y - mean_y) for x, y in pairs) / variance
    bias = mean_y - slope * mean_x
    if not isfinite(slope) or not isfinite(bias):
        raise ValueError("Fitted parameters are not finite")
    return slope, bias


def fit_bigram(sentences):
    if not isinstance(sentences, (list, tuple)) or not 1 <= len(sentences) <= 1000:
        raise ValueError("Provide 1 to 1000 training sentences")
    model = defaultdict(Counter)
    for sentence in sentences:
        if not isinstance(sentence, str) or not sentence.strip() or len(sentence) > 10_000:
            raise ValueError("Sentences must be nonempty bounded text")
        tokens = sentence.lower().split()
        if END in tokens:
            raise ValueError("Training text contains the reserved end token")
        for left, right in zip(tokens, tokens[1:] + [END]):
            model[left][right] += 1
    return dict(model)


def generate(model, start, max_tokens=10):
    if not isinstance(start, str) or len(start.split()) != 1:
        raise ValueError("Provide one starting token")
    if type(max_tokens) is not int or not 1 <= max_tokens <= 100:
        raise ValueError("Token limit must be from 1 to 100")
    token = start.lower().strip()
    if token == END or token not in model:
        raise ValueError("Unknown or reserved starting token")
    output = [token]
    for _ in range(max_tokens - 1):
        candidates = model.get(token)
        if not candidates:
            break
        token = min(candidates, key=lambda word: (-candidates[word], word))
        if token == END:
            break
        output.append(token)
    return " ".join(output)


if __name__ == "__main__":
    urgent = True
    print("rule:", "priority" if urgent else "standard")
    slope, bias = fit_line([(0, 1), (1, 3), (2, 5), (3, 7)])
    print(f"learned prediction: {slope * 4 + bias:.3f}")
    model = fit_bigram(["ai learns patterns", "ai learns rules", "ai generates text"])
    print("generated:", generate(model, "ai"))
