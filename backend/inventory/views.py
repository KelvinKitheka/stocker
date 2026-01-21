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

class StockBatchViewset(viewsets.ModelViewSet):
    serializer_class = StockBatchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StockBatch.objects.filter(product__user = self.request.user)
    
    @action(detail=False, methods=['post'])
    def mark_depleted(self, request, pk=None):
        batch = self.get_object()
        depletion_status = request.data.get('status', 'finished')

        if depletion_status == 'finished':
            batch.mark_depleted('finished')
        elif depletion_status == 'partly_used':
            quantity_used = request.data.get('quantity_used', batch.remaining_quantity)
            PartialDepletion.objects.create(
                batch = batch,
                quantity_used = quantity_used,
                notes = request.data.get('notes', '')
            )
            serializer = self.get_serializer(batch)
            return Response(serializer.data)
        

    @action(detail=True, methods=['get'])
    def active(self, request):
        batches = self.get_queryset().filter(is_depleted=False)
        serializer = self.get_serializer(batches, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def depleted_today(self, request):
        today = timezone.now().date()
        batches = self.get_queryset().filter(
            is_depleted = True,
            depleted_at__date = today
        )
        return Response({'count': batches.count()})