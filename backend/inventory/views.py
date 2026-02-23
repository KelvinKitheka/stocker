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
    
    @action(detail=True, methods=['post'])
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
        

    @action(detail=False, methods=['get'])
    def active(self, request):
        batches = self.get_queryset().filter(remaining_quantity__gt = 0)
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

class LowStockAlertViewSet(viewsets.ModelViewSet):
    serializer_class = LowStockAlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LowStockAlert.objects.all(product__user = self.request.user)
    
    @action(detail=False, methods=['get'])
    def triggered(self, request):
        alerts = self.get_queryset().filter(is_active=True)
        triggered = [alert for alert in alerts if alert.is_triggered]
        serializer = self.get_serializer(triggered, many=True)
        return Response(serializer.data)
    


class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        user = request.user
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)

        # Daily profit from stock depleted today
        daily_profit = StockBatch.objects.filter(
            product__user = user,
            is_depleted = True,
            deplated_at__date = today
        ).aggregate(
            total = Sum(F('quantity') * (F('sell_price_per_unit') - F('buy_price_per_unit')))
        )['total'] or 0

        # Stock depleted count today
        depleted_count = StockBatch.objects.filter(
            product__user = user,
            is_depleted = True,
            depleted_at__date = today
        )

        


        # Low stock alerts
        alerts = []
        products = LowStockAlert.objects.filter(user = user, is_active = True)
        for product in products:
            try:
                if products.alert.is_active and product.alert.is_triggered:
                    alerts.append({
                        'product': product.name,
                        'remaining': float(product.current_stock),
                        'threshold': float(product.alert.threshold_quantity)
                    })
            except LowStockAlert.DoesNotExist:
                pass

        # Weekly income
        weekly_income = StockBatch.objects.filter(
            product__user = user,
            is_depleted = True,
            depleted_at__gte = week_ago
        ).aggregate(
            total = Sum(F('quantity') * F('sell_price_per_unit'))
        )['total'] or 0

        # Weekly profit
        weekly_profit = StockBatch.objects.filter(
            product__user = user,
            is_depleted = True,
            depleted_at = week_ago
        ).aggregate(
            total = Sum(F('quantity') - (F('sell_price_per_unit')- F('buy_price_per_unit')))
            )['total'] or 0
        
       
        # Product velocity
        all_batches = StockBatch.objects.filter(product__user = user, is_depleted=True)
        product_velocities = {}
        for batch in all_batches:
            prod_name = batch.product.name
            if prod_name not in product_velocities:
                product_velocities[prod_name]  = []
            product_velocities[prod_name].append(batch.velocity)

        avg_velocities = {
            name: sum(vels) / len(vels)
            for name, vels in product_velocities.items()
        }

        sorted_products = sorted(avg_velocities.items(), key=lambda x: x[1], reverse=True)
        fast_movers = [
            {'product': name, 'velocity': round(vel, 2)}
            for name, vel in sorted_products[:3]
        ]

        slow_movers = [
            {'product': name, 'velocity': round(vel, 2)}
            for name, vel in sorted_products[-3:]
        ]


        #weekly summary
        weekly_data = []
        for i in range(7):
            day = today - timedelta(days=6-i)
            day_profit = StockBatch.objects.filter(
                product__user = user,
                is_depleted = True,
                depleted_at__date = day
            ).aggregate(
                total = Sum(F('quantity') * (F('sell_price_per_unit') - F('buy_price_per_unit')))
            )['total'] or 0
            weekly_data.append({
                'day': day.strftime('%a'),
                'profit': float(day_profit)
            })

        turnover_rates = [batch.days_in_stock for batch in all_batches]
        avg_turnover = sum(turnover_rates) / len(turnover_rates) if turnover_rates else 0

        data = {
            'daily_profit': day_profit,
            'stock_depleted': depleted_count,
            'low_stock_alerts': alerts,
            'income_this_week': weekly_income,
            'fast_movers': fast_movers,
            'slow_movers': slow_movers,
            'weekly_summary': weekly_data,
            'total_profit_week': weekly_profit,
            'avg_stock_turnover': round(avg_turnover, 1)
        }

        return Response(data)




        
































