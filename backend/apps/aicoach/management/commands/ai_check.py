from django.core.management.base import BaseCommand

from apps.aicoach.ai_services import ai_manager
from apps.aicoach.ai_services.errors import AIError
from apps.aicoach.ai_services.prompt_templates import build_system

SCHEMA = {'type': 'object', 'required': ['ok'], 'properties': {'ok': {'type': 'boolean'}, 'message': {'type': 'string', 'maxLength': 200}}}


class Command(BaseCommand):
    help = 'Make one tiny real call to every configured AI provider to confirm the keys and model names work.'

    def handle(self, *args, **options):
        configured = ai_manager.provider_chain()  # every configured model, in the order real requests will try them
        for name, cls in ai_manager.PROVIDERS.items():
            if not cls().configured:
                self.stdout.write(self.style.WARNING(f'{name}: no API key set (skipped)'))
        if not configured:
            self.stdout.write(self.style.ERROR('No AI provider is configured. Set GEMINI_API_KEY and/or GROQ_API_KEY in backend/.env.'))
            return
        for service in configured:
            try:
                reply = ai_manager.generate_json(
                    feature='ai_check', providers=[service], max_output_tokens=1024, temperature=0,
                    system=build_system('Reply with {"ok": true, "message": "ready"}.'), prompt='Health check.', schema=SCHEMA,
                )
            except AIError as error:
                self.stdout.write(self.style.ERROR(f'{service.name} ({service.model}): FAILED - {error}'))
                continue
            self.stdout.write(self.style.SUCCESS(
                f'{service.name} ({reply.model}): OK - {reply.data} [{reply.prompt_tokens} prompt + {reply.completion_tokens} completion tokens]'))
