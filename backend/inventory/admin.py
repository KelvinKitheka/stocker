from django.contrib import admin
from .models import Product, StockBatch, PartialDepletion, LowStockAlert

# Register  models
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'default_sell_price', 'is_active', 'created_at']
    list_filter = ['is_active', 'category', 'created_at']
    search_fields = ['name', 'category']
    readonly_fields = ['total_value', 'created_at']



@admin.register(StockBatch)
class StockBatchAdmin(admin.ModelAdmin):
    list_display = ['product', 'quantity', 'remaining_quantity', 'buy_price_per_unit', 
    'sell_price_per_unit', 'is_depleted', 'added_at', 'depleted_at']
    list_filter = ['is_depleted', 'depleted_at', 'added_at']
    search_fields = ['product__name', 'notes']
    readonly_fields = ['estimated_profit', 'profit_margin', 'days_in_stock', 'velocity']
    date_hierarchy = 'added_at'

@admin.register(PartialDepletion)
class PartialDepletionAdmin(admin.ModelAdmin):
    list_display = ['batch', 'quantity_used', 'recorded_at']
    list_filter = ['recorded_at']
    search_fields = ['batch__product__name', 'notes']
    date_hierarchy = 'recorded_at'


@admin.register(LowStockAlert)
class LowStockAlertAdmin(admin.ModelAdmin):
    list_display = ['product', 'threshold_quantity', 'is_active', 'is_triggered', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['product__name']
    readonly_fields = ['is_triggered']

