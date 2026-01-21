from django.db.models import Sum, Q
from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from .models import Product, StockBatch, PartialDepletion, LowStockAlert

class ProductSerializer(serializers.ModelSerializer):
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
    
class StockBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    estimated_profit = serializers.SerializerMethodField()
    profit_margin = serializers.SerializerMethodField()
    days_in_stock = serializers.SerializerMethodField()
    velocity = serializers.SerializerMethodField()
    total_buy_cost = serializers.SerializerMethodField()

    class Meta:
        model = StockBatch
        fields = ['id', 'product', 'product_name', 'quantity', 'remaining_quantity',
                'buy_price_per_unit', 'sell_price_per_unit', 'added_at', 'depleted_at',
                'is_depleted', 'notes', 'estimated_profit', 'profit_margin', 
                'days_in_stock', 'velocity', 'total_buy_cost']
        read_only_fields = ['depleted_at', 'is_depleted']


    def get_estimated_profit(self, obj):
        return float(obj.estimated_profit)
    
    def get_profit_margin(self, obj):
        return float(obj.profit_margin)
    
    def get_days_in_stock(self, obj):
        return obj.days_in_stock
    
    def get_velocity(self, obj):
        return obj.velocity
    
    def get_total_buy_cost(self, obj):
        return float(obj.total_buy_cost)
    
    def create(self, validated_data):
        validated_data['remaining_quantity'] = validated_data['quantity']
        return super().create(validated_data)
    
class PartialDepletionSerializer(serializers.ModelSerializer):
    batch_info = serializers.SerializerMethodField()
    
    class Meta:
        model = PartialDepletion
        fields = ['id', 'batch', 'quantity_used', 'recorded_at', 'notes', 'batch_info']
        read_only_fields = ['recorded_at']
    
    def get_batch_info(self, obj):
        return {
            'product': obj.batch.product.name,
            'remaining': float(obj.batch.remaining_quantity)
        }
    
class LowStockAlertSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    current_stock = serializers.SerializerMethodField()
    is_triggered = serializers.SerializerMethodField()
    
    class Meta:
        model = LowStockAlert
        fields = ['id', 'product', 'product_name', 'threshold_quantity', 
                  'is_active', 'current_stock', 'is_triggered', 'created_at']
        read_only_fields = ['created_at']
    
    def get_current_stock(self, obj):
        return float(obj.product.current_stock)
    
    def get_is_triggered(self, obj):
        return obj.is_triggered
    

class DashboardSerializer(serializers.Serializer):
    """Dashboard statistics"""
    daily_profit = serializers.DecimalField(max_digits=10, decimal_places=2)
    stock_depleted_count = serializers.IntegerField()
    low_stock_alerts = serializers.ListField()
    income_this_week = serializers.DecimalField(max_digits=10, decimal_places=2)
    fast_movers = serializers.ListField()
    slow_movers = serializers.ListField()
    weekly_summary = serializers.ListField()
    total_profit_week = serializers.DecimalField(max_digits=10, decimal_places=2)
    avg_stock_turnover = serializers.FloatField()