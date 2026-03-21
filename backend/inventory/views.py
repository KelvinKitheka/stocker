from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Q, Avg, F, Count, ExpressionWrapper, DecimalField
from django.utils import timezone
from datetime import timedelta
from .models import Product, StockBatch, PartialDepletion, LowStockAlert
from django.db.models.functions import TruncDate, TruncMonth
from decimal import Decimal
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
    
    @action(detail=True, methods=['post'])
    def deplete(self, request, pk = None):
        product = self.get_object()
        status = request.data.get('status', 'finished')
        quantity_used = request.data.get('quantity_used')

        batch = StockBatch.objects.filter(
            product = product,
            is_depleted = False,
            remaining_quantity__gt = 0
        ).order_by('added_at').first()

        if not batch:
            return Response({'error': 'No active stock found'}, status=404)
        
        if status == 'finished':
            batch.mark_depleted('finished')
        elif status == 'partly_used':
            PartialDepletion.objects.create(
                batch=batch,
                quantity_used=quantity_used or batch.remaining_quantity,
                notes = request.data.get('notes', '')
            )
        return Response({'success': True, 'batch_id': batch.id})

class StockBatchViewset(viewsets.ModelViewSet):
    serializer_class = StockBatchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = StockBatch.objects.filter(product__user = self.request.user)
        product_id = self.request.query_params.get('product')
        is_depleted = self.request.query_params.get('is_depleted')
        if product_id:
            qs = qs.filter(product__id = product_id)
        if is_depleted is not None:
            qs = qs.filter(is_depleted=is_depleted.lower() == 'true')
        return qs
    
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
        batches = self.get_queryset().filter(remaining_quantity__gt = 0
        ).values('product__id', 'product__name').annotate(
        total_remaining=Sum('remaining_quantity')
        )
        return Response(list(batches))

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
        return LowStockAlert.objects.filter(product__user = self.request.user)
    
    @action(detail=False, methods=['get'])
    def triggered(self, request):
        alerts = self.get_queryset().filter(is_active=True)
        triggered = [alert for alert in alerts if alert.is_triggered]
        serializer = self.get_serializer(triggered, many=True)
        return Response(serializer.data)
    

class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    def profit_expr(self):
        return ExpressionWrapper(
            (F('quantity') - F('remaining_quantity')) * (F('buy_price_per_unit') - F('sell_price_per_unit')),
            output_field=DecimalField(max_digits=20, decimal_places=2)
        )

    def revenue_expr(self):
        return ExpressionWrapper(
            (F('quantity') - F('remaining_quantity')) * (F('sell_price_per_unit')),
            output_field=DecimalField(max_digits=20, decimal_places=2)
        )
    

    def cost_expr(self):
        return ExpressionWrapper(
            (F('quantity') - F('remaining_quantity')) * (F('buy_price_per_unit')),
            output_field=DecimalField(max_digits=20, decimal_places=2)
        )


class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        user = request.user
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)

        profit_expr = ExpressionWrapper(
            (F('quantity') - F('remaining_quantity')) *
            (F('sell_price_per_unit') - F('buy_price_per_unit')),
            output_field=DecimalField(max_digits=20, decimal_places=2)
        )

        depleted_qs = StockBatch.objects.filter(
            product__user = user,
            is_depleted = True
        )

        # Daily profit from stock depleted today
        daily_profit = depleted_qs.filter(
            depleted_at__date = today
        ).aggregate(
            total = Sum(profit_expr)
        )['total'] or 0

        # Stock depleted count today
        depleted_count = depleted_qs.filter(
            depleted_at__date = today
        ).count()

        


        # Low stock alerts
        alerts = []
        products = Product.objects.filter(user = user, is_active = True)
        for product in products:
            try:
                if product.alert.is_active and product.alert.is_triggered:
                    alerts.append({
                        'product': product.name,
                        'remaining': float(product.current_stock()),
                        'threshold': float(product.alert.threshold_quantity)
                    })
            except LowStockAlert.DoesNotExist:
                pass

        # Weekly income
        weekly_income = depleted_qs.filter(
            depleted_at__date__gte = week_ago
        ).aggregate(
            total = Sum(F('quantity') * F('sell_price_per_unit'))
        )['total'] or 0

        # Weekly profit
        weekly_profit = depleted_qs.filter(
            depleted_at__date__gte = week_ago
        ).aggregate(
            total = Sum(profit_expr)
            )['total'] or 0
        

        # weekly summary
        daily_rows = depleted_qs.filter(
            depleted_at__date__gte = week_ago
        ).annotate(
            day = TruncDate('depleted_at')
        ).values('day').annotate(
            profit=Sum(profit_expr)
        ).order_by('day')

        profit_by_day ={row['day']: row['profit'] for row in daily_rows}
        weekly_data = []
        for i in range(7):
            day = week_ago + timedelta(days=i)
            weekly_data.append({
                'day': day.strftime('%a'),
                'profit': profit_by_day.get(day, Decimal('0'))
            })

        velocity_rows = depleted_qs.values(
            'product__name', 'added_at', 'depleted_at'
        ).annotate(
            sold=ExpressionWrapper(
                F('quantity') - F('remaining_quantity'),
                output_field=DecimalField(max_digits=20, decimal_places=2)
            )
        )

        product_velocity_map = {}
        turnover_days = []

        for row in velocity_rows:
            delta = row['depleted_at'] - row['added_at']
            days = max(delta.days, 1)
            turnover_days.append(days)
            vel = float(row['sold']) / days
            name = row['product__name']
            if name not in product_velocity_map:
                product_velocity_map[name] = []
            product_velocity_map[name].append(vel)

        
        avg_turnover = sum(turnover_days) / len(turnover_days) if turnover_days else 0
        avg_velocities = {
            name: sum(vels) / len(vels)
            for name, vels in product_velocity_map.items()
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



        # Active batches
        active_batches = StockBatch.objects.filter(
            product__user = user,
            is_depleted = False,
            remaining_quantity__gt = 0).values('id', 'remaining_quantity', 'product__name')


        data = {
            'user': {
                'first_name': user.first_name,
                'username': user.username
            },
            'daily_profit': daily_profit,
            'stock_depleted': depleted_count,
            'low_stock_alerts': alerts,
            'income_this_week': weekly_income,
            'fast_movers': fast_movers,
            'slow_movers': slow_movers,
            'weekly_summary': weekly_data,
            'total_profit_week': weekly_profit,
            'avg_stock_turnover': round(avg_turnover, 1),
            'active_batches': list(active_batches)
        }

        return Response(data)

