from django.db.models import Sum, Q
from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from .models import Product, StockBatch, PartialDepletion, LowStockAlert

class ProductSerializers(serializers.ModelSerializer):
    current_stock = serializers.SerializerMethodField()
    total_value = serializers.SerializerMethodField()
    has_alert = serializers.SerializerMethodField()
    average_velocity = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'category', 'default_sell_price', 'current_stock', 
        'total_value', 'is_active', 'created_at', 'has_alert', 'average_velocity']
        read_only_fields = ['created_at']

    def get_current_stock(self, obj):
        return float(obj.current_stock)
    
    def get_total_value(self, obj):
        return float(obj.total_value)
    
    def get_has_alert(self, obj):
        try:
            return obj.alert.is_triggered if obj.alert.is_active else False
        except LowStockAlert.DoesNotExist:
            return False
        
    def get_average_velocity(self, obj):
        return obj.average_velocity
