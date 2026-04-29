import pytest
import uuid
from django.urls import reverse
from rest_framework import status
from ledger.models import Merchant, Payout, Transaction, IdempotencyKey
from django.db import transaction

@pytest.mark.django_db(transaction=True)
class TestPayoutEngine:
    def setup_method(self):
        Merchant.objects.all().delete()
        self.merchant = Merchant.objects.create(name="Test Merchant", email="test@example.com")
        Transaction.objects.create(
            merchant=self.merchant,
            amount=10000,
            transaction_type='CREDIT',
            description="Initial deposit"
        )
        self.url = reverse('payout-create')

    def test_idempotency_caching(self, client):
        idem_key = str(uuid.uuid4())
        data = {
            "merchant_id": self.merchant.id, 
            "amount_paise": 5000,
            "bank_account_id": "TEST-BANK-1"
        }
        headers = {"HTTP_X_IDEMPOTENCY_KEY": idem_key}

        # First request
        res1 = client.post(self.url, data, **headers)
        assert res1.status_code == status.HTTP_201_CREATED
        payout_id = res1.data['id']

        # Second request with same key
        res2 = client.post(self.url, data, **headers)
        assert res2.status_code == status.HTTP_201_CREATED
        assert res2.data['id'] == payout_id
        
    def test_insufficient_balance(self, client):
        idem_key = str(uuid.uuid4())
        data = {
            "merchant_id": self.merchant.id, 
            "amount_paise": 20000,
            "bank_account_id": "TEST-BANK-1"
        }
        headers = {"HTTP_X_IDEMPOTENCY_KEY": idem_key}

        res = client.post(self.url, data, **headers)
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert res.data['error'] == "Insufficient balance"

    def test_payout_creation(self, client):
        data = {
            "merchant_id": self.merchant.id, 
            "amount_paise": 3000,
            "bank_account_id": "TEST-BANK-1"
        }
        res = client.post(self.url, data, HTTP_X_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        assert res.status_code == status.HTTP_201_CREATED
        
        merchant = Merchant.objects.get(id=self.merchant.id)
        payout = Payout.objects.get(id=res.data['id'])
        
        # Check that balance is consistent with payout status
        if payout.status == 'COMPLETED':
            assert merchant.balance == 7000
        elif payout.status == 'FAILED':
            assert merchant.balance == 10000
        elif payout.status == 'PROCESSING':
            assert merchant.balance == 7000

    def test_state_machine_atomicity(self):
        payout = Payout.objects.create(
            merchant=self.merchant,
            amount=1000,
            bank_account_id="TEST-1",
            idempotency_key=uuid.uuid4(),
            status='PENDING'
        )
        Transaction.objects.create(
            merchant=self.merchant,
            amount=1000,
            transaction_type='DEBIT',
            payout=payout
        )
        
        # Test refund on failure
        with transaction.atomic():
            payout.status = 'FAILED'
            payout.save()
            Transaction.objects.create(
                merchant=self.merchant,
                amount=payout.amount,
                transaction_type='CREDIT',
                payout=payout,
                description="Refund"
            )
        
        merchant = Merchant.objects.get(id=self.merchant.id)
        assert merchant.balance == 10000
