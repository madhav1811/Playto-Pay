import pytest
import uuid
import threading
from django.urls import reverse
from rest_framework import status
from ledger.models import Merchant, Payout, Transaction, IdempotencyKey
from django.db import connection, transaction

@pytest.mark.django_db(transaction=True)
class TestPayoutEngine:
    def setup_method(self):
        self.merchant = Merchant.objects.create(name="Test Merchant", email="test@example.com")
        # Add initial balance: 10,000 paise (100 INR)
        Transaction.objects.create(
            merchant=self.merchant,
            amount=10000,
            transaction_type='CREDIT',
            description="Initial deposit"
        )
        self.url = reverse('payout-create')

    def test_idempotency(self, client):
        idem_key = str(uuid.uuid4())
        data = {"merchant_id": self.merchant.id, "amount": 5000}
        headers = {"HTTP_X_IDEMPOTENCY_KEY": idem_key}

        # First request
        res1 = client.post(self.url, data, **headers)
        assert res1.status_code == status.HTTP_201_CREATED
        payout_id = res1.data['id']

        # Second request with same key
        res2 = client.post(self.url, data, **headers)
        assert res2.status_code == status.HTTP_201_CREATED
        assert res2.data['id'] == payout_id
        
        # Verify only one payout and one debit transaction was created
        assert Payout.objects.filter(merchant=self.merchant).count() == 1
        assert Transaction.objects.filter(merchant=self.merchant, transaction_type='DEBIT').count() == 1

    def test_insufficient_balance(self, client):
        idem_key = str(uuid.uuid4())
        data = {"merchant_id": self.merchant.id, "amount": 20000} # Exceeds 10,000
        headers = {"HTTP_X_IDEMPOTENCY_KEY": idem_key}

        res = client.post(self.url, data, **headers)
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert res.data['error'] == "Insufficient balance"

    def test_concurrency_protection(self, client):
        """
        Simulate 10 concurrent requests for a balance that only supports 1.
        In Django's test environment, this is tricky because of the database wrapper,
        but we can verify that SELECT FOR UPDATE is used in the view.
        """
        # We'll simulate the scenario by manually attempting to overdraw in a controlled way
        # or just verifying the balance remains consistent after multiple requests.
        
        results = []
        def make_request():
            # Create a new connection for each thread because Django's default connection is not thread-safe
            from django.test import Client
            c = Client()
            res = c.post(self.url, {
                "merchant_id": self.merchant.id,
                "amount": 6000 # Balance is 10000, so only one should succeed
            }, HTTP_X_IDEMPOTENCY_KEY=str(uuid.uuid4()))
            results.append(res.status_code)

        threads = [threading.Thread(target=make_request) for _ in range(5)]
        for t in threads: t.start()
        for t in threads: t.join()

        # Only one should be 201, others should be 400
        success_count = results.count(status.HTTP_201_CREATED)
        error_count = results.count(status.HTTP_400_BAD_REQUEST)
        
        assert success_count == 1
        assert error_count == 4
        assert self.merchant.balance == 4000 # 10000 - 6000
