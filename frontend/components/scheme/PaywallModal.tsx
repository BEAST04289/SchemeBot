'use client';

import React, { useState } from 'react';
import { X, Check, ShieldAlert, Sparkles, HeartHandshake, HelpCircle } from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: (tier: string) => void;
}

export default function PaywallModal({ isOpen, onClose, onPaymentSuccess }: PaywallModalProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDevBypass, setShowDevBypass] = useState(false);

  if (!isOpen) return null;

  const plans = [
    {
      id: 'report_5',
      name: 'Basic (5 Reports)',
      price: '₹99',
      subtext: 'Perfect for a single family',
      icon: Sparkles,
      color: 'border-saffron',
      features: [
        '5 Additional Scheme Searches',
        'WhatsApp bot access',
        'Scheme application deadline reminders',
        'Direct document checklist verification',
      ],
    },
    {
      id: 'monthly',
      name: 'Pro (Unlimited)',
      price: '₹249',
      subtext: 'For individuals tracking multiple family benefits',
      icon: Sparkles,
      color: 'border-navy',
      features: [
        'Unlimited Personal Scheme Searches',
        'Priority document checklist updates',
        '24/7 WhatsApp assistance',
        'Detailed application step guidance',
      ],
    },
    {
      id: 'ngo_monthly',
      name: 'NGO Partner',
      price: '₹1,999',
      subtext: 'Best for NGO volunteers & workers',
      icon: HeartHandshake,
      color: 'border-tricolorgreen',
      features: [
        'Unlimited Scheme Matching Reports',
        'Multi-client management system',
        'CSV Export for Government/Donor reports',
        'Direct application portal URL bypass',
      ],
    },
  ];

  // Helper to dynamically load Razorpay script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (tier: string) => {
    setLoadingTier(tier);
    setError(null);

    try {
      // Step 1: Request order creation from our FastAPI backend
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        // Check if payments are not configured in backend (local dev mode)
        if (orderData.detail?.code === 'PAYMENTS_NOT_CONFIGURED') {
          setShowDevBypass(true);
          throw new Error('Razorpay keys are not set up in the backend environment. You can use the Dev Bypass below to test.');
        }
        throw new Error(orderData.detail?.error || 'Order creation failed.');
      }

      // Step 2: Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Are you offline?');
      }

      // Step 3: Open Razorpay Checkout interface
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mock_key',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Sarthi Kalyan Portal',
        description: `Upgrade to ${tier === 'report_5' ? 'Basic' : tier === 'monthly' ? 'Pro' : 'NGO'} Tier`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          // Step 4: Verify payment signature backend-side
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                tier: tier,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.detail?.error || 'Payment signature verification failed.');
            }

            if (onPaymentSuccess) {
              onPaymentSuccess(tier);
            }
            onClose();
          } catch (err: any) {
            setError(err.message || 'Signature verification failed.');
          }
        },
        prefill: {
          name: 'Sarthi Kalyan User',
        },
        theme: {
          color: '#000080', // Navy
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'An error occurred during payment setup.');
    } finally {
      setLoadingTier(null);
    }
  };

  // Mock upgrade helper for local development testing without Razorpay keys
  const handleDevBypassUpgrade = (tier: string) => {
    setError(null);
    setShowDevBypass(false);
    if (onPaymentSuccess) {
      // Simulate upgrading local state
      onPaymentSuccess(tier === 'report_5' ? 'basic' : tier === 'monthly' ? 'pro' : 'ngo');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
          <h3 className="text-2xl font-bold text-navy">Upgrade Report Access</h3>
          <p className="text-sm text-slate-500">
            You have exhausted your free report limit. Upgrade now to find more benefits or manage multiple profiles.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 border border-red-100 text-xs font-medium space-y-1">
            <div className="flex items-center font-bold">
              <ShieldAlert className="w-4 h-4 mr-1.5 shrink-0" />
              <span>Payment Setup Notice</span>
            </div>
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`border-t-4 ${plan.color} bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
              >
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{plan.subtext}</span>
                    <h4 className="font-bold text-lg text-navy">{plan.name}</h4>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-navy">{plan.price}</span>
                  </div>
                  <ul className="space-y-2 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <Check className="w-3.5 h-3.5 mr-1.5 text-tricolorgreen shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-6">
                  <button
                    disabled={loadingTier !== null}
                    onClick={() => handleCheckout(plan.id)}
                    className="w-full py-2 px-4 text-xs font-bold text-white bg-navy hover:bg-navy-light rounded-lg transition-all shadow-sm flex items-center justify-center disabled:opacity-50"
                  >
                    {loadingTier === plan.id ? 'Loading Checkout...' : `Upgrade to ${plan.name.split(' ')[0]}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Development Bypass Box */}
        {showDevBypass && (
          <div className="mt-8 p-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl space-y-3">
            <p className="text-xs font-bold flex items-center">
              <HelpCircle className="w-4 h-4 mr-1.5 shrink-0" />
              Local Dev Bypass / परीक्षण विकल्प
            </p>
            <p className="text-[11px]">
              FastAPI is running in local development mode without active Razorpay secret tokens. You can choose any tier below to simulate a successful API upgrade for testing purposes:
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => handleDevBypassUpgrade('report_5')}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold"
              >
                Simulate Basic (₹99)
              </button>
              <button
                onClick={() => handleDevBypassUpgrade('monthly')}
                className="px-3 py-1 bg-navy hover:bg-navy-light text-white rounded text-[10px] font-bold"
              >
                Simulate Pro (₹249)
              </button>
              <button
                onClick={() => handleDevBypassUpgrade('ngo_monthly')}
                className="px-3 py-1 bg-tricolorgreen hover:bg-tricolorgreen-light text-white rounded text-[10px] font-bold"
              >
                Simulate NGO (₹1,999)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
