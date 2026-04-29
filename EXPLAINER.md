# Playto Payout Engine Explainer

### 1. The Ledger
**Balance Calculation Query:**
```python
@property
def balance(self):
    credits = self.transactions.filter(transaction_type='CREDIT').aggregate(total=Sum('amount'))['total'] or 0
    debits = self.transactions.filter(transaction_type='DEBIT').aggregate(total=Sum('amount'))['total'] or 0
    return credits - debits
```
**Rationale:** 
I modeled it this way to maintain a strict "Source of Truth" ledger. Instead of storing a mutable `balance` column that can drift due to bugs or partial updates, the balance is a derived property of all immutable transaction records. Storing amounts as `BigIntegerField` in paise avoids all floating-point precision issues common in financial software.

### 2. The Lock
**Concurrency Protection Code:**
```python
with transaction.atomic():
    # Lock the merchant for balance check AND idempotency
    merchant = Merchant.objects.select_for_update().get(id=merchant_id)
```
**Primitive:** 
This relies on the **`SELECT ... FOR UPDATE`** database primitive. It places an exclusive lock on the specific `Merchant` row. Any other concurrent request attempting to read this row for update will block until the first transaction commits or rolls back. This prevents the "double-spend" race condition where two requests both see a high balance before either has deducted from it.

### 3. The Idempotency
**System Logic:**
The system uses an `IdempotencyKey` model with a unique primary key. When a request arrives, we look up the key inside the merchant's database lock.
**In-flight Handling:**
If two requests arrive simultaneously:
1. Request A acquires the `SELECT FOR UPDATE` lock on the Merchant.
2. Request B waits for the lock.
3. Request A checks idempotency (finds none), creates the payout, records the response in `IdempotencyKey`, and commits.
4. Request B acquires the lock, checks idempotency, finds the record created by Request A, and returns the cached response immediately without creating a second payout.

### 4. The State Machine
**Transition Blocking:**
Failed-to-completed (and other illegal transitions) are blocked in the Celery task logic:
```python
# State Machine Validation
if payout.status not in ['PENDING', 'PROCESSING']:
    return f"Illegal transition from {payout.status}"
```
This check ensures that once a payout reaches a terminal state (`COMPLETED` or `FAILED`), it can never be moved back into a processing state, preventing double-payouts or double-refunds.

### 5. The AI Audit
**The Mistake:**
Initially, the AI placed the idempotency check *outside* the `transaction.atomic()` block and before the `select_for_update()` lock.
**Wrong Code:**
```python
# AI suggested this outside the lock
try:
    cached = IdempotencyKey.objects.get(key=idem_key)
    return Response(cached.body)
except: pass

with transaction.atomic():
    merchant = Merchant.objects.select_for_update().get(id=id)
    # ... create payout ...
```
**The Catch:**
If two requests arrive at the same millisecond, they both pass the initial `get()` check (as neither exists yet). They then queue up for the lock. The first creates the payout, and the second—having already passed the check—creates a *duplicate* payout once it gets the lock.
**The Fix:**
I moved the `IdempotencyKey` lookup *inside* the locked transaction block, ensuring that the second request must wait for the first to finish and then sees the newly created key.
