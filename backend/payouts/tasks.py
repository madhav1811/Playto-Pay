import random
import time
from celery import shared_task
from django.db import transaction
from django.utils import timezone
from ledger.models import Payout, Transaction, Merchant

@shared_task
def process_payout(payout_id):
    try:
        payout = Payout.objects.get(id=payout_id)
    except Payout.DoesNotExist:
        return "Payout not found"

    if payout.status != 'PENDING':
        return f"Payout in {payout.status} status, skipping"

    # Transition to PROCESSING
    payout.status = 'PROCESSING'
    payout.save()

    # Simulate bank settlement delay
    time.sleep(2)

    # 70/20/10 Logic
    roll = random.random()
    
    with transaction.atomic():
        payout = Payout.objects.select_for_update().get(id=payout_id)
        
        if roll < 0.70:
            # 70% Success
            payout.status = 'COMPLETED'
            payout.save()
            return "Payout Completed"
        elif roll < 0.90:
            # 20% Failure
            payout.status = 'FAILED'
            payout.save()
            
            # Create a reversal credit transaction
            Transaction.objects.create(
                merchant=payout.merchant,
                amount=payout.amount,
                transaction_type='CREDIT',
                payout=payout,
                description=f"Reversal for failed payout {payout.id}"
            )
            return "Payout Failed - Refunded"
        else:
            # 10% Stuck in PROCESSING (Simulation)
            # We don't update the status here, it stays PROCESSING
            return "Payout Stuck in Processing (Simulated)"

@shared_task
def retry_stuck_payouts():
    # Find payouts in PROCESSING for more than 30 seconds
    threshold = timezone.now() - timezone.timedelta(seconds=30)
    stuck_payouts = Payout.objects.filter(status='PROCESSING', updated_at__lt=threshold)
    
    for payout in stuck_payouts:
        # For simulation, we'll just randomly resolve them now or keep them stuck
        # In a real system, you'd check with the bank API
        process_payout.delay(payout.id)
    
    return f"Retried {stuck_payouts.count()} payouts"
