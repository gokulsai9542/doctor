import { useState } from 'react';
import api from '../api/axios';

const STEPS = { SELECT: 'select', FORM: 'form', PROCESSING: 'processing', SUCCESS: 'success', FAILED: 'failed' };

export default function PaymentModal({ payment, onClose, onSuccess }) {
  const [step, setStep]         = useState(STEPS.SELECT);
  const [method, setMethod]     = useState('');
  const [upiId, setUpiId]       = useState('');
  const [cardNum, setCardNum]   = useState('');
  const [cardExp, setCardExp]   = useState('');
  const [cardCvv, setCardCvv]   = useState('');
  const [bank, setBank]         = useState('sbi');
  const [order, setOrder]       = useState(null);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');

  const selectMethod = async (m) => {
    setMethod(m);
    // Create order (Step 1)
    const { data } = await api.post(`/payments/create-order/${payment._id}`);
    setOrder(data);
    setStep(STEPS.FORM);
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setStep(STEPS.PROCESSING);
    setError('');
    try {
      const { data } = await api.post(`/payments/verify/${payment._id}`, {
        orderId: order.orderId,
        method,
      });
      setResult(data);
      setStep(STEPS.SUCCESS);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
      setStep(STEPS.FAILED);
    }
  };

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  };
  const modal = {
    background: '#fff', borderRadius: 12, width: 420, maxWidth: '95vw',
    boxShadow: '0 8px 40px rgba(0,0,0,0.3)', overflow: 'hidden',
  };
  const header = {
    background: '#1a1a2e', color: '#fff', padding: '16px 20px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  };
  const inputStyle = {
    display: 'block', width: '100%', padding: '10px 12px', marginBottom: 12,
    borderRadius: 6, border: '1px solid #ddd', fontSize: 15, boxSizing: 'border-box',
  };
  const btnPrimary = {
    width: '100%', padding: 12, background: '#1a1a2e', color: '#fff',
    border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer', marginTop: 4,
  };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>

        {/* Header */}
        <div style={header}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>MedAnnotate Pay</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>₹{payment.amount}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Paying to</div>
            <div style={{ fontWeight: 600 }}>Dr. {payment.doctor?.name}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{payment.doctor?.specialization}</div>
          </div>
        </div>

        <div style={{ padding: 24 }}>

          {/* STEP: Select Method */}
          {step === STEPS.SELECT && (
            <div>
              <p style={{ margin: '0 0 16px', fontWeight: 600, color: '#333' }}>Select Payment Method</p>
              {[
                { id: 'upi',        icon: '📱', label: 'UPI',         sub: 'GPay, PhonePe, Paytm' },
                { id: 'card',       icon: '💳', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay' },
                { id: 'netbanking', icon: '🏦', label: 'Net Banking',  sub: 'All major banks' },
              ].map(m => (
                <div key={m.id} onClick={() => selectMethod(m.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    border: '1px solid #e0e0e0', borderRadius: 8, marginBottom: 10,
                    cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#1a1a2e'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e0e0e0'}>
                  <span style={{ fontSize: 24 }}>{m.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{m.sub}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: '#aaa' }}>›</span>
                </div>
              ))}
            </div>
          )}

          {/* STEP: Payment Form */}
          {step === STEPS.FORM && (
            <form onSubmit={handlePay}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <button type="button" onClick={() => setStep(STEPS.SELECT)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#555' }}>←</button>
                <span style={{ fontWeight: 600 }}>
                  {method === 'upi' ? '📱 UPI Payment' : method === 'card' ? '💳 Card Payment' : '🏦 Net Banking'}
                </span>
              </div>

              {method === 'upi' && (
                <>
                  <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6 }}>Enter UPI ID</label>
                  <input style={inputStyle} placeholder="yourname@upi" value={upiId}
                    onChange={e => setUpiId(e.target.value)} required />
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                    e.g. 9999999999@paytm, name@gpay, name@ybl
                  </div>
                </>
              )}

              {method === 'card' && (
                <>
                  <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6 }}>Card Number</label>
                  <input style={inputStyle} placeholder="1234 5678 9012 3456" maxLength={19}
                    value={cardNum} onChange={e => setCardNum(e.target.value.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim())} required />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6 }}>Expiry</label>
                      <input style={inputStyle} placeholder="MM/YY" maxLength={5}
                        value={cardExp} onChange={e => setCardExp(e.target.value)} required />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6 }}>CVV</label>
                      <input style={inputStyle} placeholder="•••" maxLength={3} type="password"
                        value={cardCvv} onChange={e => setCardCvv(e.target.value)} required />
                    </div>
                  </div>
                </>
              )}

              {method === 'netbanking' && (
                <>
                  <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6 }}>Select Bank</label>
                  <select style={inputStyle} value={bank} onChange={e => setBank(e.target.value)}>
                    {[['sbi','State Bank of India'],['hdfc','HDFC Bank'],['icici','ICICI Bank'],
                      ['axis','Axis Bank'],['kotak','Kotak Mahindra'],['pnb','Punjab National Bank']].map(([v,l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <div style={{ padding: '10px 14px', background: '#fff8e1', borderRadius: 6, fontSize: 13, color: '#856404', marginBottom: 12 }}>
                    You will be redirected to {bank.toUpperCase()} net banking portal
                  </div>
                </>
              )}

              {/* Order summary */}
              <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#666' }}>Order ID</span>
                  <span style={{ fontFamily: 'monospace' }}>{order?.orderId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Amount</span>
                  <span style={{ fontWeight: 700 }}>₹{payment.amount}</span>
                </div>
              </div>

              <button type="submit" style={btnPrimary}>
                Pay ₹{payment.amount}
              </button>
            </form>
          )}

          {/* STEP: Processing */}
          {step === STEPS.PROCESSING && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ width: 48, height: 48, border: '4px solid #1a1a2e', borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ fontWeight: 600, fontSize: 16 }}>Processing Payment...</p>
              <p style={{ color: '#888', fontSize: 13 }}>Please do not close this window</p>
            </div>
          )}

          {/* STEP: Success */}
          {step === STEPS.SUCCESS && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
              <h3 style={{ color: '#27ae60', margin: '0 0 8px' }}>Payment Successful!</h3>
              <p style={{ color: '#555', marginBottom: 16 }}>₹{payment.amount} sent to Dr. {payment.doctor?.name}</p>
              <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '12px 14px', textAlign: 'left', fontSize: 13, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#666' }}>Transaction ID</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{result?.transactionId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Date & Time</span>
                  <span>{new Date(result?.paidAt).toLocaleString('en-IN')}</span>
                </div>
              </div>
              <button onClick={onClose} style={{ ...btnPrimary, background: '#27ae60' }}>Done</button>
            </div>
          )}

          {/* STEP: Failed */}
          {step === STEPS.FAILED && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>❌</div>
              <h3 style={{ color: '#e74c3c', margin: '0 0 8px' }}>Payment Failed</h3>
              <p style={{ color: '#555', marginBottom: 20 }}>{error}</p>
              <button onClick={() => setStep(STEPS.SELECT)} style={btnPrimary}>Try Again</button>
              <button onClick={onClose}
                style={{ width: '100%', padding: 12, background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: 6, fontSize: 15, cursor: 'pointer', marginTop: 8 }}>
                Cancel
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        {![STEPS.PROCESSING, STEPS.SUCCESS, STEPS.FAILED].includes(step) && (
          <div style={{ padding: '10px 24px 16px', textAlign: 'center', fontSize: 12, color: '#aaa', borderTop: '1px solid #f0f0f0' }}>
            🔒 Secured by MedAnnotate Pay &nbsp;|&nbsp; 256-bit SSL Encryption
          </div>
        )}
      </div>
    </div>
  );
}
