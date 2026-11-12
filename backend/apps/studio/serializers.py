import json
import math

from rest_framework import serializers
from .content import COMPANIES, LEVELS, ROLES, TOPICS
from .models import Problem, LearningRecord, StudioSettings, validate_weights


class ProblemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Problem
        fields = ['id', 'slug', 'title', 'kind', 'difficulty', 'topics', 'companies', 'description', 'constraints', 'examples', 'starters', 'version', 'provenance']


class ProblemAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Problem
        fields = '__all__'
        read_only_fields = ['version', 'updated_at']

    def validate(self, attrs):
        for key in ['topics', 'companies', 'examples', 'tests', 'hints']:
            value = attrs.get(key, getattr(self.instance, key, []))
            if not isinstance(value, list) or len(value) > 100:
                raise serializers.ValidationError({key: 'Expected a list with at most 100 entries.'})
        starters = attrs.get('starters', getattr(self.instance, 'starters', {}))
        if not isinstance(starters, dict) or set(starters) - {'python', 'javascript'} or any(not isinstance(v, str) or len(v) > 50000 for v in starters.values()):
            raise serializers.ValidationError({'starters': 'Only Python and JavaScript templates are supported.'})
        for test in attrs.get('tests', getattr(self.instance, 'tests', [])):
            if not isinstance(test, dict) or not {'stdin', 'expected', 'hidden'} <= set(test) or type(test['hidden']) is not bool or any(not isinstance(test[k], str) or len(test[k]) > 10000 for k in ['stdin', 'expected']):
                raise serializers.ValidationError({'tests': 'Each test needs bounded stdin, expected and a hidden boolean.'})
        if any(not isinstance(h, str) or len(h) > 5000 for h in attrs.get('hints', getattr(self.instance, 'hints', []))):
            raise serializers.ValidationError({'hints': 'Hints must be text.'})
        return attrs

    def update(self, instance, validated_data):
        validated_data['version'] = instance.version + 1
        return super().update(instance, validated_data)


class ConfigurationSerializer(serializers.Serializer):
    problem_id = serializers.IntegerField(required=False)
    kind = serializers.ChoiceField(choices=['coding', 'system-design', 'low-level-design'], default='coding')
    mode = serializers.ChoiceField(choices=['interview', 'practice'], default='interview')
    persona = serializers.ChoiceField(choices=['strict', 'balanced', 'coaching'], default='balanced')
    experience = serializers.ChoiceField(choices=LEVELS, default='New Graduate')
    difficulty = serializers.ChoiceField(choices=['easy', 'medium', 'hard', 'mixed'], default='mixed')
    topics = serializers.ListField(child=serializers.ChoiceField(choices=TOPICS), max_length=32, default=list)
    company = serializers.ChoiceField(choices=[''] + COMPANIES, default='')
    role = serializers.ChoiceField(choices=ROLES, default='Software Engineer')
    duration = serializers.ChoiceField(choices=[15, 30, 45, 60, 90], default=45)
    language = serializers.ChoiceField(choices=['python', 'javascript'], default='python')
    run_mode = serializers.ChoiceField(choices=['run', 'no-run'], default='run')


class DraftSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50000, allow_blank=True)
    revision = serializers.IntegerField(min_value=0)
    diagram = serializers.JSONField(required=False)

    def validate_diagram(self, value):
        if not isinstance(value, dict) or len(json.dumps(value)) > 80000:
            raise serializers.ValidationError('Diagram must be an object under 80 KB.')
        for key in ['nodes', 'edges']:
            if not isinstance(value.get(key, []), list) or len(value.get(key, [])) > 100:
                raise serializers.ValidationError('Limit diagrams to 100 nodes and 100 connections.')
        ids = set()
        for node in value.get('nodes', []):
            if not isinstance(node, dict) or not isinstance(node.get('id'), str) or len(node['id']) > 80 or node['id'] in ids:
                raise serializers.ValidationError('Each node needs a unique text ID.')
            ids.add(node['id'])
            position = node.get('position', {})
            if not isinstance(position, dict) or any(type(position.get(k)) not in [int, float] or not math.isfinite(position[k]) or abs(position[k]) > 100000 for k in ['x', 'y']):
                raise serializers.ValidationError('Node positions must be finite coordinates.')
            if not isinstance(node.get('data'), dict) or not isinstance(node['data'].get('label'), str) or len(node['data']['label']) > 100:
                raise serializers.ValidationError('Node labels must be text of at most 100 characters.')
        edge_ids = set()
        for edge in value.get('edges', []):
            if not isinstance(edge, dict) or not isinstance(edge.get('id'), str) or edge['id'] in edge_ids or len(edge['id']) > 200 or edge.get('source') not in ids or edge.get('target') not in ids:
                raise serializers.ValidationError('Connections must have unique IDs and reference existing nodes.')
            edge_ids.add(edge['id'])
            if not isinstance(edge.get('label', ''), str) or len(edge.get('label', '')) > 100:
                raise serializers.ValidationError('Connection labels must be short text.')
        return value


class TurnSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=5000)
    request_id = serializers.UUIDField()


class RunSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=['sample', 'submit', 'custom'], default='sample')
    custom_input = serializers.CharField(max_length=10000, allow_blank=True, default='')


class RecordSerializer(serializers.ModelSerializer):
    kind = serializers.ChoiceField(choices=['roadmap', 'note', 'bookmark', 'preferences'])

    class Meta:
        model = LearningRecord
        fields = ['id', 'kind', 'key', 'data', 'updated_at']
        read_only_fields = ['id', 'updated_at']

    def validate_data(self, value):
        if not isinstance(value, dict) or len(json.dumps(value)) > 80000:
            raise serializers.ValidationError('Expected an object smaller than 80 KB.')
        kind = self.initial_data.get('kind')
        if kind == 'roadmap':
            completed = value.get('completed')
            if not isinstance(completed, list) or len(completed) > 20 or any(type(n) is not int or not 0 <= n < 20 for n in completed) or len(set(completed)) != len(completed):
                raise serializers.ValidationError('Reviewed concepts must be unique indices from 0 to 19.')
        elif kind == 'preferences':
            if value.get('font_size') not in [12, 14, 16, 18, 20] or value.get('theme') not in ['light', 'vs-dark']:
                raise serializers.ValidationError('Choose a supported editor font size and theme.')
        elif kind == 'note':
            if not isinstance(value.get('content'), str) or not value['content'].strip() or len(value['content']) > 12000:
                raise serializers.ValidationError('Notes must contain 1–12,000 characters.')
        return value


class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudioSettings
        fields = ['weights', 'persona_policies']

    def validate_weights(self, value):
        validate_weights(value)
        return value

    def validate_persona_policies(self, value):
        if not isinstance(value, dict) or set(value) - {'strict', 'balanced', 'coaching'}:
            raise serializers.ValidationError('Unknown persona.')
        for item in value.values():
            if not isinstance(item, dict) or set(item) - {'max_hints'} or type(item.get('max_hints')) is not int or not 0 <= item['max_hints'] <= 5:
                raise serializers.ValidationError('Only max_hints (0–5) can be configured.')
        return value
