import json
from pathlib import Path

fixes = {
    "day-16": {
        2: {
            "options": ["Splitting documents into smaller pieces", "Training the model longer", "Increasing the context window", "Deleting old data"],
            "answer": 0,
        }
    },
    "day-22": {
        4: {
            "options": ["One prompt, one answer", "Think, act, observe, repeat", "Train, test, deploy", "Read, write, delete"],
            "answer": 1,
        }
    },
    "day-24": {
        4: {
            "options": ["Simple tasks one agent can complete", "Every task needs many agents", "Only complex math tasks", "Never use one agent"],
            "answer": 0,
        }
    },
    "day-30": {
        4: {
            "options": ["AI can be biased or wrong", "Humans are faster", "AI always needs help", "Humans write better code"],
            "answer": 0,
        }
    },
}

for day_name, qfixes in fixes.items():
    p = Path(f"apps/courses/prep_content/generative-ai/{day_name}.json")
    obj = json.load(open(p, encoding="utf-8"))
    for qi, fields in qfixes.items():
        obj["quiz"][qi].update(fields)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    print(f"{day_name}: fixed quiz questions")

print("Done")
