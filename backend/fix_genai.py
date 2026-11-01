import json
from pathlib import Path

folder = Path("apps/courses/prep_content/generative-ai")
exercise_days = ["day-19", "day-22", "day-24", "day-25", "day-27", "day-30"]
body_days = ["day-16", "day-24", "day-27", "day-28"]

for d in exercise_days:
    p = folder / f"{d}.json"
    obj = json.load(open(p, encoding="utf-8"))
    pr = obj["practice"]
    if pr.get("kind") == "exercise":
        # Keep only exercise fields
        keep = {"kind", "title", "difficulty", "objective", "statement", "deliverable", "steps", "checklist", "sample_answer"}
        obj["practice"] = {k: v for k, v in pr.items() if k in keep}
        with open(p, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
        print(f"{d}: cleaned exercise practice")

for d in body_days:
    p = folder / f"{d}.json"
    obj = json.load(open(p, encoding="utf-8"))
    fixed = False
    for iq in obj["interview"]:
        if "body" in iq:
            del iq["body"]
            fixed = True
    if fixed:
        with open(p, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
        print(f"{d}: removed interview body fields")

print("Done")
