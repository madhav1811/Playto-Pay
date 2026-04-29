from rest_framework import views, status, response
from django.db import transaction
from ledger.models import Merchant, Payout, Transaction, IdempotencyKey
from .serializers import PayoutSerializer, MerchantSerializer, TransactionSerializer
from payouts.tasks import process_payout
import uuid

class PayoutCreateView(views.APIView):
    def post(self, request):
        merchant_id = request.data.get('merchant_id')
        amount = request.data.get('amount')
        idem_key = request.headers.get('X-Idempotency-Key')

        if not idem_key:
            return response.Response({"error": "X-Idempotency-Key header is required"}, status=status.HTTP_400_BAD_REQUEST)

        if not merchant_id or not amount:
            return response.Response({"error": "merchant_id and amount are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = int(amount)
        except (ValueError, TypeError):
            return response.Response({"error": "amount must be an integer (paise)"}, status=status.HTTP_400_BAD_REQUEST)

        # Check for existing idempotency key
        try:
            cached_res = IdempotencyKey.objects.get(key=idem_key)
            return response.Response(cached_res.response_body, status=cached_res.response_code)
        except IdempotencyKey.DoesNotExist:
            pass

        try:
            with transaction.atomic():
                # Lock the merchant for balance check
                merchant = Merchant.objects.select_for_update().get(id=merchant_id)
                
                if merchant.balance < amount:
                    error_res = {"error": "Insufficient balance"}
                    # We store error responses too for idempotency
                    IdempotencyKey.objects.create(
                        key=idem_key,
                        merchant=merchant,
                        response_code=status.HTTP_400_BAD_REQUEST,
                        response_body=error_res
                    )
                    return response.Response(error_res, status=status.HTTP_400_BAD_REQUEST)

                # Create Payout
                payout = Payout.objects.create(
                    merchant=merchant,
                    amount=amount,
                    idempotency_key=idem_key,
                    status='PENDING'
                )

                # Create Debit Transaction
                Transaction.objects.create(
                    merchant=merchant,
                    amount=amount,
                    transaction_type='DEBIT',
                    payout=payout,
                    description=f"Payout request {payout.id}"
                )

                # Prepare success response
                serializer = PayoutSerializer(payout)
                success_res = serializer.data
                
                # Cache response for idempotency
                IdempotencyKey.objects.create(
                    key=idem_key,
                    merchant=merchant,
                    response_code=status.HTTP_201_CREATED,
                    response_body=success_res
                )

                # Trigger Celery Task
                transaction.on_commit(lambda: process_payout.delay(payout.id))

                return response.Response(success_res, status=status.HTTP_201_CREATED)

        except Merchant.DoesNotExist:
            return response.Response({"error": "Merchant not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return response.Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DashboardView(views.APIView):
    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        if not merchant_id:
            return response.Response({"error": "merchant_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            merchant = Merchant.objects.get(id=merchant_id)
            payouts = merchant.payouts.all().order_by('-created_at')[:10]
            transactions = merchant.transactions.all().order_by('-created_at')[:20]
            
            return response.Response({
                "merchant": MerchantSerializer(merchant).data,
                "recent_payouts": PayoutSerializer(payouts, many=True).data,
                "recent_transactions": TransactionSerializer(transactions, many=True).data,
                "balance": merchant.balance
            })
        except Merchant.DoesNotExist:
            return response.Response({"error": "Merchant not found"}, status=status.HTTP_404_NOT_FOUND)

class AddCreditView(views.APIView):
    """Temporary view to add funds for testing"""
    def post(self, request):
        merchant_id = request.data.get('merchant_id')
        amount = request.data.get('amount')
        
        if not merchant_id or not amount:
            return response.Response({"error": "merchant_id and amount are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            merchant = Merchant.objects.get(id=merchant_id)
            Transaction.objects.create(
                merchant=merchant,
                amount=int(amount),
                transaction_type='CREDIT',
                description="Manual deposit"
            )
            return response.Response({"message": "Credit added", "new_balance": merchant.balance})
        except Merchant.DoesNotExist:
            return response.Response({"error": "Merchant not found"}, status=status.HTTP_404_NOT_FOUND)
