import random
import time
from celery import shared_task
from django.db import transaction
from django.utils import timezone
from ledger.models import Payout, Transaction, Merchant

@shared_task(bind=True, max_retries=3)
def process_payout(self, payout_id):
    try:
        payout = Payout.objects.get(id=payout_id)
    except Payout.DoesNotExist:
        return "Payout not found"

    # State Machine Validation
    if payout.status not in ['PENDING', 'PROCESSING']:
        return f"Illegal transition from {payout.status}"

    # Increment attempts
    payout.attempts += 1
    payout.status = 'PROCESSING'
    payout.save()

    # Simulate bank settlement delay
    time.sleep(1)

    # 70/20/10 Logic
    roll = random.random()
    
    with transaction.atomic():
        # Lock payout for update
        payout = Payout.objects.select_for_update().get(id=payout_id)
        
        # Check if already completed/failed by another worker (race condition)
        if payout.status not in ['PENDING', 'PROCESSING']:
            return "Already processed"

        if roll < 0.70:
            # 70% Success
            payout.status = 'COMPLETED'
            payout.save()
            return "Payout Completed"
        elif roll < 0.90:
            # 20% Failure
            payout.status = 'FAILED'
            payout.save()
            
            # Atomic refund
            Transaction.objects.create(
                merchant=payout.merchant,
                amount=payout.amount,
                transaction_type='CREDIT',
                payout=payout,
                description=f"Reversal for failed payout {payout.id}"
            )
            return "Payout Failed - Refunded"
        else:
            # 10% Stuck / Retry
            if payout.attempts >= 3:
                # Max attempts reached, fail and refund
                payout.status = 'FAILED'
                payout.save()
                Transaction.objects.create(
                    merchant=payout.merchant,
                    amount=payout.amount,
                    transaction_type='CREDIT',
                    payout=payout,
                    description=f"Refund after {payout.attempts} failed attempts"
                )
                return "Max attempts reached - Failed"
            
            # Exponential backoff retry: 2^attempts * 5 seconds
            countdown = (2 ** payout.attempts) * 5
            raise self.retry(countdown=countdown)

@shared_task
def retry_stuck_payouts():
    # Find payouts in PROCESSING for more than 30 seconds
    # This catches payouts where the worker crashed or the task was lost
    threshold = timezone.now() - timezone.timedelta(seconds=30)
    stuck_payouts = Payout.objects.filter(status='PROCESSING', updated_at__lt=threshold)
    
    for payout in stuck_payouts:
        process_payout.delay(payout.id)
    
    return f"Triggered retry for {stuck_payouts.count()} stuck payouts"
