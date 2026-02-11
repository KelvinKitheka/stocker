from django.test import TestCase
from django.contrib.auth.models import User
from .models import Product
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

    
    

        
