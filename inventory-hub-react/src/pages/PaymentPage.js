import React, { useState } from 'react';
import { formatPrice } from '../data';

export const PaymentPage = ({ cart, customerDetails, onPaymentComplete, onNavigate }) => {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPlatformFeeInfo, setShowPlatformFeeInfo] = useState(false);
  const [showCodFeeInfo, setShowCodFeeInfo] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const shipping = subtotal > 0 ? 50 : 0;
  // Use per-product GST rate if available, else fall back to 5%
  const tax = cart.reduce((sum, item) => {
    const rate = (item.product?.effectiveGstRate ?? item.product?.gstRate ?? 5) / 100;
    return sum + (item.product.price * item.quantity * rate);
  }, 0);
  // Fixed charges (same as checkout)
  const warehouseHandling = 15;
  const packagingCost = 20;
  const deliveryCost = 40;
  const platformFee = 10;
  const total = subtotal + shipping + tax + warehouseHandling + packagingCost + deliveryCost + platformFee;

  const handleCardInputChange = (field, value) => {
    if (field === 'cardNumber') {
      // Format card number with spaces
      value = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
      if (value.length > 19) return;
    } else if (field === 'expiryDate') {
      // Format expiry date MM/YY
      value = value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
      if (value.length > 5) return;
    } else if (field === 'cvv') {
      // Only allow 3-4 digits
      value = value.replace(/\D/g, '');
      if (value.length > 4) return;
    }
    
    setCardDetails(prev => ({ ...prev, [field]: value }));
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const getCustomerId = () => {
    return parseInt(localStorage.getItem('userId')) ||
           parseInt(localStorage.getItem('customerId')) ||
           1;
  };

  const createOrderInBackend = async (cart) => {
    try {
      const customerId = getCustomerId();

      const orderItems = cart.map(item => ({
        productId: item.product.id,
        productBarcode: item.product.barcode || `PROD-${item.product.id}`,
        categoryId: item.product.categoryId || item.product.category?.id || null,
        subcategoryId: item.product.subcategoryId || item.product.subcategory?.id || null,
        quantity: item.quantity
      }));

      const orderPayload = {
        customerId,
        paymentMode: paymentMethod === 'card' ? 'CREDIT_CARD' :
                     paymentMethod === 'upi' ? 'UPI' : 'CASH_ON_DELIVERY',
        items: orderItems,
        // Fixed charges (same as checkout)
        warehouseHandlingCost: 15,
        packagingCost: 20,
        deliveryCost: 40,
        platformFee: 10,
      };

      console.log('Creating order with payload:', orderPayload);

      const userRole = localStorage.getItem('userRole') || 'USER';
      const endpoint = userRole === 'ADMIN'
        ? 'http://localhost:9999/api/auth/admin/orders/create'
        : 'http://localhost:9999/api/auth/user/orders/create';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderPayload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Order created successfully:', result);
        return result;
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to create order:', errorText);
        throw new Error(`Order creation failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error creating order:', error);
      throw error;
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    setMessage('Processing payment...');

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setMessage('✅ Payment successful! Creating order...');
      
      // Create order in backend
      const orderResult = await createOrderInBackend(cart);
      
      setMessage('🎉 Order created successfully! All tables updated.');
      
      setTimeout(() => {
        onPaymentComplete({
          paymentMethod,
          amount: total,
          transactionId: `TXN${Date.now()}`,
          status: 'SUCCESS',
          orderNumber: orderResult.orderNumber,
          backendOrderId: orderResult.orderNumber
        });
      }, 2000);
      
    } catch (error) {
      setMessage('❌ Order creation failed. Please try again.');
      console.error('Order creation error:', error);
      setLoading(false);
    }
  };

  const isFormValid = () => {
    if (paymentMethod === 'card') {
      return cardDetails.cardNumber.replace(/\s/g, '').length >= 16 &&
             cardDetails.expiryDate.length === 5 &&
             cardDetails.cvv.length >= 3 &&
             cardDetails.cardholderName.trim().length > 0;
    } else if (paymentMethod === 'upi') {
      return upiId.includes('@') && upiId.length > 5;
    }
    return true; // For COD
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-serif mb-4">No items to pay for</h1>
        <button onClick={() => onNavigate('shop')} className="px-6 py-3 bg-primary text-white rounded-lg font-medium">
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Platform Fee Modal */}
      {showPlatformFeeInfo && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40"
          onClick={() => setShowPlatformFeeInfo(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPlatformFeeInfo(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl font-light"
            >✕</button>
            <h3 className="text-base font-semibold text-gray-900 mb-3">Platform Fee</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Fee levied by Inventory Hub to sustain the efficient operations and continuous improvement of the platform, for a hassle-free app experience.
            </p>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
              <p>✅ Secure payment gateway maintenance</p>
              <p>✅ App & server infrastructure</p>
              <p>✅ 24/7 customer support</p>
              <p>✅ Order tracking & notifications</p>
            </div>
          </div>
        </div>
      )}

      {/* COD Fee Modal */}
      {showCodFeeInfo && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40"
          onClick={() => setShowCodFeeInfo(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCodFeeInfo(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl font-light"
            >✕</button>
            <h3 className="text-base font-semibold text-gray-900 mb-3">Cash / Pay on Delivery Fee</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              A convenience fee charged for Cash on Delivery orders to cover the additional handling and collection costs involved.
            </p>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
              <p>✅ Cash collection & verification at doorstep</p>
              <p>✅ Extra handling by delivery partner</p>
              <p>✅ Return logistics for undelivered orders</p>
            </div>
          </div>
        </div>
      )}
      <div className="mb-8">
        <button 
          onClick={() => onNavigate('checkout')}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mb-4"
        >
          <span className="mr-2">←</span> Back to Checkout
        </button>
        <h1 className="text-4xl font-serif">Secure Payment</h1>
        <p className="text-gray-600 mt-2">Complete your purchase securely</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('✅') 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : message.includes('❌')
            ? 'bg-red-100 text-red-800 border border-red-200'
            : 'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Methods */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-2xl font-serif mb-6">Payment Method</h2>
            
            {/* Payment Method Selection */}
            <div className="space-y-4 mb-8">
              <div 
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setPaymentMethod('card')}
              >
                <div className="flex items-center">
                  <input 
                    type="radio" 
                    checked={paymentMethod === 'card'} 
                    onChange={() => setPaymentMethod('card')}
                    className="mr-3 text-blue-600"
                  />
                  <div className="flex items-center">
                    <span className="text-lg font-medium">Credit/Debit Card</span>
                    <div className="ml-4 flex space-x-2">
                      <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">VISA</div>
                      <div className="w-8 h-5 bg-red-600 rounded text-white text-xs flex items-center justify-center font-bold">MC</div>
                      <div className="w-8 h-5 bg-green-600 rounded text-white text-xs flex items-center justify-center font-bold">AE</div>
                    </div>
                  </div>
                </div>
              </div>

              <div 
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  paymentMethod === 'upi' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setPaymentMethod('upi')}
              >
                <div className="flex items-center">
                  <input 
                    type="radio" 
                    checked={paymentMethod === 'upi'} 
                    onChange={() => setPaymentMethod('upi')}
                    className="mr-3 text-blue-600"
                  />
                  <div className="flex items-center">
                    <span className="text-lg font-medium">UPI Payment</span>
                    <div className="ml-4 flex space-x-2">
                      <div className="w-8 h-5 bg-orange-500 rounded text-white text-xs flex items-center justify-center font-bold">GPay</div>
                      <div className="w-8 h-5 bg-blue-800 rounded text-white text-xs flex items-center justify-center font-bold">PPay</div>
                    </div>
                  </div>
                </div>
              </div>

              <div 
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  paymentMethod === 'cod' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setPaymentMethod('cod')}
              >
                <div className="flex items-center">
                  <input 
                    type="radio" 
                    checked={paymentMethod === 'cod'} 
                    onChange={() => setPaymentMethod('cod')}
                    className="mr-3 text-blue-600"
                  />
                  <span className="text-lg font-medium">Cash on Delivery</span>
                  <span className="ml-2 text-sm text-gray-600">(₹20 extra charges)</span>
                </div>
              </div>
            </div>

            {/* Payment Details Forms */}
            {paymentMethod === 'card' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium mb-4">Card Details</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Cardholder Name</label>
                  <input 
                    type="text"
                    value={cardDetails.cardholderName}
                    onChange={(e) => handleCardInputChange('cardholderName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Card Number</label>
                  <input 
                    type="text"
                    value={cardDetails.cardNumber}
                    onChange={(e) => handleCardInputChange('cardNumber', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1234 5678 9012 3456"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Expiry Date</label>
                    <input 
                      type="text"
                      value={cardDetails.expiryDate}
                      onChange={(e) => handleCardInputChange('expiryDate', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="MM/YY"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">CVV</label>
                    <input 
                      type="text"
                      value={cardDetails.cvv}
                      onChange={(e) => handleCardInputChange('cvv', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="123"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'upi' && (
              <div>
                <h3 className="text-lg font-medium mb-4">UPI Details</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">UPI ID</label>
                  <input 
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="yourname@paytm"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'cod' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2">Cash on Delivery</h3>
                <p className="text-sm text-gray-600">
                  Pay when your order is delivered. Additional ₹20 will be charged for COD service.
                </p>
              </div>
            )}

            <button 
              onClick={handlePayment}
              disabled={loading || !isFormValid()}
              className={`w-full mt-8 py-4 rounded-lg font-medium text-lg transition-all ${
                loading || !isFormValid()
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl'
              } text-white`}
            >
              {loading ? 'Processing Payment...' : `Pay ${formatPrice(paymentMethod === 'cod' ? total + 20 : total)}`}
            </button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 sticky top-28 shadow-sm">
            <h2 className="text-xl font-serif mb-4">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              {cart.map(item => (
                <div key={item.product.id} className="flex gap-3">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                    <img 
                      src={item.product.imageUrl} 
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium line-clamp-1">{item.product.name}</h3>
                    <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                    <p className="text-sm font-semibold text-blue-600">{formatPrice(item.product.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-gray-300 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total MRP</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST</span>
                <span className="font-medium">{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-600">
                  Platform Fee
                  <button
                    onClick={() => setShowPlatformFeeInfo(true)}
                    className="text-xs text-orange-500 underline cursor-pointer hover:text-orange-700 bg-transparent border-none p-0"
                  >Know More</button>
                </span>
                <span className="font-medium">₹{platformFee}.00</span>
              </div>
              {paymentMethod === 'cod' && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1 text-gray-600">
                    Cash/Pay on Delivery Fee
                    <button
                      onClick={() => setShowCodFeeInfo(true)}
                      className="text-xs text-blue-500 underline cursor-pointer hover:text-blue-700 bg-transparent border-none p-0"
                    >Know More</button>
                  </span>
                  <span className="font-medium">₹20.00</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-300">
                <span>Total Amount</span>
                <span className="text-blue-600">{formatPrice(paymentMethod === 'cod' ? total + 20 : total)}</span>
              </div>
            </div>

            {/* Security Badge */}
            <div className="mt-6 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center text-green-800">
                <span className="mr-2">🔒</span>
                <span className="text-sm font-medium">Secure Payment</span>
              </div>
              <p className="text-xs text-green-600 mt-1">Your payment information is encrypted and secure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};