import json
from pathlib import Path

folder = Path("apps/courses/prep_content/ai-full-stack")
changed = 0
zero_count = 0
for d in range(1, 31):
    p = folder / f"day-{d:02d}.json"
    obj = json.load(open(p, encoding="utf-8"))
    for qi, q in enumerate(obj.get("quiz", [])):
        if q.get("answer") == 0:
            zero_count += 1
            if zero_count % 2 == 0:  # change every other one
                q["answer"] = 3
                changed += 1
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
print(f"Changed {changed} of {zero_count} zero answers to 3 in ai-full-stack")
