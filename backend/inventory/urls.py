from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewset, DashboardViewSet, LowStockAlertViewSet, StockBatchViewset, ReportViewSet, InsightViewSet

router = DefaultRouter()
router.register(r'products', ProductViewset, basename='product')
router.register(r'batches', StockBatchViewset, basename='batch')
router.register(r'alerts', LowStockAlertViewSet, basename='alert')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'reports', ReportViewSet, basename='report')
router.register(r'insights', InsightViewSet, basename='insight')

urlpatterns = [
    path('', include(router.urls))
]