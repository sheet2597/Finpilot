import logging

from django.apps import AppConfig

logger = logging.getLogger("apps.system")


class SystemConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.system"
