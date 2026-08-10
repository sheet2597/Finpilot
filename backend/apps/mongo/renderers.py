from rest_framework.renderers import JSONRenderer
from apps.mongo.utils import serialize

class MongoJSONRenderer(JSONRenderer):
    """Custom JSON renderer that automatically serializes MongoDB BSON types
    (like ObjectId, Decimal128, Binary, datetime, Decimal) recursively
    for all DRF responses.
    """
    def render(self, data, accepted_media_type=None, renderer_context=None):
        serialized_data = serialize(data)
        return super().render(serialized_data, accepted_media_type, renderer_context)
