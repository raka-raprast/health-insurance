import { useState, useEffect } from 'react';
import './index.css';

type Transaction = {
  wix_order_id: string;
  status: string;
  created_at: string;
  amount?: string;
  currency?: string;
};

type LedgerEntry = {
  id: string;
  account_type: string;
  amount: string;
  currency: string;
  created_at: string;
};

type GatewayReport = {
  transaction_id: string;
  status: string;
  amount: number;
};

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('adminToken'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gatewayReport, setGatewayReport] = useState<GatewayReport[] | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('adminToken');
  };

  const fetchTransactions = async (page = 1) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transactions?page=${page}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) return handleLogout();
      const data = await res.json();
      if (data.statusCode === 200) {
        setTransactions(data.result);
        setCurrentPage(data.meta.page);
        setTotalPages(data.meta.totalPages);
        setTotalItems(data.meta.total);
      }
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    }
  };

  const fetchGatewayReport = async () => {
    setIsReconciling(true);
    fetchTransactions(currentPage); // Refresh the transaction list as well
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reconciliation`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) return handleLogout();
      const data = await res.json();
      if (data.statusCode === 200) {
        setGatewayReport(data.result);
      }
    } catch (err) {
      console.error('Failed to fetch gateway report', err);
    }
    setTimeout(() => setIsReconciling(false), 1000);
  };

  useEffect(() => {
    if (token) {
      fetchTransactions(currentPage);
      fetchGatewayReport();
    }
  }, [token, currentPage]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.statusCode === 200) {
        setToken(data.result.token);
        localStorage.setItem('adminToken', data.result.token);
      } else {
        setLoginError(data.message || 'Login failed');
      }
    } catch (err) {
      setLoginError('Network error');
      console.log(err);
    }
  };

  const openAuditView = async (transactionId: string) => {
    setSelectedTx(transactionId);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transactions/${transactionId}/ledger`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) return handleLogout();
      const data = await res.json();
      if (data.statusCode === 200) {
        setLedgerEntries(data.result);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch ledger entries', err);
    }
  };

  const simulateSettlement = async (transactionId: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/simulate-settlement`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transactionId })
      });
      
      const data = await res.json();
      if (res.status === 200) {
        alert(data.message);
        // If audit modal is open, refresh it
        if (isModalOpen && selectedTx === transactionId) {
          openAuditView(transactionId);
        }
      } else {
        alert(data.message || 'Failed to simulate settlement');
      }
    } catch (err) {
      console.error('Failed to simulate settlement', err);
      alert('Network error while simulating settlement');
    }
  };

  // CONSULTANT POLISH: Improved discrepancy detection logic
  const getDiscrepancyReason = (txId: string) => {
    if (!gatewayReport) return null;
    const inGateway = gatewayReport.find((g) => g.transaction_id === txId);
    const tx = transactions.find((t) => t.wix_order_id === txId);
    const isSuccess = tx?.status === 'SUCCESS';
    
    if (isSuccess && !inGateway) return 'Missing in Gateway Report';
    
    if (inGateway && tx?.amount && parseFloat(tx.amount) !== inGateway.amount) {
      const curr = tx.currency || 'USD';
      return `Amount Mismatch: Ledger ${curr} ${parseFloat(tx.amount).toFixed(2)} vs Gateway ${curr} ${inGateway.amount.toFixed(2)}`;
    }
    
    return null;
  };

  const ledgerSum = ledgerEntries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Admin Login</h2>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <div className="mt-1">
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" />
                </div>
              </div>
              {loginError && <div className="text-red-600 text-sm">{loginError}</div>}
              <div>
                <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">Sign in</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 text-left">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Back-Office Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time monitoring and financial reconciliation</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={fetchGatewayReport}
            disabled={isReconciling}
            className={`${isReconciling ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-700'} text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2`}
          >
            {isReconciling ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Reconciling...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                Run Reconciliation
              </>
            )}
          </button>
          <button 
            onClick={handleLogout}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-all"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-4 px-6 font-semibold text-gray-700">Order ID</th>
              <th className="py-4 px-6 font-semibold text-gray-700">Timestamp</th>
              <th className="py-4 px-6 font-semibold text-gray-700">Amount</th>
              <th className="py-4 px-6 font-semibold text-gray-700">Status</th>
              <th className="py-4 px-6 font-semibold text-gray-700 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length > 0 ? (
              transactions.map((tx) => {
                const reason = getDiscrepancyReason(tx.wix_order_id);
                return (
                  <tr 
                    key={tx.wix_order_id} 
                    className={`border-b border-gray-100 transition-colors ${reason ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-blue-50/50'}`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-mono font-medium text-blue-600">{tx.wix_order_id}</span>
                        {reason && <span className="text-xs font-bold text-red-600 mt-1 uppercase tracking-wider flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                          {reason}
                        </span>}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-500 text-sm">{new Date(tx.created_at).toLocaleString()}</td>
                    <td className="py-4 px-6">
                      {tx.amount ? (
                        <span className="font-mono font-medium text-gray-900">
                          {tx.currency || 'USD'} {Number(tx.amount)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm italic">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${tx.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      {tx.status === 'SUCCESS' && (
                        <button 
                          onClick={() => simulateSettlement(tx.wix_order_id)}
                          className="text-gray-400 hover:text-green-600 font-medium text-sm transition-colors p-2"
                          title="Simulate bank settlement"
                        >
                          Settle $
                        </button>
                      )}
                      <button 
                        onClick={() => openAuditView(tx.wix_order_id)}
                        className="text-gray-400 hover:text-blue-600 font-medium text-sm transition-colors p-2"
                      >
                        Audit Ledger →
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                      <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                    <h3 className="text-gray-900 font-bold text-lg">No Transactions Yet</h3>
                    <p className="text-gray-500 max-w-xs mx-auto mt-1">
                      Start a payment session on the Storefront to see ledger records appearing here in real-time.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {transactions.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span> ({totalItems} total orders)
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Ledger Audit View</h2>
                <p className="text-sm text-gray-500 font-mono">{selectedTx}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Double-Entry Records</span>
                {ledgerEntries.length > 0 && Math.abs(ledgerSum) < 0.0001 && (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-md border border-green-200 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 4.946-2.597 9.29-6.518 11.771a1.256 1.256 0 01-1.478 0C6.097 16.29 3.5 11.946 3.5 7c0-.68.056-1.35.166-2.001zm11.584 3.32a.75.75 0 00-1.06-1.06l-4.25 4.25-2.125-2.126a.75.75 0 10-1.06 1.06l2.655 2.656a.75.75 0 001.06 0l4.78-4.78z" clipRule="evenodd"></path></svg>
                    Integrity Verified
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {ledgerEntries.length > 0 ? (
                  ledgerEntries.map(entry => (
                    <div key={entry.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 text-sm tracking-tight uppercase">{entry.account_type}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{entry.id.split('-')[0]}...</span>
                      </div>
                      <span className={`text-lg font-mono font-bold ${parseFloat(entry.amount) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(entry.amount) > 0 ? '+' : ''}{entry.currency} {Number(entry.amount)}
                      </span>
                    </div>
                  ))
                ) : transactions.find(t => t.wix_order_id === selectedTx)?.status === 'SUCCESS' ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                    <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <p className="text-gray-400 text-sm">Waiting for asynchronous worker...</p>
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-red-100 bg-red-50/50 rounded-2xl">
                    <svg className="w-12 h-12 text-red-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <p className="text-red-400 text-sm font-medium">Declined transactions are not recorded in the ledger.</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Net Balance (Zero-Sum Test)</span>
                <span className={`text-xl font-mono font-black ${Math.abs(ledgerSum) < 0.0001 ? 'text-gray-900' : 'text-red-600 underline'}`}>
                  {ledgerEntries.length > 0 ? ledgerEntries[0].currency : ''} {Number(ledgerSum.toFixed(4))}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 text-right">
              <button onClick={() => setIsModalOpen(false)} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2 rounded-xl font-bold transition-all shadow-sm">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}