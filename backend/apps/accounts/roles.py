from enum import Enum

class UserRole(Enum):
    CA = "CA"
    ADMIN = "Admin"

    @classmethod
    def get_role_for_user(cls, user) -> "UserRole":
        if not user or not user.is_authenticated:
            raise ValueError("User must be authenticated to determine role.")
        if user.is_superuser or user.is_staff:
            return cls.ADMIN
        return cls.CA
