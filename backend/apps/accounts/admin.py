from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + ((None, {'fields': ('phone', 'google_sub')}),)
    readonly_fields = ('google_sub',)
    list_display = ('username', 'email', 'phone', 'is_staff', 'date_joined')
    search_fields = ('username', 'email', 'phone')


admin.site.register(User, UserAdmin)
