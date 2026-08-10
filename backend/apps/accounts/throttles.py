from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    scope = "login"

    def get_cache_key(self, request, view):
        email = (request.data.get("email") or "anonymous").lower()
        ident = f"{email}:{self.get_ident(request)}"
        return self.cache_format % {"scope": self.scope, "ident": ident}


class OTPRateThrottle(SimpleRateThrottle):
    scope = "otp"

    def get_cache_key(self, request, view):
        email = (request.data.get("email") or "anonymous").lower()
        ident = f"{email}:{self.get_ident(request)}"
        return self.cache_format % {"scope": self.scope, "ident": ident}
