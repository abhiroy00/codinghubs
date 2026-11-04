"""Turns model text into validated JSON. Never trust the model: check every field against a schema before use.

Schema format (a small subset of JSON Schema):
    {'type': 'object', 'required': [...], 'properties': {name: schema}}
    {'type': 'string', 'maxLength': n, 'minLength': n, 'enum': [...]}
    {'type': 'integer' | 'number', 'minimum': n, 'maximum': n}
    {'type': 'array', 'items': schema, 'minItems': n, 'maxItems': n}
    {'type': 'boolean'}
Unknown properties are dropped. Over-long strings are cut to maxLength; out-of-range numbers are rejected.
"""
import json
import re

from .errors import AIBadResponse

FENCE = re.compile(r'^```(?:json)?\s*|\s*```$', re.IGNORECASE)


def extract_json(text):
    """Parse a JSON value from model output, tolerating code fences and text around the object."""
    cleaned = FENCE.sub('', (text or '').strip()).strip()
    try:
        return json.loads(cleaned)
    except ValueError:
        pass
    start, end = cleaned.find('{'), cleaned.rfind('}')
    if start != -1 and end > start:
        try:
            return json.loads(cleaned[start:end + 1])
        except ValueError:
            pass
    raise AIBadResponse('the model output is not valid JSON')


def validate(value, schema, path='$'):
    """Return a cleaned copy of `value` that matches `schema`, or raise AIBadResponse naming the bad field."""
    kind = schema['type']
    if kind == 'object':
        if not isinstance(value, dict):
            raise AIBadResponse(f'{path}: expected an object')
        cleaned = {}
        for name, sub in schema.get('properties', {}).items():
            if name in value and value[name] is not None:
                cleaned[name] = validate(value[name], sub, f'{path}.{name}')
        missing = [name for name in schema.get('required', []) if name not in cleaned]
        if missing:
            raise AIBadResponse(f'{path}: missing {", ".join(missing)}')
        return cleaned
    if kind == 'array':
        if not isinstance(value, list):
            raise AIBadResponse(f'{path}: expected a list')
        low, high = schema.get('minItems', 0), schema.get('maxItems')
        if len(value) < low or (high is not None and len(value) > high):
            raise AIBadResponse(f'{path}: expected {low}-{high if high is not None else "any"} items, got {len(value)}')
        return [validate(item, schema['items'], f'{path}[{i}]') for i, item in enumerate(value)]
    if kind == 'string':
        if not isinstance(value, str):
            raise AIBadResponse(f'{path}: expected text')
        value = value.strip()
        if len(value) < schema.get('minLength', 0):
            raise AIBadResponse(f'{path}: text is too short')
        if 'enum' in schema and value not in schema['enum']:
            raise AIBadResponse(f'{path}: not one of the allowed values')
        return value[:schema['maxLength']] if 'maxLength' in schema else value
    if kind in ('integer', 'number'):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise AIBadResponse(f'{path}: expected a number')
        if kind == 'integer':
            if isinstance(value, float) and not value.is_integer():
                raise AIBadResponse(f'{path}: expected a whole number')
            value = int(value)
        if value < schema.get('minimum', float('-inf')) or value > schema.get('maximum', float('inf')):
            raise AIBadResponse(f'{path}: number out of range')
        return value
    if kind == 'boolean':
        if not isinstance(value, bool):
            raise AIBadResponse(f'{path}: expected true or false')
        return value
    raise ValueError(f'unknown schema type {kind!r}')  # a bug in our own schema, not in the model output


def parse_and_validate(text, schema):
    return validate(extract_json(text), schema)
