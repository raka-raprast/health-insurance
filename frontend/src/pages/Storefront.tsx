import { useState } from 'react';
import CryptoJS from 'crypto-js';

const WIX_SECRET = import.meta.env.VITE_WIX_SECRET || 'dummy_secret_2026';

const PLANS = [
  { id: 'basic', name: 'Basic', price: 50.00 },
  { id: 'family', name: 'Family', price: 150.00 },
  { id: 'executive', name: 'Executive', price: 500.00 },
];

export default function Storefront() {
  const [selectedPlan, setSelectedPlan] = useState(PLANS[1]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'DECLINED'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [simulationMode, setSimulationMode] = useState<'RANDOM' | 'FORCE_SUCCESS' | 'FORCE_FAIL'>('RANDOM');

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const parts = [];

    for (let i = 0, len = v.length; i < len; i += 4) {
      parts.push(v.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 16) {
      setCardNumber(formatted);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, ''); // Digits only
    
    if (input.length > 0) {
      // Auto-prefix 0 for months like 2-9
      if (parseInt(input[0]) > 1 && input.length === 1) {
        input = '0' + input;
      }
      
      // Validate month (01-12)
      if (input.length >= 2) {
        let month = parseInt(input.substring(0, 2));
        if (month > 12) month = 12;
        if (month === 0 && input.length >= 2) month = 1;
        
        const monthStr = month.toString().padStart(2, '0');
        input = monthStr + (input.length > 2 ? '/' : '') + input.substring(2, 4);
      }
    }
    setExpiry(input);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !cardNumber || !expiry || !cvv) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setStatus('PROCESSING');
    setErrorMsg('');

    const wixOrderId = `wix-order-${Math.floor(Math.random() * 1000000)}`;

    const payload = {
      merchantId: 'health-assurance-001',
      order: {
        id: wixOrderId,
        amount: selectedPlan.price,
        currency: 'USD',
        description: `${selectedPlan.name} Health Premium`,
      },
      customer: {
        email: email,
      },
      simulationMode: simulationMode,
    };

    const signature = CryptoJS.HmacSHA256(JSON.stringify(payload), WIX_SECRET).toString(CryptoJS.enc.Base64);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/v1/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payload, signature }),
      });

      const data = await response.json();

      if (data.statusCode === 200) {
        setStatus('SUCCESS');
      } else {
        setStatus('DECLINED');
        setErrorMsg(data.message || 'Payment declined by gateway.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setStatus('DECLINED');
      setErrorMsg('Network error. Could not reach backend.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Select Your Plan</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {PLANS.map((plan) => (
          <div 
            key={plan.id}
            onClick={() => setSelectedPlan(plan)}
            className={`border rounded-xl p-6 cursor-pointer transition-all ${
              selectedPlan.id === plan.id 
                ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500' 
                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
            }`}
          >
            <h3 className="text-xl font-semibold">{plan.name}</h3>
            <p className="text-3xl font-bold mt-4">${plan.price}<span className="text-sm font-normal text-gray-500">/mo</span></p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Checkout</h2>
        
        {status === 'SUCCESS' ? (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-6 text-center">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
            <p>Your {selectedPlan.name} plan is now active.</p>
            <button onClick={() => setStatus('IDLE')} className="mt-6 text-blue-600 hover:underline">Start another purchase</button>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={status === 'PROCESSING'} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="John Doe" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={status === 'PROCESSING'} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="john@example.com" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
              <input 
                type="text" 
                value={cardNumber} 
                onChange={handleCardChange} 
                disabled={status === 'PROCESSING'} 
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono" 
                placeholder="0000 0000 0000 0000" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input 
                  type="text" 
                  value={expiry} 
                  onChange={handleExpiryChange} 
                  disabled={status === 'PROCESSING'} 
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                  placeholder="MM/YY" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                <input 
                  type="text" 
                  value={cvv} 
                  onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, '').substring(0, 3))} 
                  disabled={status === 'PROCESSING'} 
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                  placeholder="123" 
                />
              </div>
            </div>

            {errorMsg && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
                {errorMsg}
              </div>
            )}

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2">Gateway Simulation Mode (Testing)</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="simMode" value="RANDOM" checked={simulationMode === 'RANDOM'} onChange={() => setSimulationMode('RANDOM')} className="text-blue-600 focus:ring-blue-500" />
                  Random (10% Fail)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer text-green-700">
                  <input type="radio" name="simMode" value="FORCE_SUCCESS" checked={simulationMode === 'FORCE_SUCCESS'} onChange={() => setSimulationMode('FORCE_SUCCESS')} className="text-green-600 focus:ring-green-500" />
                  Force Success
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer text-red-700">
                  <input type="radio" name="simMode" value="FORCE_FAIL" checked={simulationMode === 'FORCE_FAIL'} onChange={() => setSimulationMode('FORCE_FAIL')} className="text-red-600 focus:ring-red-500" />
                  Force Failure
                </label>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={status === 'PROCESSING'}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors ${
                status === 'PROCESSING' 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {status === 'PROCESSING' ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Payment...
                </span>
              ) : (
                `Pay $${selectedPlan.price}`
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
