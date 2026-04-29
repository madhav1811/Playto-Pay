from django.urls import path
from .views import PayoutCreateView, DashboardView, AddCreditView

urlpatterns = [
    path('payouts', PayoutCreateView.as_view(), name='payout-create'),
    path('dashboard', DashboardView.as_view(), name='dashboard'),
    path('credits', AddCreditView.as_view(), name='add-credit'),
]
