import json, glob
bad = 0
for f in sorted(glob.glob('apps/courses/prep_content/*/day-*.json')):
    try:
        json.load(open(f, encoding='utf-8'))
    except Exception as e:
        print('BAD', f, e)
        bad += 1
print('All JSON valid' if bad == 0 else f'{bad} bad files')
