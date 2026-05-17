from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Q, Prefetch, F, Count, ExpressionWrapper, DecimalField, Avg, FloatField, Value
from django.utils import timezone
from datetime import timedelta
from .models import Product, StockBatch, PartialDepletion, LowStockAlert
from django.db.models.functions import TruncDate, TruncMonth, Greatest, Extract, Coalesce
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
        return Product.objects.filter(user=self.request.user, is_active=True).annotate(
            stock_sum = Sum(
                'batches__remaining_quantity',
                filter=Q(batches__is_depleted=False)
            ), 

            stock_value = Sum(
                ExpressionWrapper(
                    F('batches__remaining_quantity') * F('batches__buy_price_per_unit'),
                    output_field=DecimalField(max_digits=20, decimal_places=2)
                ),
                filter=Q(batches__is_depleted = False)
            ),
            alert_threshold = F('alert__threshold_quantity'),
            alert_active = F('alert__is_active'),
        ).prefetch_related(
            Prefetch(
                'batches',
                queryset = StockBatch.objects.filter(is_depleted=True),
                to_attr = 'depleted_batches'
            )
        )
    
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
        qs = StockBatch.objects.filter(product__user = self.request.user).select_related('product')
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
            (F('quantity') - F('remaining_quantity')) * (F('sell_price_per_unit') - F('buy_price_per_unit')),
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
    
    def list(self, request):
        user = request.user
        all_batches = StockBatch.objects.filter(product__user = user)
        depleted = all_batches.filter(is_depleted=True)

        total_revenue = depleted.aggregate(v=Sum(self.revenue_expr()))['v'] or Decimal('0')
        total_cost = depleted.aggregate(v=Sum(self.cost_expr()))['v'] or Decimal('0')
        total_profit = total_revenue - total_cost
        overall_margin = round((total_profit / total_cost) * 100, 1) if total_cost > 0 else 0

        active_value = sum(
            b.remaining_quantity * b.buy_price_per_unit
            for b in all_batches.filter(is_depleted = False)
        )

        total_batches = all_batches.count()
        depleted_batches = depleted.count()
        active_batches = total_batches- depleted_batches

        return Response({
            'total_revenue': total_revenue,
            'total_cost': total_cost,
            'total_profit': total_profit,
            'overall_margin': overall_margin,
            'active_stock_value': active_value,
            'total_batches': total_batches,
            'depleted_batches': depleted_batches,
            'active_batches': active_batches
        })

    @action(detail = False, methods=['get'])
    def by_product(self, request):
        user = request.user
        depleted = StockBatch.objects.filter(product__user = user, is_depleted = True)
        rows = depleted.values(
            'product__id', 'product__name', 'product__category'
        ).annotate(
            revenue=Sum(self.revenue_expr()),
            cost = Sum(self.cost_expr()),
            profit = Sum(self.profit_expr()),
            batches_sold = Count('id'),
            units_sold = Sum(ExpressionWrapper(
                F('quantity') - F('remaining_quantity'),
                output_field=DecimalField(max_digits=20, decimal_places=2)
            ))
        ).order_by('-profit')

        result = []
        for r in rows:
            cost = r['cost'] or Decimal('0')
            profit = r['profit'] or Decimal('0')
            margin = round((profit / cost) * 100, 1) if cost > 0 else 0

            result.append({
                'product_id': r['product__id'],
                'product': r['product__name'],
                'category': r['product__category'],
                'revenue': r['revenue'],
                'cost': cost,
                'profit': profit,
                'margin': margin,
                'batches_sold': r['batches_sold'],
                'units_sold': r['units_sold']
            })
        return Response(result)

    @action(detail=False, methods=['get'])
    def by_name(self, request):
        user = request.user
        rows = StockBatch.objects.filter(
            product__user = user,
            is_depleted = True
        ).values(
            'product__name', 'product__id', 'product__brand'
        ).annotate(
            revenue = Sum(self.revenue_expr()),
            cost = Sum(self.cost_expr()),
            profit = Sum(self.profit_expr()),
            batches_sold = Count('id'),
            units_sold = Sum(
                ExpressionWrapper(
                    F('quantity') - F('remaining_quantity'),
                    output_field=DecimalField(max_digits=20, decimal_places=2)
                )
            )
        ).order_by('product__name', '-profit')

        groups = {}

        for row in rows:
            name = row['product__name']
            cost = row['cost'] or Decimal('0')
            profit = row['profit'] or Decimal('0')
            
            variant = {
                'product_id': row['product__id'],
                'brand': row['product__brand'] or 'no brand',
                'revenue': row['revenue'],
                'cost': cost,
                'profit': profit,
                'units': row['units_sold']
            }

            if name not in groups:
                groups[name] = {
                    'name': name,
                    'revenue': Decimal('0'),
                    'cost': Decimal('0'),
                    'profit': Decimal('0'),
                    'batches_sold': 0,
                    'units_sold': Decimal('0'),
                    'variants': [],
                }

            g = groups[name]
            g['revenue'] += row['revenue'] or Decimal('0')
            g['cost'] += cost
            g['profit'] += profit
            g['batches_sold'] += row['batches_sold']
            g['units_sold'] += row['units_sold'] or Decimal('0')
            g['variants'].append(variant)

        
        result = []
        for g in sorted(groups.values(), key=lambda x: x['profit'], reverse=True):
            g['variants'].sort(key=lambda x: x['profit'], reverse=True)
            g['margin'] = round((g['profit'] / g['cost']) * 100, 1) if g['cost'] > 0 else 0
            result.append(g)
        
        return Response(result)


            

    
    @action(detail=False, methods=['get'])
    def history(self, request):
        user = request.user
        qs = StockBatch.objects.filter(
            product__user = user, is_depleted = True
        ).select_related('product').order_by('-depleted_at')
        
        product_id = request.query_params.get('product')
        if product_id:
            qs = qs.filter(product__id = product_id)

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        total = qs.count()
        batches = qs[(page - 1) * page_size : page * page_size]

        data = []
        for b in batches:
            sold = b.quantity - b.remaining_quantity
            revenue = sold * b.sell_price_per_unit
            cost = sold * b.buy_price_per_unit
            profit = revenue - cost
            margin = round((profit / cost) * 100, 1) if cost > 0 else 0
            data.append({
                'id': b.id,
                'product': b.product.name,
                'category': b.product.category,
                'quantity': b.quantity,
                'sold': sold,
                'buy_price': b.buy_price_per_unit,
                'sell_price': b.sell_price_per_unit,
                'revenue': revenue,
                'cost': cost,
                'profit': profit,
                'margin': margin,
                'added_at': b.added_at.isoformat(),
                'depleted_at': b.depleted_at.isoformat(),
                'days_in_stock': b.days_in_stock,
                'notes': b.notes
            })
        return Response({
            'results': data,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size-1) // page_size
        })
    


    @action(detail=False, methods=['get'])
    def monthly(self, request):
        user = request.user
        year_ago = timezone.now() - timedelta(days=365)
        rows = StockBatch.objects.filter(
            product__user = user,
            is_depleted = True,
            depleted_at__gte = year_ago
        ).annotate(
            month = TruncMonth('depleted_at')
        ).values('month').annotate(
            revenue = Sum(self.revenue_expr()),
            cost = Sum(self.cost_expr()),
            profit = Sum(self.profit_expr()),
        ).order_by('month')

        result = []
        for r in rows:
            revenue = r['revenue'] or 0
            cost = r['cost'] or 0
            profit = r['profit'] or 0
            result.append({
                'month': r['month'].strftime('%b %Y'),
                'month_key': r['month'].strftime('%Y-%m'),
                'revenue': revenue,
                'cost': cost,
                'profit': profit,
                'margin': round((profit / cost) * 100, 1) if cost > 0 else 0
            })
        return Response(result)
    
class InsightViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    def list(self, request):
        user = request.user
        products = Product.objects.filter(user = user, is_active=True).prefetch_related('batches')
        depleted = StockBatch.objects.filter(product__user = user, is_depleted = True)

        days_expr = ExpressionWrapper(
            Greatest(
                Extract(F('depleted_at') - F('added_at'), 'epoch') / 86400,
                1
            ),
            output_field=FloatField()
        )

        sold_expr = ExpressionWrapper(
            F('quantity') - F('remaining_quantity'),
            output_field=DecimalField(max_digits=20, decimal_places=2)
        )

        velocity_data = depleted.values(
            'product__id', 'product__name'
        ).annotate(
            avg_velocity = Avg(
                ExpressionWrapper(
                    sold_expr / days_expr,
                    output_field=FloatField()
                )
            ),
            avg_turnover = Avg(days_expr),
            batches_counted = Count('id')
        ).order_by('-avg_velocity')

        velocity_summary = [{
            'product_id': r['product__id'],
            'product_name': r['product__name'],
            'avg_velocity': round(float(r['avg_velocity'] or 0), 2),
            'avg_turnover': round(float(r['avg_turnover'] or 0), 2),
            'batches_counted': r['batches_counted']
        } for r in velocity_data]
        fast_movers = velocity_summary[:5]
        slow_movers = reversed(velocity_summary[-5:])

        alerted = Product.objects.filter(
            user=user,
            is_active = True,
            alert__is_active = True
        ).annotate(
            current_stock_sum = Sum(
                'batches__remaining_quantity',
                filter = Q(batches__is_depleted = False)
            )
        ).filter(
            current_stock_sum__lte = F('alert__threshold_quantity')
        ).values(
            'id', 'name',
            'alert__threshold_quantity',
            'current_stock_sum'
        )

        alerts = [{
            'product_id': p['id'],
            'product': p['name'],
            'current_stock': float(p['current_stock_sum'] or 0),
            'threshold': float(p['alert__threshold_quantity']),
            'pct_remaining': round(
                (float(p['current_stock_sum'] or 0) / float(p['alert__threshold_quantity']))
            ) if p['alert__threshold_quantity'] else 0
        } for p in alerted]

        month_ago = timezone.now() - timedelta(days=30)
        active_b = StockBatch.objects.filter(
            product__user = user,
            remaining_quantity__gte = 0,
            
            is_depleted = False,
        )

        stale = active_b.filter(
            added_at__lte = month_ago,
        ).select_related('product')
        
        stale_stock = [{
            'product_id': b.product.id,
            'product': b.product.name,
            'remaining': b.remaining_quantity,
            'days_in_stock': b.days_in_stock,
            'added_at': b.added_at.strftime('%d %b %Y')
        } for b in stale]

        profit_expr = ExpressionWrapper(
            (F('quantity') - F('remaining_quantity')) * (F('sell_price_per_unit') - F('buy_price_per_unit')),
            output_field=DecimalField(max_digits=20, decimal_places=2)
        )

        category_rows = depleted.values('product__category').annotate(
            profit = Sum(profit_expr),
            batches = Count('id')
        ).order_by('-profit')

        category = [{
            'category': r['product__category'],
            'profit': r['profit'] or 0,
            'batches': r['batches']
        } for r in category_rows]

        return Response({
            'fast_movers': fast_movers,
            'slow_movers': slow_movers,
            'low_stock_alerts': alerts,
            'stale_stock': stale_stock,
            'category_breakdown': category,
            'total_products': products.count(),
            'total_active_batches': active_b.count()
        })
    
    @action(detail=False, methods=['get'])
    def velocity(self, request):
        user = request.user
        days_expr = ExpressionWrapper(
            Greatest(
                Extract(F('batches__depleted_at') - F('batches__added_at'), 'epoch') / 86400, 1
            ),
            output_field=FloatField()
        )

        sold_expr = ExpressionWrapper(
            F('batches__quantity') - F('batches__remaining_quantity'),
            output_field=FloatField()
        )

        products = Product.objects.filter(
            user = user,
            is_active = True
        ).annotate(
            current_stock_sum = Sum(
                'batches__remaining_quantity',
                filter = Q(batches__is_depleted = False)
            ),

            total_value_sum = Sum(
                ExpressionWrapper(
                    F('batches__remaining_quantity') * F('batches__buy_price_per_unit'),
                    output_field = DecimalField(max_digits=20, decimal_places=2)
                ),
                filter = Q(batches__is_depleted = False)
            ),

            avg_vel = Avg(
                ExpressionWrapper(
                    sold_expr / days_expr,
                    output_field = FloatField()
                ),
                filter = Q(batches__is_depleted = True)
            )
        )

        result = []
        for p in products:
            stock = float(p.current_stock_sum or 0)
            avg_velocity = float(p.avg_vel or 0)
            result.append({
                'product_id': p.id,
                'product': p.name,
                'category': p.category,
                'current_stock': stock,
                'avg_velocity': round(avg_velocity, 2),
                'days_until_empty': round(stock / avg_velocity, 1) if avg_velocity > 0 else None,
                'total_value': float(p.total_value_sum or 0)
            })

        result.sort(key=lambda x: x['avg_velocity'], reverse = True)
        return Response(result)



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

        # Daily profit from fully depleted today
        daily_profit_depleted = depleted_qs.filter(
            depleted_at__date = today
        ).aggregate(
            total = Sum(profit_expr)
        )['total'] or 0

        # Profit from partial depleted batches today
        partial_profit_expr = ExpressionWrapper(
            F('quantity_used') * (F('batch__sell_price_per_unit') - F('batch__buy_price_per_unit')
            ),
            output_field = DecimalField(max_digits=20, decimal_places=2)
        )

        daily_profit_partial = PartialDepletion.objects.filter(
            batch__product__user = user,
            recorded_at__date = today,
            batch__is_depleted = False
        ).aggregate(
            total=Sum(partial_profit_expr)
        )['total'] or Decimal('0')

        daily_profit = daily_profit_depleted + daily_profit_partial

        # Stock depleted count today
        partial_qs = PartialDepletion.objects.filter(
            batch__product__user = user,
            batch__is_depleted = False
        ) 

        depleted_count = depleted_qs.filter(
            depleted_at__date = today
        ).count()


        # Low stock alerts
        alerted = Product.objects.filter(
            user=user,
            is_active=True,
            alert__is_active=True
        ).annotate(
            current_stock_sum=Coalesce(
                Sum(
                    'batches__remaining_quantity',
                    filter=Q(batches__is_depleted=False)
                ),
                Decimal('0'),
                output_field=DecimalField(max_digits=20, decimal_places=2)
            )
        ).filter(
            current_stock_sum__lte=F('alert__threshold_quantity')
        ).values(
            'name',
            'alert__threshold_quantity',
            'current_stock_sum'
        )

        alerts = [{
            'product': p['name'],
            'remaining': float(p['current_stock_sum'] or 0),
            'threshold': float(p['alert__threshold_quantity'])
        } for p in alerted]

        # Weekly income
        partial_revenue_expr = ExpressionWrapper(
            F('quantity_used') * F('batch__sell_price_per_unit'),
            output_field=DecimalField(max_digits=10, decimal_places=2)
        )

        revenue_expr = ExpressionWrapper(
            (F('quantity') - F('remaining_quantity')) * F('sell_price_per_unit'),
            output_field=DecimalField(max_digits=20, decimal_places=2)
        )
        
        weekly_income = (depleted_qs.filter(
            depleted_at__date__gte = week_ago
        ).aggregate(
            total = Sum(revenue_expr)
        )['total'] or Decimal('0')
        ) + ( 
            partial_qs.filter(recorded_at__gte = week_ago)
            .aggregate(total = Sum(partial_revenue_expr))['total'] or Decimal('0')
        )
 
        # Weekly profit
        weekly_profit = depleted_qs.filter(
            depleted_at__date__gte = week_ago
        ).aggregate(
            total = Sum(profit_expr) 
            )['total'] or Decimal('0') + (
                partial_qs.filter(
                    recorded_at__gte=week_ago
                ).aggregate(total = Sum(partial_profit_expr))
            )['total'] or Decimal('0')
        

        # weekly summary
        daily_rows = depleted_qs.filter(
            depleted_at__date__gte = week_ago
        ).annotate(
            day = TruncDate('depleted_at')
        ).values('day').annotate(
            profit=Sum(profit_expr)
        ).order_by('day')

        profit_by_day ={row['day']: row['profit'] for row in daily_rows}

        partial_daily_rows = partial_qs.filter(
            recorded_at__date__gte = week_ago
        ).annotate(
            day = TruncDate('recorded_at')
        ).values('day').annotate(
            profit=Sum(partial_profit_expr)
        )

        for row in partial_daily_rows:
            profit_by_day[row['day']] = (
                profit_by_day.get(row['day'], Decimal('0')) + row['profit']
            )
        weekly_data = []
        for i in range(7):
            day = week_ago + timedelta(days=i)
            weekly_data.append({
                'day': day.strftime('%a'),
                'profit': profit_by_day.get(day, Decimal('0'))
            })


        days_expr = Greatest(
            ExpressionWrapper(
                (Extract('depleted_at', 'epoch') - Extract('added_at', 'epoch')) / 86400.0,
                output_field=FloatField()
            ),
            Value(1.0)
        )

        sold_expr = ExpressionWrapper(
            F('quantity') - F('remaining_quantity'),
            output_field=FloatField()
        )

        velocity_data = depleted_qs.values(
            'product__name'
        ).annotate(
            avg_velocity=Avg(
                ExpressionWrapper(
                    sold_expr / days_expr,
                    output_field=FloatField()
                )
            ),
            avg_turnover=Avg(
                ExpressionWrapper(
                    (Extract('depleted_at', 'epoch') - Extract('added_at', 'epoch')) / 86400.0,
                    output_field=FloatField()
                )
            )
        ).order_by('-avg_velocity')

        sorted_velocity = list(velocity_data)

        avg_turnover = (
            sum(float(r['avg_turnover'] or 0) for r in sorted_velocity) /
            len(sorted_velocity)
        ) if sorted_velocity else 0

        fast_movers = [
            {'product': r['product__name'], 'velocity': round(float(r['avg_velocity'] or 0), 2)}
            for r in sorted_velocity[:3]
        ]
        slow_movers = [
            {'product': r['product__name'], 'velocity': round(float(r['avg_velocity'] or 0), 2)}
            for r in sorted_velocity[-3:]
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

