import React, { useState, useEffect } from 'react';
import { formatPrice } from '../data';
import { AddressManager } from '../components/AddressManager';
import imsService from '../services/imsApi';

export const MyntraCheckoutPage = ({ cart, onPlaceOrder, onNavigate }) => {
  const [cartWithPricing, setCartWithPricing] = useState([]);
  const [categoryGstMap, setCategoryGstMap] = useState({});  // { categoryId: gstRate }
  const [activeTab, setActiveTab] = useState('address');
  const [addressCompleted, setAddressCompleted] = useState(false);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    title: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India'
  });

  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentLoadingStep, setPaymentLoadingStep] = useState(''); // 'initializing' | 'verifying' | 'creating' | ''

  // ── Dynamic Shipping State ────────────────────────────────────────────────
  const [shippingOptions, setShippingOptions] = useState([]);       // all courier options
  const [selectedCourier, setSelectedCourier] = useState(null);     // customer selected courier
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingZone, setShippingZone] = useState('');

  // ── Coupon / Discount State ───────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');

  // Simple coupon validation — extend with backend API call later
  const applyCoupon = () => {
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (!code) { setCouponError('Enter a coupon code'); return; }
    // Demo coupons — replace with API call: POST /api/coupons/validate
    const coupons = { 'SAVE100': 100, 'FLAT50': 50, 'WELCOME200': 200 };
    if (coupons[code]) {
      setCouponDiscount(coupons[code]);
      setCouponApplied(true);
    } else {
      setCouponError('Invalid coupon code');
      setCouponApplied(false);
      setCouponDiscount(0);
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponError('');
  };

  // Platform Fee info popup
  const [showPlatformFeeInfo, setShowPlatformFeeInfo] = useState(false);
  const [showCodFeeInfo, setShowCodFeeInfo] = useState(false);

  // Location prefill state — "Use My Location" → passed to AddressManager
  const [locationPrefill, setLocationPrefill] = useState(null);

  // Derived: actual shipping charge to use
  // COD surcharge is added only in COD payment mode
  const dynamicShipping = selectedCourier
    ? selectedCourier.charge + (paymentMethod === 'cod' ? (selectedCourier.codCharge || 40) : 0)
    : null;

  // Fetch real-time pricing + GST together so UI always shows correct values
  const updateCheckoutPricing = async () => {
    if (cart.length === 0) {
      setCartWithPricing([]);
      return;
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const authHeaders = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    try {
      const productIds = cart.map(item => item.product?.id).filter(Boolean);

      // Fetch pricing + GST map in parallel
      const [pricingResult, gstMap] = await Promise.all([
        // Pricing fetch
        (async () => {
          try {
            const response = await fetch(
              `http://localhost:9999/api/auth/user/products/priceByProductId?productIds=${productIds.join(',')}`,
              { method: 'GET', headers: authHeaders }
            );
            if (response.ok) return await response.json();
          } catch (_) {}

          // Fallback: fetch all pricing via imsService
          try {
            const allPricing = await imsService.pricing.getAllPricing();
            const map = {};
            allPricing.forEach(p => {
              map[p.productId] = { sellingPrice: p.sellingPrice, gstRate: p.gstRate ?? 0 };
            });
            return map;
          } catch (_) {}
          return null;
        })(),
        // GST map fetch
        imsService.products.getCategoryGstRates().catch(() => ({}))
      ]);

      // Update categoryGstMap state so confirmedTotal in handlePayment also uses it
      if (gstMap && Object.keys(gstMap).length > 0) {
        setCategoryGstMap(gstMap);
      }

      const updatedCart = cart.map(item => {
        const pid = item.product?.id;
        const pricing = pricingResult?.[pid];
        const price = pricing?.sellingPrice || item.product?.price || 0;

        // GST rate: from pricing response → from category GST map → from product → 0
        const catId = item.product?.categoryId;
        const effectiveGstRate =
          pricing?.gstRate ??
          (catId != null ? gstMap?.[catId] : undefined) ??
          item.product?.gstRate ??
          0;

        return {
          ...item,
          product: {
            ...item.product,
            price,
            effectiveGstRate   // embed resolved GST rate directly on product
          }
        };
      });
      setCartWithPricing(updatedCart);
    } catch (error) {
      console.error('Error updating checkout pricing:', error);
      setCartWithPricing(cart);
    }
  };

  useEffect(() => {
    if (cart.length > 0) {
      updateCheckoutPricing();
    } else {
      setCartWithPricing([]);
    }
  }, [cart]);

  const subtotal = cartWithPricing.reduce((sum, item) => sum + ((item.product?.price ?? 0) * item.quantity), 0);
  // Use dynamic shipping if calculated, else ₹50 default
  const shipping = dynamicShipping !== null ? dynamicShipping : ((cartWithPricing.length > 0 || cart.length > 0) ? 50 : 0);
  // Use effectiveGstRate embedded per-product — no dependency on async categoryGstMap state
  const tax = cartWithPricing.reduce((sum, item) => {
    const rate = (item.product?.effectiveGstRate ?? 0) / 100;
    return sum + ((item.product?.price ?? 0) * item.quantity * rate);
  }, 0);
  // Fixed charges
  const warehouseHandling = 15;
  const packagingCost = 20;
  const deliveryCost = 40;
  const platformFee = 10;
  const discount = couponApplied ? couponDiscount : 0;
  const total = subtotal + shipping + tax + warehouseHandling + packagingCost + deliveryCost + platformFee - discount;

  const saveCustomerDetailsToOrders = async (formData) => {
    try {
      const customerPayload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender || 'Not Specified',
        title: formData.title || 'Mr/Ms',
        status: 'ACTIVE',
        addressLine1: formData.address,
        addressLine2: formData.address2 || '',
        city: formData.city,
        state: formData.state,
        pincode: formData.zipCode,
        country: formData.country,
        isDefault: 'ACTIVE'
      };

      const response = await fetch('http://localhost:9999/api/orders/addCustomerDetails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerPayload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Customer details saved:', result);
        return result;
      } else {
        console.error('❌ Failed to save customer details');
        return null;
      }
    } catch (error) {
      console.error('❌ Error saving customer details:', error);
      return null;
    }
  };

  const saveAddressToShipping = async (addressData, customerId) => {
    try {
      const addressPayload = {
        customerId: customerId || 1,
        addressLine1: addressData.address,
        addressLine2: addressData.address2 || '',
        city: addressData.city,
        state: addressData.state,
        zipCode: addressData.zipCode,
        country: addressData.country,
        contactPhone: addressData.phone,
        isDefault: true
      };

      const response = await fetch('http://localhost:9999/api/shipping/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('authToken') || localStorage.getItem('token')
            ? { 'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}` }
            : {})
        },
        body: JSON.stringify(addressPayload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Address saved to shipping:', result);
        return result;
      } else {
        console.error('❌ Failed to save address to shipping');
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving address to shipping:', error);
      return false;
    }
  };

  // ── Calculate Shipping Charges ───────────────────────────────────────────
  /**
   * Called when customer selects/enters an address.
   * Hits /api/shipping/calculate with pincode + total weight.
   * Falls back to a default ₹50 Standard option if service is unreachable.
   */
  const calculateShipping = async (pincode, payMode) => {
    if (!pincode || pincode.trim().length < 6) {
      // Pincode invalid — set default option so UI shows something
      setSelectedCourier({ courier: 'Standard Delivery', charge: 50, estimatedDays: 5, deliverySpeed: 'STANDARD', speedLabel: '3–5 Days', codAvailable: false, codCharge: 40 });
      return;
    }

    // Total weight: 0.5kg per item (default — products don't have weight field yet)
    const totalWeight = cart.reduce((sum, item) => sum + (0.5 * item.quantity), 0) || 0.5;

    setShippingLoading(true);
    try {
      const res = await fetch('http://localhost:9999/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryPincode: pincode.trim(),
          weightKg: totalWeight,
          paymentMode: payMode || (paymentMethod === 'razorpay' ? 'ONLINE' : 'CASH_ON_DELIVERY'),
          deliverySpeed: null  // get all speeds
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Filter out null options (e.g. SAME_DAY for non-local zones)
        const options = (data.allOptions || []).filter(Boolean);
        setShippingOptions(options);
        setShippingZone(data.zoneLabel || '');
        // Auto-select recommended (cheapest)
        if (data.recommended) {
          setSelectedCourier(data.recommended);
          console.log('✅ Shipping rates fetched:', options.length, 'options | Zone:', data.zoneLabel, '| Recommended:', data.recommended.courier, '₹' + data.recommended.charge);
        }
      } else {
        console.warn('⚠️ Shipping calculate API failed — using ₹50 default');
        setShippingOptions([]);
        // Set a visible default so ₹50 shows correctly in UI
        setSelectedCourier({ courier: 'Standard Delivery', charge: 50, estimatedDays: 5, deliverySpeed: 'STANDARD', speedLabel: '3–5 Days', codAvailable: false, codCharge: 40 });
      }
    } catch (err) {
      console.warn('⚠️ Shipping service unreachable — using ₹50 default:', err.message);
      setShippingOptions([]);
      // Set a visible default so ₹50 shows correctly in UI
      setSelectedCourier({ courier: 'Standard Delivery', charge: 50, estimatedDays: 5, deliverySpeed: 'STANDARD', speedLabel: '3–5 Days', codAvailable: false, codCharge: 40 });
    } finally {
      setShippingLoading(false);
    }
  };

  const handleAddressSelected = (address) => {
    if (!address) return;
    setSelectedAddress(address);
    setAddressCompleted(true);
    setShowNewAddressForm(false);
    setActiveTab('payment');
    // Calculate shipping for selected address pincode
    const pincode = address.zipCode || address.pincode || '';
    calculateShipping(pincode, paymentMethod === 'razorpay' ? 'ONLINE' : 'CASH_ON_DELIVERY');
  };

  const handleNewAddressToggle = (show) => {
    setShowNewAddressForm(show);
  };

  // Helper: get auth headers from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Helper: get correct customerId from localStorage
  const getCustomerId = () => {
    return parseInt(localStorage.getItem('userId')) ||
           parseInt(localStorage.getItem('customerId')) ||
           null;
  };

  const addPricingToBackend = async () => {
    // Fire-and-forget — pricing save should not block order creation
    // Errors silently ignored — non-critical step
    try {
      const promises = cartWithPricing.map(async (item) => {
        const effectiveDate = new Date().toISOString().split('.')[0]; // "2026-04-24T10:30:00"
        const payload = {
          productId: item.product.id,
          unitPrice: item.product.price,
          currency: 'INR',
          effectiveDate
        };
        try {
          // Always user endpoint — this is a customer checkout action
          await fetch('http://localhost:9999/api/auth/user/orders/addPricing', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
          });
        } catch (_) { /* non-critical — ignore */ }
      });
      await Promise.all(promises); // parallel — not sequential
      console.log('✅ All pricing data processed');
    } catch (_) { /* non-critical */ }
  };

  const createOrderInBackend = async () => {
    try {
      const customerId = getCustomerId();

      const orderItems = cartWithPricing.map(item => ({
        productId: item.product.id,
        productBarcode: item.product.barcode || `PROD-${item.product.id}`,
        categoryId: item.product.categoryId || item.product.category?.id || null,
        subcategoryId: item.product.subcategoryId || item.product.subcategory?.id || null,
        quantity: item.quantity,
        gstRate: item.product.effectiveGstRate ?? null,  // per-product GST rate
      }));

      const orderPayload = {
        customerId,
        paymentMode: paymentMethod === 'razorpay' ? 'ONLINE' : 'CASH_ON_DELIVERY',
        items: orderItems,
        // ── Dynamic shipping info ──────────────────────────────────────────
        deliveryPincode: selectedAddress?.zipCode || selectedAddress?.pincode || null,
        shippingCharge: selectedCourier ? selectedCourier.charge : 50,
        courierPartner: selectedCourier ? selectedCourier.courier : null,
        deliverySpeed: selectedCourier ? selectedCourier.deliverySpeed : 'STANDARD',
        // ── Fixed charges (backend defaults) ──────────────────────────────
        warehouseHandlingCost: 15,
        packagingCost: 20,
        deliveryCost: 40,
        platformFee: 10,
        // ── Discount / Coupon ──────────────────────────────────────────────
        couponCode: couponCode || null,
        discountAmount: couponApplied ? couponDiscount : 0,
      };

      console.log('Creating order with payload:', orderPayload);
      console.log('Order items detail:', JSON.stringify(orderItems, null, 2));

      // ✅ Always use user endpoint for order creation — customer is placing the order
      // Admin role check is intentionally skipped here: even if localStorage has ADMIN,
      // the order is being placed by the logged-in customer, not an admin action.
      const endpoint = 'http://localhost:9999/api/auth/user/orders/create';

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
        console.error('❌ Failed to create order. Status:', response.status, '| Body:', errorText);

        let errorMessage = '';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorJson.detail || '';
        } catch (_) {
          errorMessage = errorText || '';
        }

        const lower = errorMessage.toLowerCase();
        if (response.status === 403) {
          throw new Error('Session expired. Please log out and log in again.');
        } else if (response.status === 400) {
          if (lower.includes('insufficient') || lower.includes('stock') || lower.includes('inventory')) {
            throw new Error('This product is currently out of stock. Please remove it from your cart and try again.');
          } else if (lower.includes('pricing') || lower.includes('price')) {
            throw new Error('Pricing information is missing. Please refresh the page and try again.');
          } else if (lower.includes('category') || lower.includes('subcategory')) {
            throw new Error('Product category information is missing. Please contact support.');
          } else {
            throw new Error(errorMessage || 'Invalid order details. Please refresh and try again.');
          }
        } else if (response.status === 409) {
          throw new Error('Some items in your cart are out of stock. Please update your cart.');
        } else if (response.status === 503) {
          throw new Error('Our inventory service is temporarily unavailable. Please try again in a moment.');
        } else {
          throw new Error(errorMessage || `Order creation failed (${response.status}). Please try again.`);
        }
      }
    } catch (error) {
      console.error('❌ Error creating order:', error);
      throw error;
    }
  };

  // ─── Razorpay Payment Flow ────────────────────────────────────────────────

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    setMessage('');

    try {
      // ── Step 0: Re-fetch latest pricing + GST (same logic as updateCheckoutPricing) ──
      await updateCheckoutPricing();

      // ── Use already-computed cartWithPricing (fetched on page load) ──────
      // No need to re-fetch pricing again here — it was already loaded when
      // the checkout page mounted. Re-fetching only adds latency.
      const confirmedSubtotal = cartWithPricing.reduce((sum, item) => sum + ((item.product?.price ?? 0) * item.quantity), 0);
      const confirmedShipping = selectedCourier
        ? (selectedCourier.charge + (selectedCourier.codAvailable ? selectedCourier.codCharge : 0))
        : (cartWithPricing.length > 0 ? 50 : 0);
      const confirmedTax = cartWithPricing.reduce((sum, item) => {
        const rate = (item.product?.effectiveGstRate ?? 0) / 100;
        return sum + ((item.product?.price ?? 0) * item.quantity * rate);
      }, 0);
      const confirmedTotal = confirmedSubtotal + confirmedShipping + confirmedTax + warehouseHandling + packagingCost + deliveryCost + platformFee - discount;

      console.log(`💰 Confirmed breakdown at checkout:
  Subtotal:           ₹${confirmedSubtotal}
  Shipping:           ₹${confirmedShipping}
  GST:                ₹${confirmedTax}
  Warehouse Handling: ₹${warehouseHandling}
  Packaging:          ₹${packagingCost}
  Delivery:           ₹${deliveryCost}
  Platform Fee:       ₹${platformFee}
  Discount:          -₹${discount}
  TOTAL:              ₹${confirmedTotal}`);

      // ── COD: no Razorpay, directly create order ──────────────────────────
      if (paymentMethod === 'cod') {
        setPaymentLoadingStep('initializing');
        addPricingToBackend(); // fire-and-forget — don't await
        const orderResult = await createOrderInBackend();
        setPaymentLoadingStep('success');
        setTimeout(() => {
          setPaymentLoadingStep('');
          onPlaceOrder({
            name: selectedAddress?.contactPhone || 'Customer',
            paymentMethod: 'cod',
            amount: confirmedTotal,
            orderNumber: orderResult.orderNumber,
            backendOrderId: orderResult.orderNumber,
            deliveryAddress: selectedAddress
          });
        }, 1500);
        return;
      }

      // ── Online Payment: Razorpay flow ────────────────────────────────────
      setPaymentLoadingStep('initializing');

      // Step 1: Load Razorpay SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setPaymentLoadingStep('');
        setMessage('❌ Failed to load Razorpay. Check your internet connection.');
        setLoading(false);
        return;
      }

      // Step 2: Create Razorpay order from backend — use confirmedTotal (not stale `total`)
      const amountInPaise = Math.round(confirmedTotal * 100);
      console.log(`💰 Payment amount: ₹${total} = ${amountInPaise} paise`);
      if (amountInPaise > 5000000) {
        setPaymentLoadingStep('');
        setMessage('⚠️ Test mode limit: Maximum order amount is ₹50,000. Please reduce cart items for testing.');
        setLoading(false);
        return;
      }
      const createRes = await fetch('http://localhost:9999/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          razorpayAmount: amountInPaise,
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
          customerName: selectedAddress?.contactPhone || '',
          customerEmail: localStorage.getItem('email') || localStorage.getItem('username') || ''
        })
      });

      if (!createRes.ok) {
        setPaymentLoadingStep('');
        setMessage('❌ Could not create payment order. Please try again.');
        setLoading(false);
        return;
      }

      const orderData = await createRes.json();
      if (!orderData.success) {
        setPaymentLoadingStep('');
        setMessage('❌ ' + (orderData.message || 'Order creation failed.'));
        setLoading(false);
        return;
      }

      setPaymentLoadingStep('');

      // Step 3: Open Razorpay Checkout popup
      // NOTE: In test mode, use these test credentials:
      //   Card:  4111 1111 1111 1111 | Expiry: any future date | CVV: any 3 digits
      //   UPI:   success@razorpay
      //   Netbanking: select any bank → use test credentials shown by Razorpay
      const options = {
        key: 'rzp_test_RqbTzmMdnHAVSl',
        amount: amountInPaise,
        currency: 'INR',
        name: 'Inventory Hub',
        description: 'Order Payment',
        order_id: orderData.orderId,
        // Removed custom config.display block — it restricts test-mode flows for UPI/Card/Wallet.
        // Razorpay's default UI handles all payment methods correctly in test mode.
        handler: async (response) => {
          // Step 4: Verify payment on backend
          setLoading(true);
          setPaymentLoadingStep('verifying');

          try {
            const verifyRes = await fetch('http://localhost:9999/api/payments/razorpay/verify', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                orderNumber: orderData.orderId, // Include order ID for tracking
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                amount: orderData.amount,
                currency: orderData.currency
              })
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              setPaymentLoadingStep('creating');
              console.log('✅ Payment verified successfully, creating order...');
              
              try {
                addPricingToBackend(); // fire-and-forget — don't block order creation
                console.log('✅ Pricing save triggered (background)');
                
                const orderResult = await createOrderInBackend();
                console.log('✅ Order created successfully:', orderResult);
                console.log('✅ Order result keys:', orderResult ? Object.keys(orderResult) : 'null');
                console.log('✅ orderNumber value:', orderResult?.orderNumber);
                
                if (!orderResult) {
                  throw new Error('Order creation returned empty response');
                }

                // orderNumber may come back as null if backend had a partial issue —
                // fall back to a timestamp-based reference so the user can still proceed
                const resolvedOrderNumber = orderResult.orderNumber
                  || orderResult.orderId
                  || `ORD-${Date.now()}`;

                if (!orderResult.orderNumber) {
                  console.warn('⚠️ orderNumber missing from response, using fallback:', resolvedOrderNumber, 'Full response:', JSON.stringify(orderResult));
                }

                // Link actual orderNumber to payment_transactions so refund works by orderNumber
                if (orderResult.orderNumber && orderData.orderId) {
                  fetch(`http://localhost:9999/api/payments/link-order?razorpayOrderId=${encodeURIComponent(orderData.orderId)}&orderNumber=${encodeURIComponent(orderResult.orderNumber)}`, {
                    method: 'PATCH',
                    headers: getAuthHeaders()
                  }).catch(e => console.warn('⚠️ Could not link payment to order:', e));
                }
                
                setPaymentLoadingStep('success');
                setTimeout(() => {
                  setPaymentLoadingStep('');
                  onPlaceOrder({
                    name: selectedAddress?.contactPhone || 'Customer',
                    paymentMethod: 'razorpay',
                    amount: confirmedTotal,
                    orderNumber: resolvedOrderNumber,
                    backendOrderId: resolvedOrderNumber,
                    razorpayPaymentId: response.razorpay_payment_id,
                    deliveryAddress: selectedAddress
                  });
                }, 1800);
              } catch (orderError) {
                console.error('❌ Order creation failed:', orderError);
                setPaymentLoadingStep('');
                setMessage(`❌ Payment successful but order creation failed: ${orderError.message}. Please contact support with payment ID: ${response.razorpay_payment_id}`);
                setLoading(false);
              }
            } else {
              setPaymentLoadingStep('');
              setMessage('❌ Payment verification failed. Please contact support.');
              setLoading(false);
            }
          } catch (err) {
            setPaymentLoadingStep('');
            setMessage('❌ Error verifying payment: ' + err.message);
            setLoading(false);
          }
        },
        prefill: {
          name: selectedAddress?.name || 'Test User',
          email: 'test@example.com',
          contact: selectedAddress?.contactPhone || '9999999999'
        },
        theme: { color: '#ca8a04' },
        modal: {
          ondismiss: () => {
            setPaymentLoadingStep('');
            setMessage('⚠️ Payment cancelled.');
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      setLoading(false);

    } catch (error) {
      setPaymentLoadingStep('');
      const errMsg = error.message || '';
      if (
        errMsg.toLowerCase().includes('insufficient') ||
        errMsg.toLowerCase().includes('out of stock') ||
        errMsg.toLowerCase().includes('inventory')
      ) {
        setMessage(
          '⚠️ This product is currently out of stock. Please wait — we will notify you once stock is available.'
        );
      } else {
        setMessage('❌ Something went wrong: ' + errMsg);
      }
      setLoading(false);
    }
  };

  const isAddressFormValid = () => {
    return formData.firstName && formData.lastName && formData.email && 
           formData.phone && formData.address && formData.city && 
           formData.state && formData.zipCode;
  };

  const isPaymentFormValid = () => {
    // Both razorpay and COD are always valid to proceed
    return true;
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-serif mb-4">Your cart is empty</h1>
        <p className="text-muted mb-8">Add some products to checkout.</p>
        <button onClick={() => onNavigate('shop')} className="px-6 py-3 bg-primary text-white rounded-lg font-medium">Continue Shopping</button>
      </div>
    );
  }

  // ── Payment Loading Steps Config ─────────────────────────────────────────
  const paymentSteps = {
    initializing: {
      icon: (
        <svg className="w-14 h-14 text-yellow-500 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ),
      title: 'Initializing Payment',
      subtitle: 'Setting up your secure payment session...',
      steps: ['Connecting to payment gateway', 'Generating secure order', 'Loading checkout'],
      activeStep: 1,
    },
    verifying: {
      icon: (
        <svg className="w-14 h-14 text-blue-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-2.13-.558-4.13-1.535-5.867" />
        </svg>
      ),
      title: 'Verifying Payment',
      subtitle: 'Confirming your transaction with the bank...',
      steps: ['Payment received', 'Verifying signature', 'Confirming with bank'],
      activeStep: 2,
    },
    creating: {
      icon: (
        <svg className="w-14 h-14 text-green-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8 8-4-4" />
        </svg>
      ),
      title: 'Creating Your Order',
      subtitle: 'Almost there! Finalizing your order details...',
      steps: ['Payment verified ✓', 'Updating inventory', 'Placing order'],
      activeStep: 3,
    },
    success: {
      icon: (
        <div className="relative">
          {/* Animated checkmark circle */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-2xl animate-bounce-once">
            <svg className="w-14 h-14 text-white animate-check-draw" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          {/* Success ring animation */}
          <div className="absolute inset-0 rounded-full border-4 border-green-300 animate-ping opacity-75"></div>
        </div>
      ),
      title: '🎉 Order Placed Successfully!',
      subtitle: 'Your order has been confirmed. Check your email for details.',
      steps: ['Payment verified ✓', 'Inventory updated ✓', 'Order placed ✓'],
      activeStep: 4,
    },
  };

  const currentStep = paymentSteps[paymentLoadingStep];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Platform Fee Info Popup — Myntra Style ── */}
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

      {/* ── COD Fee Info Popup ── */}
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
              A convenience fee charged for Cash on Delivery orders to cover the additional handling and cash collection costs involved.
            </p>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
              <p>✅ Cash collection & verification at doorstep</p>
              <p>✅ Extra handling by delivery partner</p>
              <p>✅ Return logistics for undelivered orders</p>
            </div>
          </div>
        </div>
      )}
      {paymentLoadingStep && currentStep && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden transition-all duration-300 ${paymentLoadingStep === 'success' ? 'ring-2 ring-green-400' : ''}`}>
            {/* Top accent bar */}
            <div className={`h-1.5 w-full ${paymentLoadingStep === 'success' ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 animate-pulse'}`} />

            {paymentLoadingStep === 'success' ? (
              /* ── SUCCESS STATE ── */
              <div className="p-8 text-center">
                {/* Animated checkmark */}
                <div className="flex justify-center mb-5">
                  {currentStep.icon}
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Order Placed!</h2>
                <p className="text-sm text-gray-500 mb-6">Your order has been confirmed successfully.</p>

                {/* All steps done */}
                <div className="space-y-2 text-left mb-6">
                  {currentStep.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-green-700 font-medium">{step}</span>
                    </div>
                  ))}
                </div>

                {/* Success message box */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs text-green-700 font-medium">📧 Confirmation email sent to your inbox</p>
                  <p className="text-xs text-green-600 mt-1">Redirecting to your profile...</p>
                </div>
              </div>
            ) : (
              /* ── LOADING STATES ── */
              <div className="p-8 text-center">
                {/* Icon */}
                <div className="flex justify-center mb-5">
                  {currentStep.icon}
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-gray-800 mb-1">{currentStep.title}</h2>
                <p className="text-sm text-gray-500 mb-7">{currentStep.subtitle}</p>

                {/* Step progress */}
                <div className="space-y-2.5 text-left">
                  {currentStep.steps.map((step, idx) => {
                    const stepNum = idx + 1;
                    const isDone = stepNum < currentStep.activeStep;
                    const isActive = stepNum === currentStep.activeStep;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all
                          ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-yellow-500 text-white ring-4 ring-yellow-100' : 'bg-gray-100 text-gray-400'}`}>
                          {isDone ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : stepNum}
                        </div>
                        <span className={`text-sm ${isDone ? 'text-green-700 font-medium' : isActive ? 'text-gray-800 font-semibold' : 'text-gray-400'}`}>
                          {step}
                        </span>
                        {isActive && (
                          <span className="ml-auto flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Secure badge */}
                <div className="mt-7 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  256-bit SSL encrypted · Powered by Razorpay
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <button 
                onClick={() => onNavigate('home')}
                className="text-2xl font-bold text-yellow-600"
              >
                Inventory Hub
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('✅') 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : message.includes('❌')
              ? 'bg-red-100 text-red-800 border border-red-200'
              : message.includes('⚠️')
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm mb-6">
              <div className="flex border-b border-gray-200">
                <button
                  className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                    activeTab === 'address'
                      ? 'text-yellow-600 border-b-2 border-yellow-600 bg-yellow-50'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setActiveTab('address')}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      addressCompleted ? 'bg-green-500 text-white' : activeTab === 'address' ? 'bg-yellow-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                      {addressCompleted ? '✓' : '1'}
                    </span>
                    <span>ADDRESS</span>
                  </div>
                </button>
                <button
                  className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                    activeTab === 'payment'
                      ? 'text-yellow-600 border-b-2 border-yellow-600 bg-yellow-50'
                      : addressCompleted 
                      ? 'text-gray-800 hover:text-yellow-600 cursor-pointer'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={() => addressCompleted && setActiveTab('payment')}
                  disabled={!addressCompleted}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      activeTab === 'payment' ? 'bg-yellow-600 text-white' : addressCompleted ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                      2
                    </span>
                    <span>PAYMENT</span>
                  </div>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'address' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-serif">Delivery Address</h2>
                      <button
                        type="button"
                        onClick={() => {
                          if (!navigator.geolocation) {
                            alert('❌ Geolocation is not supported by this browser');
                            return;
                          }

                          alert('📍 Getting your location...');
                          
                          navigator.geolocation.getCurrentPosition(
                            async (position) => {
                              const { latitude, longitude } = position.coords;
                              
                              try {
                                // Reverse geocoding using OpenStreetMap Nominatim API (free)
                                const response = await fetch(
                                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
                                );
                                
                                if (!response.ok) throw new Error('Geocoding failed');
                                
                                const data = await response.json();
                                const address = data.address || {};
                                
                                const locationPrefill = {
                                  city: address.city || address.town || address.village || address.suburb || '',
                                  state: address.state || address.region || '',
                                  zipCode: address.postcode || ''
                                };
                                
                                if (locationPrefill.city && locationPrefill.state) {
                                  alert(`✅ Location detected: ${locationPrefill.city}, ${locationPrefill.state}${locationPrefill.zipCode ? ' - ' + locationPrefill.zipCode : ''}`);
                                  setLocationPrefill(locationPrefill);
                                  if (locationPrefill.zipCode) {
                                    calculateShipping(locationPrefill.zipCode, paymentMethod === 'razorpay' ? 'ONLINE' : 'CASH_ON_DELIVERY');
                                  }
                                } else {
                                  alert('⚠️ Could not determine complete address from your location');
                                }
                              } catch (error) {
                                console.error('Geocoding error:', error);
                                alert('❌ Failed to get address from location. Please enter manually.');
                              }
                            },
                            (error) => {
                              console.error('Geolocation error:', error);
                              let message = '❌ Location access failed: ';
                              switch (error.code) {
                                case error.PERMISSION_DENIED:
                                  message += 'Permission denied. Please allow location access.';
                                  break;
                                case error.POSITION_UNAVAILABLE:
                                  message += 'Location unavailable.';
                                  break;
                                case error.TIMEOUT:
                                  message += 'Location request timed out.';
                                  break;
                                default:
                                  message += 'Unknown error occurred.';
                              }
                              alert(message);
                            },
                            {
                              enableHighAccuracy: true,
                              timeout: 10000,
                              maximumAge: 300000 // 5 minutes cache
                            }
                          );
                        }}
                        className="flex items-center gap-1.5 text-sm font-medium text-orange-600 border border-orange-300 rounded-lg px-3 py-1.5 hover:bg-orange-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.104 0 2-.896 2-2s-.896-2-2-2-2 .896-2 2 .896 2 2 2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" />
                        </svg>
                        Use My Location
                      </button>
                    </div>
                    
                    {/* Address Manager — fetches saved addresses by the logged-in user's customerId.
                        If addresses exist → shows address boxes.
                        If no addresses → auto-opens the add form. */}
                    <AddressManager
                      onAddressSelected={handleAddressSelected}
                      showNewAddressForm={showNewAddressForm}
                      onFormToggle={handleNewAddressToggle}
                      autoOpenFormIfEmpty={true}
                      prefillData={locationPrefill}
                    />

                    {/* Selected address summary */}
                    {selectedAddress && addressCompleted && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                        <span className="text-green-600 text-lg">✅</span>
                        <div className="text-sm text-green-800">
                          <p className="font-semibold">Delivering to:</p>
                          <p>{selectedAddress.addressLine1}{selectedAddress.addressLine2 ? `, ${selectedAddress.addressLine2}` : ''}</p>
                          <p>{selectedAddress.city}, {selectedAddress.state} — {selectedAddress.zipCode}</p>
                          <button
                            onClick={() => { setAddressCompleted(false); setActiveTab('address'); }}
                            className="mt-1 text-xs text-yellow-700 underline hover:text-yellow-900"
                          >
                            Change address
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Proceed to payment */}
                    {selectedAddress && !addressCompleted && (
                      <button
                        onClick={() => { setAddressCompleted(true); setActiveTab('payment'); }}
                        className="mt-4 w-full py-3 bg-yellow-600 text-white rounded-xl font-semibold hover:bg-yellow-700 transition-colors"
                      >
                        Proceed to Payment →
                      </button>
                    )}
                  </div>
                )}

                {activeTab === 'payment' && (
                  <div>
                    <h2 className="text-xl font-medium mb-6">Choose Payment Method</h2>

                    {/* Payment Methods */}
                    <div className="space-y-4 mb-6">

                      {/* Online Payment via Razorpay */}
                      <div 
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          paymentMethod === 'razorpay' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setPaymentMethod('razorpay');
                          // Recalculate shipping with ONLINE mode (no COD surcharge)
                          const pincode = selectedAddress?.zipCode || selectedAddress?.pincode || '';
                          if (pincode) calculateShipping(pincode, 'ONLINE');
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              checked={paymentMethod === 'razorpay'} 
                              onChange={() => setPaymentMethod('razorpay')}
                              className="mr-3 text-yellow-600"
                            />
                            <div>
                              <span className="font-medium">Online Payment</span>
                              <p className="text-xs text-gray-500 mt-0.5">Card / UPI / Net Banking / Wallet</p>
                            </div>
                          </div>
                          <img 
                            src="https://razorpay.com/favicon.png" 
                            alt="Razorpay" 
                            className="h-6 w-6"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        </div>

                        {paymentMethod === 'razorpay' && (
                          <div className="mt-3 ml-6 p-3 bg-yellow-100 rounded-lg text-sm text-yellow-800">
                            🔒 Secure checkout powered by Razorpay. You can pay via Card, UPI, Net Banking or Wallet.
                          </div>
                        )}
                      </div>

                      {/* Cash on Delivery */}
                      <div 
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          paymentMethod === 'cod' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setPaymentMethod('cod');
                          // Recalculate shipping with COD mode to show COD surcharge
                          const pincode = selectedAddress?.zipCode || selectedAddress?.pincode || '';
                          if (pincode) calculateShipping(pincode, 'CASH_ON_DELIVERY');
                        }}
                      >
                        <div className="flex items-center">
                          <input 
                            type="radio" 
                            checked={paymentMethod === 'cod'} 
                            onChange={() => setPaymentMethod('cod')}
                            className="mr-3 text-yellow-600"
                          />
                          <div>
                            <span className="font-medium">Cash on Delivery</span>
                            <p className="text-xs text-gray-500 mt-0.5">Pay when your order arrives (+₹20 COD charge)</p>
                          </div>
                        </div>

                        {paymentMethod === 'cod' && (
                          <div className="mt-3 ml-6 p-3 bg-gray-100 rounded-lg text-sm text-gray-700">
                            📦 Your order will be placed immediately. Pay cash at the time of delivery.
                          </div>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={handlePayment}
                      disabled={loading}
                      className={`w-full py-3 rounded font-medium transition-all ${
                        loading
                          ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                          : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      }`}
                    >
                      {loading
                        ? 'PROCESSING...'
                        : paymentMethod === 'cod'
                        ? `PLACE ORDER — ${formatPrice(total + 20)}`
                        : `PAY ${formatPrice(total)} via Razorpay`
                      }
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── PRICE DETAILS — Myntra Style ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm sticky top-24 overflow-hidden">

              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                  Price Details ({(cartWithPricing.length > 0 ? cartWithPricing : cart).reduce((s, i) => s + i.quantity, 0)} Items)
                </h3>
              </div>

              {/* Item list */}
              <div className="px-5 py-3 border-b border-gray-100 space-y-3">
                {(cartWithPricing.length > 0 ? cartWithPricing : cart).map(item => (
                  <div key={item.product?.id ?? item.productId} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                      <img
                        src={item.product?.imageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200'}
                        alt={item.product?.name || 'Product'}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.product?.name || 'Loading...'}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 flex-shrink-0">
                      {formatPrice((item.product?.price ?? 0) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Coupon / Promo Code */}
              <div className="px-5 py-3 border-b border-gray-100">
                {!couponApplied ? (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter promo code"
                        value={couponCode}
                        onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                        className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                      />
                      <button
                        onClick={applyCoupon}
                        className="px-4 py-2 text-sm font-semibold text-orange-600 border border-orange-400 rounded-md hover:bg-orange-50 transition-colors"
                      >Apply</button>
                    </div>
                    {couponError && <p className="text-xs text-red-500 mt-1.5">{couponError}</p>}
                    <p className="text-xs text-gray-400 mt-1.5">Try: SAVE100 · FLAT50 · WELCOME200</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 text-sm">🏷️</span>
                      <div>
                        <p className="text-xs font-semibold text-green-700">{couponCode} applied</p>
                        <p className="text-xs text-green-600">You save {formatPrice(couponDiscount)}</p>
                      </div>
                    </div>
                    <button onClick={removeCoupon} className="text-xs text-gray-400 hover:text-red-500 underline">Remove</button>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="px-5 py-4 space-y-3">

                {/* Total MRP */}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total MRP</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                {/* Discount on MRP — always show if any discount exists */}
                {(() => {
                  const mrpTotal = cartWithPricing.reduce((s, item) => {
                    const mrp = item.product?.originalPrice || item.product?.mrp || item.product?.price || 0;
                    return s + mrp * item.quantity;
                  }, 0);
                  const discountOnMrp = mrpTotal - subtotal;
                  return discountOnMrp > 0 ? (
                    <div className="flex justify-between text-sm text-green-600 font-medium">
                      <span>Discount on MRP</span>
                      <span>− {formatPrice(discountOnMrp)}</span>
                    </div>
                  ) : null;
                })()}

                {/* Coupon Discount */}
                {couponApplied && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Coupon Discount ({couponCode})</span>
                    <span>− {formatPrice(couponDiscount)}</span>
                  </div>
                )}

                {/* GST */}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    GST
                    {cartWithPricing.length === 1 && cartWithPricing[0].product?.effectiveGstRate > 0
                      ? ` (${cartWithPricing[0].product.effectiveGstRate}%)`
                      : cartWithPricing.length > 1 && tax > 0 ? ' (mixed)' : ' (0%)'}
                  </span>
                  <span>{formatPrice(tax)}</span>
                </div>

                {/* Platform Fee */}
                <div className="flex justify-between text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    Platform Fee
                    <button
                      onClick={() => setShowPlatformFeeInfo(true)}
                      className="text-xs text-orange-500 underline cursor-pointer hover:text-orange-700 bg-transparent border-none p-0"
                    >Know More</button>
                  </span>
                  <span>{formatPrice(platformFee)}</span>
                </div>

                {/* COD Fee */}
                {paymentMethod === 'cod' && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      Cash/Pay on Delivery Fee
                      <button
                        onClick={() => setShowCodFeeInfo(true)}
                        className="text-xs text-blue-500 underline cursor-pointer hover:text-blue-700 bg-transparent border-none p-0"
                      >Know More</button>
                    </span>
                    <span>₹20</span>
                  </div>
                )}
              </div>

              {/* Total Amount */}
              <div className="px-5 py-4 border-t-4 border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900">Total Amount</span>
                  <span className="text-base font-bold text-gray-900">
                    {paymentMethod === 'cod'
                      ? formatPrice(total + 20)
                      : formatPrice(total)
                    }
                  </span>
                </div>
                {couponApplied && (
                  <p className="text-xs text-green-600 font-medium mt-1">
                    🎉 You're saving {formatPrice(couponDiscount)} on this order
                  </p>
                )}
              </div>

              {/* Safe & Secure badge */}
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">
                  🔒 Safe and Secure Payments. Easy returns. 100% Authentic products.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};