from django.db import models
from django.core.validators import MinValueValidator
from django.db.models import Sum
import uuid

class Merchant(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def balance(self):
        credits = self.transactions.filter(transaction_type='CREDIT').aggregate(total=Sum('amount'))['total'] or 0
        debits = self.transactions.filter(transaction_type='DEBIT').aggregate(total=Sum('amount'))['total'] or 0
        return credits - debits

    @property
    def held_balance(self):
        # Sum of PENDING or PROCESSING payouts
        return self.payouts.filter(status__in=['PENDING', 'PROCESSING']).aggregate(total=Sum('amount'))['total'] or 0

class Payout(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='payouts')
    amount = models.BigIntegerField(validators=[MinValueValidator(1)]) # in paise
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    bank_account_id = models.CharField(max_length=255, null=True, blank=True)
    idempotency_key = models.UUIDField(db_index=True)
    attempts = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('merchant', 'idempotency_key')

    def __str__(self):
        return f"Payout {self.id} - {self.status}"

    def transition_to(self, new_status):
        """
        Enforce state machine transitions.
        Legal: 
        - PENDING -> PROCESSING
        - PROCESSING -> COMPLETED
        - PROCESSING -> FAILED
        - PENDING -> FAILED (Direct failure)
        """
        legal_transitions = {
            'PENDING': ['PROCESSING', 'FAILED'],
            'PROCESSING': ['COMPLETED', 'FAILED'],
            'COMPLETED': [],
            'FAILED': [],
        }
        
        if new_status not in legal_transitions.get(self.status, []):
            raise ValueError(f"Illegal transition from {self.status} to {new_status}")
            
        self.status = new_status
        self.save()

class Transaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('CREDIT', 'Credit'),
        ('DEBIT', 'Debit'),
    ]
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='transactions')
    amount = models.BigIntegerField() # in paise
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    payout = models.ForeignKey(Payout, on_delete=models.SET_NULL, null=True, blank=True, related_name='ledger_entries')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type}: {self.amount} paise"

class IdempotencyKey(models.Model):
    key = models.UUIDField(primary_key=True)
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE)
    response_code = models.IntegerField()
    response_body = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return str(self.key)
