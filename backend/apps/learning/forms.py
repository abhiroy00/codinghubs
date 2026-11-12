from django import forms
from .models import Concept
from .quality import PARTS, validate_content


class ConceptForm(forms.ModelForm):
    expected_edit_version = forms.IntegerField(min_value=0, widget=forms.HiddenInput)
    concept = forms.JSONField(label='Part 1 · Deep concept learning')
    practice = forms.JSONField(label='Part 2 · Practical examples and code')
    industry = forms.JSONField(label='Part 3 · Industry implementation')
    assessment = forms.JSONField(label='Part 4 · Questions, assessments and tasks')

    class Meta:
        model = Concept
        exclude = ('content',)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['expected_edit_version'].initial = self.instance.edit_version
        for part in PARTS:
            self.fields[part].initial = self.instance.content.get(part, {'blocks': []})
            self.fields[part].widget.attrs.update(rows=16, cols=100)

    def clean(self):
        data = super().clean()
        if self.instance.pk and data.get('expected_edit_version') != Concept.objects.get(pk=self.instance.pk).edit_version:
            raise forms.ValidationError('Another editor saved this lesson. Reload before editing; your submitted text has not been saved.')
        if all(part in data for part in PARTS):
            content = {part: data[part] for part in PARTS}
            validate_content(content)
            self.instance.content = content
        return data
