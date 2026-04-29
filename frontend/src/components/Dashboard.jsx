import React, { useState, useEffect, useRef } from 'react';
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
  History,
  Lock,
  User,
  Building,
  ShieldCheck,
  CreditCard,
  Search
} from 'lucide-react';
import { getDashboard, createPayout, addCredit } from '../api';
import { v4 as uuidv4 } from 'uuid';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [bankAccountId, setBankAccountId] = useState('SBI-123456789');
  const [submitting, setSubmitting] = useState(false);
  const [merchantId, setMerchantId] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef(null);

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
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [merchantId]);

  const handlePayout = async (e) => {
    e.preventDefault();
    if (!payoutAmount || submitting) return;
    
    setSubmitting(true);
    try {
      const amountPaise = Math.round(parseFloat(payoutAmount) * 100);
      const idempotencyKey = uuidv4();
      await createPayout(merchantId, amountPaise, idempotencyKey, bankAccountId);
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
      await addCredit(merchantId, 500000);
      fetchData();
    } catch (error) {
      console.error("Deposit failed", error);
    }
  };

  if (loading && !data) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      >
        <RefreshCw className="text-primary-500 w-12 h-12" />
      </motion.div>
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
      case 'COMPLETED': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'FAILED': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'PROCESSING': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-primary-500/30">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Top Navigation / Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                <ShieldCheck className="text-white" size={24} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                Playto<span className="text-primary-400">Pay</span>
              </h1>
            </div>
            <div className="flex items-center gap-4 px-1">
               <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                  <User size={14} className="text-primary-400/70" />
                  <span className="font-medium">{data?.merchant?.name}</span>
               </div>
               <div className="w-1 h-1 rounded-full bg-slate-700" />
               <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <Building size={14} />
                  <span>{data?.merchant?.email}</span>
               </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative group flex-1 lg:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search payouts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500 w-full transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-xl border border-slate-700 shadow-inner">
              {[1, 2, 3].map((id) => (
                <button
                  key={id}
                  onClick={() => setMerchantId(id)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${merchantId === id ? 'bg-primary-500 text-white shadow-lg' : 'hover:bg-slate-700 text-slate-400'}`}
                >
                  M0{id}
                </button>
              ))}
            </div>

            <button 
              onClick={handleDeposit}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-500/10 text-green-400 rounded-xl hover:bg-green-500/20 transition-all border border-green-500/20 font-bold text-sm"
            >
              <PlusCircle size={18} />
              Demo Credit
            </button>
          </div>
        </header>

        {/* Financial Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Wallet Card */}
          <motion.div 
            layout
            className="lg:col-span-8 glass p-8 rounded-[2rem] relative overflow-hidden group border-white/5"
          >
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-500/10 blur-[100px] rounded-full group-hover:bg-primary-500/20 transition-all duration-700" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full group-hover:bg-blue-500/20 transition-all duration-700" />
            
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Available Balance</p>
                  </div>
                  <h2 className="text-6xl font-black tracking-tight text-white">
                    {formatCurrency(data?.balance || 0)}
                  </h2>
                </div>
                <div className="glass bg-white/5 border-white/10 px-6 py-4 rounded-2xl backdrop-blur-md shadow-xl">
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5 justify-end">
                    <Lock size={12} className="text-primary-400/70" /> Funds on Hold
                  </p>
                  <h3 className="text-2xl font-bold text-white text-right">
                    {formatCurrency(data?.held_balance || 0)}
                  </h3>
                </div>
              </div>

              <div className="mt-12 flex items-center justify-between">
                <div className="flex gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Settlement status</p>
                    <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                       <CheckCircle size={16} />
                       <span>Healthy</span>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-slate-800" />
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ledger Integrity</p>
                    <div className="flex items-center gap-2 text-primary-400 font-bold text-sm">
                       <ShieldCheck size={16} />
                       <span>Verified</span>
                    </div>
                  </div>
                </div>
                <div className="flex -space-x-3">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                       {String.fromCharCode(64+i)}
                     </div>
                   ))}
                   <div className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-primary-500 flex items-center justify-center text-[10px] font-bold text-white">
                     +12
                   </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Payout Panel */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-4 glass p-8 rounded-[2rem] border-white/5 flex flex-col justify-between shadow-2xl"
          >
            <div>
              <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-white">
                <div className="p-2 bg-primary-500/20 rounded-lg text-primary-400">
                  <CreditCard size={20} />
                </div>
                Quick Withdrawal
              </h3>
              <form onSubmit={handlePayout} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Amount (INR)</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">₹</span>
                    <input 
                      type="number" 
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl pl-10 pr-4 py-4 focus:outline-none focus:border-primary-500 transition-all text-xl font-black text-white placeholder:text-slate-700"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Bank Account</label>
                  <input 
                    type="text" 
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:border-primary-500 transition-all text-sm font-medium text-slate-300"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-primary-500/20 mt-4 active:scale-95"
                >
                  {submitting ? <RefreshCw className="animate-spin mx-auto" /> : 'Authorize Payout'}
                </button>
              </form>
            </div>
            <div className="mt-8 flex items-start gap-3 p-4 bg-primary-500/5 border border-primary-500/10 rounded-2xl">
               <Clock size={16} className="text-primary-400 mt-0.5" />
               <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                 Secured by idempotency locks. Transactions are irreversible once processed.
               </p>
            </div>
          </motion.div>
        </div>

        {/* Activity & History */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Payout Tracker */}
          <section className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold flex items-center gap-3 text-white">
                <History className="text-primary-400" />
                Payout Status Tracker
              </h3>
              <button className="text-[10px] font-bold uppercase tracking-widest text-primary-400 hover:text-primary-300 transition-colors">View All</button>
            </div>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode='popLayout'>
                {data?.recent_payouts
                  .filter(p => p.id.toString().includes(searchQuery) || p.amount.toString().includes(searchQuery))
                  .map((payout) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={payout.id}
                    className="glass p-5 flex justify-between items-center group hover:bg-white/[0.03] hover:border-white/10 transition-all rounded-3xl"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${getStatusColor(payout.status)}`}>
                        {payout.status === 'COMPLETED' ? <CheckCircle size={24} /> : 
                         payout.status === 'FAILED' ? <XCircle size={24} /> : <Clock size={24} className={payout.status === 'PROCESSING' ? 'animate-spin' : ''} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="font-black text-xl text-white">{formatCurrency(payout.amount)}</p>
                          <span className="text-[10px] font-mono bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md">ID-{payout.id}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {new Date(payout.created_at).toLocaleDateString()}
                          </p>
                          <span className="w-1 h-1 rounded-full bg-slate-700" />
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {new Date(payout.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest border ${getStatusColor(payout.status)} shadow-lg`}>
                        {payout.status}
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-medium">
                         <Building size={12} />
                         {payout.bank_account_id}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {data?.recent_payouts.length === 0 && (
                <div className="glass p-20 text-center rounded-3xl">
                  <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                    <CreditCard size={32} className="text-slate-600" />
                  </div>
                  <p className="text-slate-500 font-medium italic">No transactions found for this period.</p>
                </div>
              )}
            </div>
          </section>

          {/* Audit Ledger */}
          <section className="lg:col-span-5 space-y-4">
             <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold flex items-center gap-3 text-white">
                <div className="p-1.5 bg-primary-500/20 rounded-lg text-primary-400">
                  <TrendingUp size={18} />
                </div>
                Audit Ledger
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Sync</span>
              </div>
            </div>
            <div className="glass overflow-hidden rounded-[2rem] border-white/5 bg-slate-900/30 backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/[0.02] text-[10px] uppercase text-slate-500 font-black tracking-[0.2em] border-b border-white/5">
                    <tr>
                      <th className="px-6 py-5">Transaction Details</th>
                      <th className="px-6 py-5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data?.recent_transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${tx.transaction_type === 'CREDIT' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                              {tx.transaction_type === 'CREDIT' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors uppercase tracking-wide">{tx.transaction_type}</p>
                              <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px] mt-0.5">{tx.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <p className={`font-black text-base ${tx.transaction_type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}`}>
                            {tx.transaction_type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount).replace('₹', '')}
                            <span className="text-xs ml-0.5">INR</span>
                          </p>
                          <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase tracking-tighter">
                            {new Date(tx.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} • {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>
      </div>
      
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-primary-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full" />
      </div>
    </div>
  );
};

export default Dashboard;
