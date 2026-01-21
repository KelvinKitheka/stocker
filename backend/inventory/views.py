from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Q, Avg, F, Count
from django.utils import timezone
from datetime import timedelta
from .models import Product, StockBatch, PartialDepletion, LowStockAlert
from .serializers import (
    ProductSerializer, StockBatchSerializer, PartialDepletionSerializer,
    LowStockAlertSerializer, DashboardSerializer
)

# Views
class ProductViewset(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(user=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

@action(detail=False, methods=['get'])
def with_alerts(self, request):
    products = self.get_queryset()
    alerted = []
    for product in products:
        try:
            if product.alert.is_active and product.alert.is_triggered:
                alerted.append({
                    'id': product.id,
                    'name': product.name,
                    'current_stock': float(product.current_stock),
                    'threshold': float(product.alert.threshold_quantity)
                })
        except LowStockAlert.DoesNotExist:
            pass

    return Response(alerted)