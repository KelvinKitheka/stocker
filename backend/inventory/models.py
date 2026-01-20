from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal

# Product model
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

# Stockbatch model  
class StockBatch(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name=batches)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    remaining_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    buy_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    sell_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    added_at = models.DateTimeField(default=timezone.now)
    depleted_at = models.DateTimeField(null=True, blank=True)
    is_depleted = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-added_at']
        verbose_name_plural = 'Stock Batches'

    def __str__(self):
        return f"{self.product.name}- {self.quantity} units"
    
    @property
    def total_buy_costs(self):
        return self.buy_price_per_unit * self.quantity
    
    @property
    def estimated_revenue(self):
        return self.quantity * self.sell_price_per_unit
    
    @property
    def estimated_profit(self):
        return self.estimated_revenue - self.total_buy_costs
    
    @property
    def profit_margin(self):
        if self.total_buy_costs > 0:
            return (self.estimated_profit / self.total_buy_costs) * 100
        return 0
    
    @property
    def days_in_stock(self):
        if self.is_depleted and self.depleted_at:
            delta = self.depleted_at - self.added_at
        else:
            delta = timezone.now() - self.added_at
        return max(delta.days, 1)
    
    @property
    def velocity(self):
        sold = self.quantity - self.remaining_quantity
        return float(sold) / self.days_in_stock
    
    @property
    def mark_depleted(self, status = 'finished'):
        self.is_depleted = True
        self.depleted_at = timezone.now()
        if status == 'finished':
            self.quantity = 0
        self.save()


class PartialDepletion(models.Model):
    batch = models.ForeignKey(StockBatch,on_delete=models.CASCADE, related_name='depletions')
    quantity_used = models.DecimalField(max_digits=10, decimal_places=2)
    recorded_at = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-recorded_at']

        def __str__(self):
            return f"{self.batch.product.name} - {self.quantity_used} used"
        
        def save(self, *args, **kwargs):
            super().save(*args, **kwargs)
            self.batch.remaining_quantity -= self.quantity_used
            if self.batch.remaining_quantity <= 0:
                self.batch.mark_depleted()
            else:
                self.batch.save()

class LowStockAlert(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='alert')
    threshold_quantity = models.DecimalField(max_digits=10,  decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product.name} < {self.threshold_quantity}"
    
    @property
    def is_triggered(self):
        return self.product.current_stock <= self.threshold_quantity
