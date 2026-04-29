import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  PlusCircle,
  TrendingUp,
  History
} from 'lucide-react';
import { getDashboard, createPayout, addCredit } from '../api';
import { v4 as uuidv4 } from 'uuid';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [merchantId] = useState(1); // Hardcoded for demo

  const fetchData = async () => {
    try {
      const response = await getDashboard(merchantId);
      setData(response.data);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const handlePayout = async (e) => {
    e.preventDefault();
    if (!payoutAmount || submitting) return;
    
    setSubmitting(true);
    try {
      const amountPaise = Math.round(parseFloat(payoutAmount) * 100);
      const idempotencyKey = uuidv4();
      await createPayout(merchantId, amountPaise, idempotencyKey);
      setPayoutAmount('');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "Payout failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeposit = async () => {
    try {
      await addCredit(merchantId, 500000); // Add 5000 INR
      fetchData();
    } catch (error) {
      console.error("Deposit failed", error);
    }
  };

  if (loading && !data) return (
    <div className="flex items-center justify-center min-h-screen">
      <RefreshCw className="animate-spin text-primary-500 w-12 h-12" />
    </div>
  );

  const formatCurrency = (paise) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(paise / 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-400 bg-green-400/10';
      case 'FAILED': return 'text-red-400 bg-red-400/10';
      case 'PROCESSING': return 'text-blue-400 bg-blue-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Playto Payout Engine
          </h1>
          <p className="text-gray-400">Merchant: {data?.merchant?.name}</p>
        </div>
        <button 
          onClick={handleDeposit}
          className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-all border border-green-600/30"
        >
          <PlusCircle size={20} />
          Add Demo Funds
        </button>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Balance Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-8 col-span-1 md:col-span-2 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Available Balance</p>
            <h2 className="text-5xl font-bold mt-2 tracking-tight">
              {formatCurrency(data?.balance || 0)}
            </h2>
            <div className="flex gap-4 mt-6">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <TrendingUp size={16} />
                <span>+12.5% from last week</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Payout Form */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-6"
        >
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <ArrowUpRight className="text-primary-400" />
            Request Payout
          </h3>
          <form onSubmit={handlePayout} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Amount (INR)</label>
              <input 
                type="number" 
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500 transition-colors"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={submitting}
              className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-primary-600/20"
            >
              {submitting ? <RefreshCw className="animate-spin mx-auto" /> : 'Confirm Payout'}
            </button>
          </form>
          <p className="text-[10px] text-gray-500 mt-4 text-center">
            Standard processing time: 2-24 hours.
          </p>
        </motion.div>
      </div>

      {/* History Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Payouts */}
        <section className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <History className="text-primary-400" />
            Payout History
          </h3>
          <div className="space-y-3">
            <AnimatePresence mode='popLayout'>
              {data?.recent_payouts.map((payout) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={payout.id}
                  className="glass p-4 flex justify-between items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${getStatusColor(payout.status)}`}>
                      {payout.status === 'COMPLETED' ? <CheckCircle size={20} /> : 
                       payout.status === 'FAILED' ? <XCircle size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <p className="font-medium">{formatCurrency(payout.amount)}</p>
                      <p className="text-xs text-gray-400">{new Date(payout.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(payout.status)}`}>
                    {payout.status}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Ledger Transactions */}
        <section className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <RefreshCw className="text-primary-400" />
            Ledger Activity
          </h3>
          <div className="glass overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data?.recent_transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {tx.transaction_type === 'CREDIT' ? 
                          <ArrowDownLeft className="text-green-400" size={16} /> : 
                          <ArrowUpRight className="text-red-400" size={16} />
                        }
                        <span className="text-sm">{tx.transaction_type}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 font-medium ${tx.transaction_type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.transaction_type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Dashboard;
