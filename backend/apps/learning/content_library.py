"""Load repository-owned lesson sources. This module never executes lesson code."""
import json
from pathlib import Path
from django.core.exceptions import ValidationError
from .quality import PARTS, validate_content

ROOT = Path(__file__).resolve().parent / 'content'


def library_slugs():
    if not ROOT.exists():
        return []
    return sorted(p.name for p in ROOT.iterdir() if p.is_dir() and (p / 'metadata.json').is_file())


def local_file(directory, name):
    path = (directory / name).resolve()
    if path.parent != directory.resolve() or not path.is_file():
        raise ValidationError(f'Invalid lesson asset: {name}')
    return path


def load_lesson(slug):
    if slug not in library_slugs():
        raise ValidationError(f'Unknown curated lesson: {slug}')
    directory = ROOT / slug
    metadata = json.loads(local_file(directory, 'metadata.json').read_text(encoding='utf-8'))
    if metadata['slug'] != slug:
        raise ValidationError('Lesson folder and metadata slug must agree.')
    examples = {item['file']: item for item in metadata.get('examples', [])}
    if len(examples) != len(metadata.get('examples', [])):
        raise ValidationError('Example filenames must be distinct.')
    used = set()
    content, order, part, title, buffer = {}, [], None, None, []

    def flush():
        text = '\n'.join(buffer).strip()
        if text:
            if part is None or title is None:
                raise ValidationError('Lesson prose must belong to a part and section.')
            content[part]['blocks'].append({'type': 'text', 'title': title, 'body': text})
        buffer.clear()

    for line in local_file(directory, 'lesson.md').read_text(encoding='utf-8').splitlines():
        if line.startswith('# '):
            flush()
            part = line[2:].strip()
            if part not in PARTS or part in content:
                raise ValidationError('Use each of the four learning parts exactly once.')
            order.append(part)
            content[part] = {'blocks': []}
            title = None
        elif line.startswith('## '):
            flush()
            title = line[3:].strip()
            if part is None or not title:
                raise ValidationError('Each section requires a part and a heading.')
        elif line.startswith('!python '):
            flush()
            name = line[8:].strip()
            if part != 'practice' or not title or name not in examples or name in used:
                raise ValidationError('Declare each Python example once, in the practice part.')
            code = local_file(directory, name).read_text(encoding='utf-8').strip()
            content[part]['blocks'].append({'type': 'code', 'title': title, 'body': code,
                                           'expected_output': examples[name]['expected_output']})
            used.add(name)
        else:
            buffer.append(line)
    flush()
    if tuple(order) != PARTS or used != set(examples):
        raise ValidationError('Four parts must be ordered correctly and every example must be included.')
    assessment = json.loads(local_file(directory, 'assessment.json').read_text(encoding='utf-8'))
    if 'blocks' in assessment:
        raise ValidationError('Assessment prose belongs in lesson.md.')
    content['assessment'].update(assessment)
    for diagram in metadata.get('diagrams', []):
        if diagram['part'] not in PARTS:
            raise ValidationError('Invalid diagram part.')
        content[diagram['part']]['blocks'].append({'type': 'diagram', 'title': diagram['title'], 'body': diagram['body']})
    validate_content(content, publishing=True)
    return metadata, content
