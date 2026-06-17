import { TrendingUp, Bookmark, Diamond, Star, Plus, FileText, UserPlus, BarChart3, Package, AlertTriangle } from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { useState, useEffect } from 'react';
import '../css/NewDashboard.css';
import { imsService } from '../../services/imsApi';
import { adminService } from '../../services/adminApi';

const COLORS = ['#fe7096', '#9a55ff', '#36a2eb', '#10b981', '#f59e0b', '#ef4444'];
const ORDER_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function StatsCard({ title, value, change, icon: Icon, variant, trend }) {
  const getVariantStyles = () => {
    switch(variant) {
      case 'sales':
        return { background: 'linear-gradient(135deg, #ffbf96 0%, #fe7096 100%)' };
      case 'orders':
        return { background: 'linear-gradient(135deg, #90caf9 0%, #047edf 99%)' };
      case 'visitors':
        return { background: 'linear-gradient(135deg, #84d9d2 0%, #07cdae 100%)' };
      case 'customers':
        return { background: 'linear-gradient(135deg, #da8cff 0%, #9a55ff 100%)' };
      default:
        return { background: 'linear-gradient(135deg, #da8cff 0%, #9a55ff 100%)' };
    }
  };

  return (
    <div 
      className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg transition-transform hover:-translate-y-1 duration-300"
      style={getVariantStyles()}
    >
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>

      <div className="relative z-10 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-white/90 mb-1">{title}</h3>
          <h2 className="text-3xl font-bold mb-4">{value}</h2>
          {change && (
            <p className="text-sm font-medium opacity-90">
              {variant === 'customers'
                ? change
                : trend === "up" ? `↑ ${change}` : `↓ ${change}`}
            </p>
          )}
        </div>
        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function SalesChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h4 className="text-lg font-bold text-gray-800 mb-6">Sales & Profit Trend</h4>
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          <p>No sales data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-bold text-gray-800">Sales & Profit Trend</h4>
        <div className="flex gap-4 text-sm font-medium">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500"></span> Revenue
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-400"></span> Cost
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-pink-400"></span> Profit
          </span>
        </div>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} 
              tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              formatter={(value) => `₹${Number(value).toLocaleString()}`}
            />
            <Line type="monotone" dataKey="revenue" stroke="#9a55ff" strokeWidth={3} dot={{ r: 4, fill: '#9a55ff' }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="cost" stroke="#36a2eb" strokeWidth={3} dot={{ r: 4, fill: '#36a2eb' }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="profit" stroke="#fe7096" strokeWidth={3} dot={{ r: 4, fill: '#fe7096' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function OrderStatusChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
        <h4 className="text-lg font-bold text-gray-800 mb-6">Order Status</h4>
        <div className="h-[250px] flex items-center justify-center text-gray-400">
          <p>No order data</p>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const topStatus = data[0];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
      <h4 className="text-lg font-bold text-gray-800 mb-6">Order Status</h4>
      <div className="h-[250px] w-full flex items-center justify-center relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={ORDER_COLORS[index % ORDER_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-gray-800">{total}</span>
          <span className="text-xs text-gray-500">Total Orders</span>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-4 text-xs text-gray-500 flex-wrap">
        {data.slice(0, 3).map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ background: ORDER_COLORS[i] }}></div>
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function StockProgressCard({ inventory, categories }) {
  // Group inventory by category
  const categoryStock = {};
  inventory.forEach(item => {
    const catId = item.categoryId;
    if (!categoryStock[catId]) {
      categoryStock[catId] = { available: 0, total: 0 };
    }
    categoryStock[catId].total++;
    if (item.inventoryStatus === 'AVAILABLE') {
      categoryStock[catId].available++;
    }
  });

  const stockData = Object.entries(categoryStock)
    .map(([catId, data]) => {
      const cat = categories.find(c => c.id === Number(catId));
      const percentage = data.total > 0 ? Math.round((data.available / data.total) * 100) : 0;
      return {
        name: cat?.name || `Category ${catId}`,
        percentage,
        available: data.available,
        total: data.total
      };
    })
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 4);

  const getColorClass = (pct) => {
    if (pct >= 75) return 'green';
    if (pct >= 50) return 'blue';
    if (pct >= 25) return 'yellow';
    return 'red';
  };

  return (
    <div className="stock-card">
      <div className="stock-header">
        <h3>Stock Availability</h3>
        <Package className="stock-icon" size={20} />
      </div>

      {stockData.length > 0 ? stockData.map((item, i) => (
        <div key={i} className="stock-item">
          <div className="stock-label">
            <span>{item.name}</span>
            <span>{item.percentage}% ({item.available}/{item.total})</span>
          </div>
          <div className="progress-bg">
            <div className={`progress-fill ${getColorClass(item.percentage)}`} style={{ width: `${item.percentage}%` }}></div>
          </div>
        </div>
      )) : (
        <p className="text-sm text-gray-500 text-center py-4">No inventory data</p>
      )}
    </div>
  );
}

function CollaborationCard({ ordersByStatus, totalOrders }) {
  // Use pre-computed ordersByStatus map from reports/summary API
  const get = (keys) => keys.reduce((sum, k) => sum + (ordersByStatus[k] || 0), 0);

  const processing = get(['PROCESSING', 'CONFIRMED', 'CREATED', 'PACKED']);
  const shipped    = get(['SHIPPED', 'OUT_FOR_DELIVERY']);
  const delivered  = get(['DELIVERED']);
  const returns    = get(['RETURN_INITIATED', 'RETURN_APPROVED', 'RETURN_REJECTED',
                          'RETURN_INSPECTION', 'REFUNDED', 'REFUND_INITIATED']);

  return (
    <div className="collab-card">
      <div className="collab-header">
        <h3>Order Pipeline</h3>
        <span className="collab-total">{totalOrders}</span>
      </div>

      <div className="collab-item">
        <span className="dot yellow"></span>
        <span className="label">Processing</span>
        <span className="count">{processing}</span>
      </div>

      <div className="collab-item">
        <span className="dot green"></span>
        <span className="label">Delivered</span>
        <span className="count">{delivered}</span>
      </div>

      <div className="collab-item">
        <span className="dot blue"></span>
        <span className="label">Shipped</span>
        <span className="count">{shipped}</span>
      </div>

      <div className="collab-item">
        <span className="dot purple"></span>
        <span className="label">Returns / Refunds</span>
        <span className="count">{returns}</span>
      </div>
    </div>
  );
}

function RecentProductsTable({ products, inventory, pricing }) {
  const productsWithStock = products.slice(0, 4).map(p => {
    const stock = inventory.filter(i => i.productId === p.productId && i.inventoryStatus === 'AVAILABLE').length;
    // pricing array मधून productId match करून sellingPrice घेतो
    const priceEntry = pricing.find(pr => Number(pr.productId) === Number(p.productId));
    const price = priceEntry?.sellingPrice || priceEntry?.mrp || 0;
    return { ...p, stock, price };
  });

  return (
    <div className="table-card">
      <div className="table-header">
        <h3>Recent Products <span className="view-all">View All</span></h3>
      </div>

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>ID</th>
            <th>Stock</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {productsWithStock.length > 0 ? productsWithStock.map((p, i) => (
            <tr key={i}>
              <td>{p.name || 'N/A'}</td>
              <td>#{p.productId}</td>
              <td>{p.stock}</td>
              <td>₹{Number(p.price || 0).toLocaleString()}</td>
            </tr>
          )) : (
            <tr><td colSpan="4" className="text-center text-gray-400">No products</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RecentOrdersTable({ orders, customers }) {
  const recentOrders = orders.slice(0, 4);

  const getStatusClass = (status) => {
    if (status === 'DELIVERED') return 'paid';
    if (status === 'CANCELLED' || status === 'FAILED') return 'overdue';
    return 'pending';
  };

  return (
    <div className="table-card">
      <div className="table-header">
        <h3>Recent Orders <span className="view-all">View All</span></h3>
      </div>

      <table>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {recentOrders.length > 0 ? recentOrders.map((o, i) => {
            const customer = customers.find(c => c.id === o.customerId);
            return (
              <tr key={i}>
                <td>{o.orderNumber || `#${o.id}`}</td>
                <td>{customer ? `${customer.firstName} ${customer.lastName}` : `Customer ${o.customerId}`}</td>
                <td>₹{Number(o.totalAmount || 0).toLocaleString()}</td>
                <td><span className={`status ${getStatusClass(o.orderStatus)}`}>{o.orderStatus}</span></td>
              </tr>
            );
          }) : (
            <tr><td colSpan="4" className="text-center text-gray-400">No orders</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TopCustomersCard({ customers, orders }) {
  // Calculate total spent per customer
  const customerSpending = {};
  orders.forEach(o => {
    if (o.paymentStatus === 'SUCCESS') {
      customerSpending[o.customerId] = (customerSpending[o.customerId] || 0) + Number(o.totalAmount || 0);
    }
  });

  const topCustomers = Object.entries(customerSpending)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([custId, amount]) => {
      const customer = customers.find(c => c.id === Number(custId));
      const firstName = customer?.firstName || 'U';
      const lastName  = customer?.lastName  || '';
      return {
        id: custId,
        name: customer ? `${firstName} ${lastName}`.trim() : `Customer ${custId}`,
        initials: `${firstName[0]}${lastName[0] || ''}`.toUpperCase(),
        amount
      };
    });

  // Distinct avatar bg colours per index
  const avatarColors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

  return (
    <div className="top-card">
      <div className="top-header">
        <h3>Top Customers</h3>
        <Star className="star-icon" size={20} />
      </div>

      {topCustomers.length > 0 ? topCustomers.map((c, i) => (
        <div key={i} className="customer-row">
          {/* Initials avatar — no external image */}
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: avatarColors[i % avatarColors.length],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0
          }}>
            {c.initials}
          </div>
          <span className="name">{c.name}</span>
          <span className="amount">₹{c.amount.toLocaleString()}</span>
        </div>
      )) : (
        <p className="text-sm text-gray-500 text-center py-4">No customer data</p>
      )}
    </div>
  );
}

function LowStockCard({ products, inventory }) {
  const productStock = {};
  inventory.forEach(i => {
    if (i.inventoryStatus === 'AVAILABLE') {
      productStock[i.productId] = (productStock[i.productId] || 0) + 1;
    }
  });

  const lowStock = Object.entries(productStock)
    .filter(([_, count]) => count < 20)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 4)
    .map(([prodId, count]) => {
      const product = products.find(p => p.productId === Number(prodId));
      return {
        name: product?.name || `Product ${prodId}`,
        count
      };
    });

  return (
    <div className="card">
      <h3>Low Stock Alert ❗</h3>
      {lowStock.length > 0 ? lowStock.map((item, i) => (
        <div key={i} className={`alert ${item.count < 10 ? 'red' : 'yellow'}`}>
          {item.name} <span>{item.count} left</span>
        </div>
      )) : (
        <p className="text-sm text-gray-500 text-center py-4">All stock levels healthy</p>
      )}
    </div>
  );
}

export default function Dashboard({ onMenuSelect }) {
  const [data, setData] = useState({
    salesData: [],
    orders: [],
    inventory: [],
    products: [],
    customers: [],
    categories: [],
    pricing: [],
    totalRevenue: 0,
    totalProfit: 0,
    // From reports/summary — authoritative order counts per status
    ordersByStatus: {},
    totalOrders: 0,
    backendConnected: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Auto-refresh every 30 seconds for real-time counts
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [salesRes, ordersRes, invRes, prodRes, custRes, catRes, pricingRes, summaryRes] = await Promise.allSettled([
        imsService.inventory.getDailySales('SALE'),
        imsService.orders.getAllOrders(),
        imsService.inventory.getAllInventory(),
        imsService.products.getAllProducts(),
        adminService.customers.getAllCustomers(),
        imsService.products.getAllCategories(),
        imsService.pricing.getAllPricing(),
        imsService.reports.getSummaryReport()   // orders-service: authoritative revenue + status counts
      ]);

      const salesData = salesRes.status === 'fulfilled' ? salesRes.value : [];
      const orders    = ordersRes.status === 'fulfilled' ? ordersRes.value : [];
      const inventory = invRes.status === 'fulfilled' ? invRes.value : [];
      const products  = prodRes.status === 'fulfilled' ? prodRes.value : [];
      const customers = custRes.status === 'fulfilled' ? custRes.value : [];
      const categories = catRes.status === 'fulfilled' ? catRes.value : [];
      const pricing   = pricingRes.status === 'fulfilled' ? (pricingRes.value || []) : [];
      const summary   = summaryRes.status === 'fulfilled' ? summaryRes.value : null;

      // Revenue + Cost both from inventory-service daily sales (consistent source)
      // Using inventory sales ensures revenue and cost are from the same dataset → correct profit
      const totalRevenue = salesData.reduce((s, r) => s + Number(r.totalSales || 0), 0);
      const totalCost    = salesData.reduce((s, r) => s + Number(r.totalCost  || 0), 0);
      // Profit = Revenue - Cost (recalculated, not from stale backend profit column)
      const totalProfit  = totalRevenue - totalCost;

      // Order status breakdown: prefer summary map (server-computed), fallback to client count
      const ordersByStatus = summary?.ordersByStatus
        ?? orders.reduce((acc, o) => {
            const st = (o.orderStatus || 'UNKNOWN').toUpperCase();
            acc[st] = (acc[st] || 0) + 1;
            return acc;
          }, {});

      const totalOrders = summary?.totalOrders ?? orders.length;

      setData({
        salesData,
        orders,
        inventory,
        products,
        customers,
        categories,
        pricing,
        totalRevenue,
        totalCost,
        totalProfit,
        ordersByStatus,
        totalOrders,
        backendConnected: true
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setData(prev => ({ ...prev, backendConnected: false }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  // Prepare chart data
  const salesChartData = data.salesData.slice(-7).map(s => {
    const rev  = Number(s.totalSales || 0);
    const cost = Number(s.totalCost  || 0);
    return {
      date:    s.date,
      revenue: rev,
      cost:    cost,
      profit:  rev - cost,   // recalculate — don't use stale backend profit column
    };
  });

  // Order status breakdown for pie chart — use server-computed map
  const orderStatusData = Object.entries(data.ordersByStatus)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const availableStock = data.inventory.filter(i => i.inventoryStatus === 'AVAILABLE').length;

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-purple-400 flex items-center justify-center text-white text-lg shadow-md">
            <TrendingUp size={18} />
          </span>
          <span className="text-gray-800">Dashboard</span>
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-lg shadow-sm">
          <span>Overview</span>
          <span>/</span>
          <span className="font-medium" style={{color: '#b88e2f'}}>Real-time Analytics</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatsCard 
          title="Total Revenue" 
          value={`₹${data.totalRevenue.toLocaleString()}`}
          change={data.salesData.length > 1 ? "12%" : null}
          trend="up"
          icon={TrendingUp} 
          variant="sales" 
        />
        <StatsCard 
          title="Total Orders" 
          value={data.totalOrders.toString()}
          change={data.ordersByStatus['DELIVERED'] > 0 ? "8%" : null}
          trend="up"
          icon={Bookmark} 
          variant="orders" 
        />
        <StatsCard 
          title="Available Stock" 
          value={availableStock.toString()}
          change={null}
          icon={Diamond} 
          variant="visitors" 
        />
        <StatsCard 
          title="Total Customers" 
          value={data.backendConnected ? data.customers.length.toString() : '—'}
          change={data.backendConnected ? "Live" : "Offline"}
          trend={data.backendConnected ? "up" : "down"}
          icon={UserPlus} 
          variant="customers" 
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <SalesChart data={salesChartData} />
        </div>
        <div>
          <OrderStatusChart data={orderStatusData} />
        </div>
      </div>

      {/* Dashboard Sections */}
      <div className="dashboard">
        {/* Top Cards */}
        <div className="grid-3">
          <StockProgressCard inventory={data.inventory} categories={data.categories} />
          
          <div className="time-card">
            <div className="time-header">
              <h3>Profit Margin</h3>
              <span className="time-icon">💰</span>
            </div>
            <div className="time-circle">
              <svg className="progress-ring" width="180" height="180">
                <circle className="ring-bg" cx="90" cy="90" r="78" />
                <circle className="ring-progress" cx="90" cy="90" r="78" 
                  style={{
                    strokeDashoffset: (() => {
                      const totalSales = data.salesData.reduce((s, r) => s + Number(r.totalSales || 0), 0);
                      if (totalSales <= 0) return 490;
                      const pct = Math.max(0, Math.min(1, data.totalProfit / totalSales));
                      return 490 - (490 * pct);
                    })()
                  }} />
              </svg>
              <div className="time-center">
                <h1>
                  {(() => {
                    const totalSales = data.salesData.reduce((s, r) => s + Number(r.totalSales || 0), 0);
                    return totalSales > 0
                      ? ((data.totalProfit / totalSales) * 100).toFixed(1)
                      : 0;
                  })()}%
                </h1>
                <p>Profit Margin</p>
              </div>
            </div>
            <p className="time-footer">₹{data.totalProfit.toLocaleString()} profit</p>
          </div>

          <CollaborationCard ordersByStatus={data.ordersByStatus} totalOrders={data.totalOrders} />
        </div>

        {/* Tables */}
        <div className="grid-2">
          <RecentProductsTable products={data.products} inventory={data.inventory} pricing={data.pricing} />
          <RecentOrdersTable orders={data.orders} customers={data.customers} />
        </div>

        {/* Bottom Cards */}
        <div className="grid-3">
          <TopCustomersCard customers={data.customers} orders={data.orders} />
          <LowStockCard products={data.products} inventory={data.inventory} />
          
          <div className="quick-card">
            <h3>Quick Actions</h3>
            <button onClick={() => onMenuSelect && onMenuSelect('Products')}>
              <Plus size={18} fill="#22c55e" color="#22c55e" /> Add Product
            </button>
            <button onClick={() => onMenuSelect && onMenuSelect('Orders')}>
              <FileText size={18} fill="#60a5fa" color="#60a5fa" /> View Orders
            </button>
            <button onClick={() => onMenuSelect && onMenuSelect('Customers')}>
              <UserPlus size={18} fill="#facc15" color="#facc15" /> Add Customer
            </button>
            <button onClick={() => onMenuSelect && onMenuSelect('Analytics')}>
              <BarChart3 size={18} fill="#c084fc" color="#c084fc" /> View Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
