from django.test import TestCase
from django.contrib.auth.models import User
from .models import Product, StockBatch, PartialDepletion, LowStockAlert
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

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
            product = self.product,
            quantity = Decimal('20'),
            remaining_quantity = Decimal('20'),
            buy_price_per_unit = Decimal('50'),
            sell_price_per_unit = Decimal('60')
        )

    def test_batch_creation(self):
        self.assertEqual(self.batch.quantity, Decimal('20'))
        self.assertEqual(self.batch.remaining_quantity, Decimal('20'))
        self.assertFalse(self.batch.is_depleted)

    def test_profit_calculations(self):
        self.assertEqual(self.batch.total_buy_costs, Decimal('1000'))
        self.assertEqual(self.batch.estimated_revenue, Decimal('1200'))
        self.assertEqual(self.batch.profit_margin, Decimal('20'))
        self.assertEqual(self.batch.estimated_profit, Decimal('200'))

    def test_mark_depleted(self):
        self.batch.mark_depleted
        self.assertTrue(self.batch.is_depleted)
        self.assertEqual(self.batch.remaining_quantity, 0)
        self.assertIsNotNone(self.batch.depleted_at)

    def test_days_in_stock(self):
        depleted_batch=StockBatch.objects.create(
            product = self.product,
            quantity = Decimal('10'),
            remaining_quantity = Decimal('0'),
            buy_price_per_unit = Decimal('50'),
            sell_price_per_unit = Decimal('60'),
            added_at = timezone.now() - timedelta(days=5),
            depleted_at = timezone.now(),
            is_depleted = True
        )

        self.assertGreaterEqual(depleted_batch.days_in_stock, 5)

    def test_velocity_calculation(self):
        self.batch.remaining_quantity = Decimal('5')
        self.batch.added_at = timezone.now() - timedelta(days=10)
        self.batch.save()

        self.assertAlmostEqual(self.batch.velocity, 1.5, places=1)

# Test PartialDepletion model
class PartialDepletionModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username = 'testuser',
            password = 'testpass123'
        )

        self.product = Product.objects.create(
            user = self.user,
            name = 'Soda',
            default_sell_price = Decimal('40')
        )
        self.batch = StockBatch.objects.create(
            product = self.product,
            quantity = Decimal('24'),
            remaining_quantity = Decimal('24'),
            buy_price_per_unit = Decimal('30'),
            sell_price_per_unit = Decimal('40')
        )

    def test_partial_depletion_updates(self):
        intial_remaining = self.batch.remaining_quantity

        PartialDepletion.objects.create(
            batch = self.batch,
            quantity_used = Decimal('5'),
        )

        self.batch.refresh_from_db()
        self.assertEqual(
            self.batch.remaining_quantity, 
            intial_remaining - Decimal('5')
        )

    def test_partial_depletion_marks_batch_depleted(self):
        PartialDepletion.objects.create(
            batch=self.batch,
            quantity_used=Decimal('24')
        )

        self.batch.refresh_from_db()
        self.assertTrue(self.batch.is_depleted)
        self.assertEqual(self.batch.remaining_quantity, 0)


#Test LowStockAlert model
class LowStockAlertModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )

        self.product = Product.objects.create(
            user = self.user,
            name = 'Soda',
            default_sell_price = Decimal('40'),
        )

        self.batch = StockBatch.objects.create(
            product = self.product,
            quantity = Decimal('5'),
            remaining_quantity = Decimal('5'),
            buy_price_per_unit = Decimal('30'),
            sell_price_per_unit = Decimal('40')
        )

        self.alert = LowStockAlert.objects.create(
            product = self.product,
            threshold_quantity = Decimal('10')
        )

    def test_alert_is_triggered(self):
        self.assertTrue(self.alert.is_triggered)



    def test_alert_not_triggered(self):
        StockBatch.objects.create(
        product = self.product,
        quantity = Decimal('20'),
        remaining_quantity = Decimal('20'),
        buy_price_per_unit = Decimal('30'),
        sell_price_per_unit = Decimal('40')
        ) 

        self.assertFalse(self.alert.is_triggered)  




