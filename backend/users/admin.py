from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ['email', 'username', 'phone', 'is_verified', 'is_staff', 'created_at']
    list_filter   = ['is_verified', 'is_staff', 'is_active']
    search_fields = ['email', 'username', 'phone']
    ordering      = ['-created_at']

    fieldsets = (
        (None,           {'fields': ('email', 'password')}),
        ('Personal info',{'fields': ('username', 'phone', 'profile_image', 'bio')}),
        ('Permissions',  {'fields': ('is_active', 'is_staff', 'is_superuser', 'is_verified')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'phone', 'password1', 'password2'),
        }),
    )