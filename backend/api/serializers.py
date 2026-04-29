from rest_framework import serializers
from ledger.models import Merchant, Payout, Transaction

class MerchantSerializer(serializers.ModelSerializer):
    balance = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Merchant
        fields = ['id', 'name', 'email', 'balance']

class PayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payout
        fields = ['id', 'merchant', 'amount', 'status', 'idempotency_key', 'created_at']
        read_only_fields = ['status', 'created_at']

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'merchant', 'amount', 'transaction_type', 'payout', 'description', 'created_at']
