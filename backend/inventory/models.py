from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal

# Create your models here.
class Product(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    CATEGORY_CHOICES = [
    ('food', 'Food'),
    ('drink', 'Drink'),
    ('electronics', 'Electronics'),
    ('clothing', 'Clothing'),
    ('other', 'Other'),
    ]
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    default_sell_prize= models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'name']

    def __str__(self):
        return self.name

    @property
    def total_value(self):
        total = self.batches.filter(is_depleted = False).aggregate(total=models.Sum('remaining_quantity'))['total']
        return total or Decimal('0')

    @property
    def total_value(self):
        batches = self.batches.filter(is_depleted = False)
        return sum(batch.remaining_quantity * batch.buy_price_per_unit for batch in batches)
    
    @property
    def average_velocity(self):
        batches = self.batches.filter(is_depleted = False)
        if not batches.exists():
            return 0
        velocities = [b.velocity for b in batches]
        return sum(velocities) / len(velocities) if velocities else 0