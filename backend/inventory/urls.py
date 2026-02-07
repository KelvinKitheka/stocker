from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewset, DashboardViewSet, LowStockAlertViewSet, StockBatchViewset

router = DefaultRouter()
router.register(r'products', ProductViewset, basename='product')
router.register(r'batches', StockBatchViewset, basename='batch')
router.register(r'alerts', LowStockAlertViewSet, basename='alert')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')

urlpatterns = [
    path('', include(router.urls))
]