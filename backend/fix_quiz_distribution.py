import json
from pathlib import Path

ROOT = Path("apps/courses/prep_content")
fixed_count = 0
for folder in sorted(ROOT.iterdir()):
    if not folder.is_dir() or not (folder / "_meta.json").exists():
        continue
    for d in range(1, 31):
        p = folder / f"day-{d:02d}.json"
        if not p.exists():
            continue
        obj = json.load(open(p, encoding="utf-8"))
        changed = False
        for qi, q in enumerate(obj.get("quiz", [])):
            options = q["options"]
            old_answer = q["answer"]
            correct_text = options[old_answer]
            # Rotate options so correct text moves to a distributed index
            shift = (d + qi) % 4
            new_options = options[shift:] + options[:shift]
            new_answer = (old_answer - shift) % 4
            if new_options != options or new_answer != old_answer:
                q["options"] = new_options
                q["answer"] = new_answer
                changed = True
        if changed:
            with open(p, "w", encoding="utf-8") as f:
                json.dump(obj, f, ensure_ascii=False, indent=2)
            fixed_count += 1
print(f"Rotated quiz options in {fixed_count} day files")
