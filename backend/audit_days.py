import json, glob, os
for f in sorted(glob.glob('apps/courses/prep_content/*/_meta.json')):
    m = json.load(open(f, encoding='utf-8'))
    d = os.path.dirname(f)
    days = [x for x in os.listdir(d) if x.startswith('day-') and x.endswith('.json')]
    print(os.path.basename(d) + ': ' + str(len(days)) + ' days | source: ' + str(m.get('source','?')) + ' | courses: ' + str(m.get('courses',[])))
