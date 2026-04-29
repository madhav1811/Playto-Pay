import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from ledger.models import Merchant, Transaction

def seed():
    merchants = [
        {"name": "Pixel Perfect Studio", "email": "pixel@example.com"},
        {"name": "Code Crafters", "email": "code@example.com"},
        {"name": "Digital Nomads", "email": "nomads@example.com"},
    ]
    
    for m_data in merchants:
        merchant, created = Merchant.objects.get_or_create(email=m_data['email'], defaults=m_data)
        
        # Add some credits if they have low balance
        if merchant.balance < 500000: # Less than 5000 INR
            for i in range(random.randint(5, 10)):
                amount = random.randint(50000, 200000) # 500 to 2000 INR
                Transaction.objects.create(
                    merchant=merchant,
                    amount=amount,
                    transaction_type='CREDIT',
                    description=f"International payment from customer {random.randint(1000, 9999)}"
                )
            print(f"Seeded {merchant.name} with new credits. Current balance: {merchant.balance/100} INR")
        else:
            print(f"Merchant {merchant.name} already has sufficient balance: {merchant.balance/100} INR")

if __name__ == "__main__":
    seed()
