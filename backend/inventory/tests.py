from django.test import TestCase
from django.contrib.auth.models import User
from .models import Product, StockBatch
from decimal import Decimal

# Create your tests here.
class ProductModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username = 'testuser',
            password = 'testpass123'
        )

        self.product = Product.objects.create(
            user = self.user,
            name = 'Milk',
            category = 'Dairy',
            default_sell_price = Decimal('120.00')
        )

    def test_product_creation(self):
        self.assertEqual(self.product.name, 'Milk')
        self.assertEqual(self.product.category, 'Dairy')
        self.assertTrue(self.product.is_active)

    # Test current stock calculation
    def test_product_current_stock(self):
        StockBatch.objects.create(
            product = self.product,
            quantity = Decimal('10'),
            remaining_quantity = Decimal('10'),
            buy_price_per_unit = Decimal('100'),
            sell_price_per_unit = Decimal('120')
        )

        self.assertEqual(self.product.current_stock(), Decimal('10'))

    #Test total value calculation
    def test_product_total_value(self):
        StockBatch.objects.create(
            product = self.product,
            quantity = Decimal('10'),
            remaining_quantity = Decimal('10'),
            buy_price_per_unit = Decimal('100'),
            sell_price_per_unit = Decimal('120')
        )

        expected_value = Decimal('1000.00')
        self.assertEqual(self.product.total_value, expected_value)

    # Test product name uniqueness per user
    def test_unique_product_per_user(self):
        with self.assertRaises(Exception):
            Product.objects.create(
                user = self.user,
                name = 'Milk',
                category = 'Dairy',
                default_sell_price = Decimal('120.00')
            )

# Test StockBatch model
class StockBatchModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username = 'testuser',
            password = 'testpass123'
        )

        self.product = Product.objects.create(
            user = self.user,
            name = 'Milk',
            default_sell_price = Decimal('60.00')
        )

        self.batch = StockBatch.objects.create(
            Product = self.product,
            quantity = Decimal('20'),
            remaining_quantity = Decimal('20'),
            buy_price_per_unit = Decimal('50'),
            sell_price_per_unit = Decimal('60')
        )