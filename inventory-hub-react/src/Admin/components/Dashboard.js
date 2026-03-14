import { TrendingUp, Bookmark, Diamond, Clock, Star, Plus, FileText, UserPlus, BarChart3 } from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { useState, useEffect } from 'react';
import '../css/NewDashboard.css';
import { imsService } from '../../services/imsApi';
import { adminService } from '../../services/adminApi';

const visitData = [
  { name: 'JAN', CHN: 20, USA: 40, UK: 30 },
  { name: 'FEB', CHN: 40, USA: 30, UK: 40 },
  { name: 'MAR', CHN: 30, USA: 50, UK: 20 },
  { name: 'APR', CHN: 50, USA: 40, UK: 45 },
  { name: 'MAY', CHN: 35, USA: 60, UK: 35 },
  { name: 'JUN', CHN: 55, USA: 45, UK: 50 },
  { name: 'JUL', CHN: 40, USA: 55, UK: 40 },
  { name: 'AUG', CHN: 60, USA: 50, UK: 55 },
];

const trafficData = [
  { name: 'Search Engines', value: 30 },
  { name: 'Direct Click', value: 30 },
  { name: 'Bookmarks Click', value: 40 },
];

const COLORS = ['#fe7096', '#9a55ff', '#36a2eb'];

const mockTickets = [
  { id: 1, assigneeName: "John Doe", assigneeAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100", subject: "Fix login bug", status: "PROGRESS", lastUpdate: "2 hours ago", trackingId: "TK-001" },
  { id: 2, assigneeName: "Sarah Wilson", assigneeAvatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100", subject: "Update dashboard", status: "DONE", lastUpdate: "1 day ago", trackingId: "TK-002" },
  { id: 3, assigneeName: "Mike Johnson", assigneeAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", subject: "Database optimization", status: "ON HOLD", lastUpdate: "3 hours ago", trackingId: "TK-003" },
  { id: 4, assigneeName: "Emily Davis", assigneeAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100", subject: "API integration", status: "REJECTED", lastUpdate: "5 hours ago", trackingId: "TK-004" }
];

const mockUpdates = [
  { id: 1, userName: "John Doe", content: "Dashboard redesign project has been completed successfully", timestamp: "2 hours ago" },
  { id: 2, userName: "Sarah Wilson", content: "Sarah Wilson joined the development team", timestamp: "4 hours ago" },
  { id: 3, userName: "Mike Johnson", content: "Scheduled maintenance will occur tonight at 2 AM", timestamp: "6 hours ago" },
  { id: 4, userName: "Emily Davis", content: "Critical bug found in payment system", timestamp: "8 hours ago" }
];

const statusStyles = {
  DONE: "bg-gradient-to-r from-green-400 to-green-500 text-white border-0",
  PROGRESS: "bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0",
  "ON HOLD": "bg-gradient-to-r from-blue-400 to-blue-500 text-white border-0",
  REJECTED: "bg-gradient-to-r from-red-400 to-pink-500 text-white border-0",
};

function StatsCard({ title, value, change, icon: Icon, variant, trend }) {
  const getVariantStyles = () => {
    switch(variant) {
      case 'sales':
        return {
          background: 'linear-gradient(135deg, #ffbf96 0%, #fe7096 100%)'
        };
      case 'orders':
        return {
          background: 'linear-gradient(135deg, #90caf9 0%, #047edf 99%)'
        };
      case 'visitors':
        return {
          background: 'linear-gradient(135deg, #84d9d2 0%, #07cdae 100%)'
        };
      default:
        return {
          background: 'linear-gradient(135deg, #da8cff 0%, #9a55ff 100%)'
        };
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
          <p className="text-sm font-medium opacity-90">
            {trend === "up" ? "Increased" : "Decreased"} by {change}
          </p>
        </div>
        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function VisitsChart() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-bold text-gray-800">Visit & Sales Statistics</h4>
        <div className="flex gap-4 text-sm font-medium">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500"></span> CHN
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-400"></span> USA
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-pink-400"></span> UK
          </span>
        </div>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visitData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Line type="monotone" dataKey="CHN" stroke="#9a55ff" strokeWidth={3} dot={{ r: 4, fill: '#9a55ff' }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="USA" stroke="#36a2eb" strokeWidth={3} dot={{ r: 4, fill: '#36a2eb' }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="UK" stroke="#fe7096" strokeWidth={3} dot={{ r: 4, fill: '#fe7096' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TrafficChart() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
      <h4 className="text-lg font-bold text-gray-800 mb-6">Traffic Sources</h4>
      <div className="h-[250px] w-full flex items-center justify-center relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={trafficData}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {trafficData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-gray-800">40%</span>
          <span className="text-xs text-gray-500">Bookmarks</span>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[#fe7096]"></div>
          Search
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[#9a55ff]"></div>
          Direct
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[#36a2eb]"></div>
          Bookmarks
        </div>
      </div>
    </div>
  );
}
function TicketTable() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-50">
        <h4 className="text-lg font-bold text-gray-800">Recent Tickets</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Assignee</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Last Update</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tracking ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {mockTickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <img src={ticket.assigneeAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <span className="text-sm font-medium text-gray-900">{ticket.assigneeName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {ticket.subject}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-[10px] px-2 py-0.5 font-bold shadow-sm rounded-full ${statusStyles[ticket.status]}`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {ticket.lastUpdate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {ticket.trackingId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentUpdates() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-6">Recent Updates <span className="text-sm font-semibold text-purple-600 hover:text-purple-700 cursor-pointer float-right">View All</span></h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-900">Stock Progress Updated</span>
          <span className="text-xs text-gray-500">2 hours ago</span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-900">New Invoice Generated</span>
          <span className="text-xs text-gray-500">4 hours ago</span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-900">Customer Added</span>
          <span className="text-xs text-gray-500">6 hours ago</span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-900">Low Stock Alert</span>
          <span className="text-xs text-gray-500">8 hours ago</span>
        </div>
      </div>
    </div>
  );
}

function NewDashboardSection() {
  return (
    <div className="dashboard">

      {/* ===== TOP CARDS ===== */}
      <div className="grid-3">

        {/* Stock Progress */}
        <div className="stock-card">
          <div className="stock-header">
            <h3>Stock Progress</h3>
            <TrendingUp className="stock-icon" size={20} />
          </div>

          <div className="stock-item">
            <div className="stock-label">
              <span>Electronics</span>
              <span>87%</span>
            </div>
            <div className="progress-bg">
              <div className="progress-fill yellow" style={{ width: "87%" }}></div>
            </div>
          </div>

          <div className="stock-item">
            <div className="stock-label">
              <span>Furniture</span>
              <span>64%</span>
            </div>
            <div className="progress-bg">
              <div className="progress-fill blue" style={{ width: "64%" }}></div>
            </div>
          </div>

          <div className="stock-item">
            <div className="stock-label">
              <span>Clothing</span>
              <span>92%</span>
            </div>
            <div className="progress-bg">
              <div className="progress-fill green" style={{ width: "92%" }}></div>
            </div>
          </div>

          <div className="stock-item">
            <div className="stock-label">
              <span>Food & Beverage</span>
              <span>73%</span>
            </div>
            <div className="progress-bg">
              <div className="progress-fill purple" style={{ width: "73%" }}></div>
            </div>
          </div>
        </div>

        {/* Time Tracker */}
        <div className="time-card">
          <div className="time-header">
            <h3>Time Tracker</h3>
            <span className="time-icon">⏱</span>
          </div>

          <div className="time-circle">
            <svg className="progress-ring" width="180" height="180">
              <circle
                className="ring-bg"
                cx="90"
                cy="90"
                r="78"
              />
              <circle
                className="ring-progress"
                cx="90"
                cy="90"
                r="78"
              />
            </svg>

            <div className="time-center">
              <h1>72:35</h1>
              <p>Hours This Week</p>
            </div>
          </div>

          <p className="time-footer">75% of weekly goal</p>
        </div>

        {/* Collaboration */}
        <div className="collab-card">
          <div className="collab-header">
            <h3>Collaboration</h3>
            <span className="collab-total">371</span>
          </div>

          <div className="collab-item">
            <span className="dot yellow"></span>
            <span className="label">Order Processing</span>
            <span className="count">24</span>
          </div>

          <div className="collab-item">
            <span className="dot green"></span>
            <span className="label">Shipping Updates</span>
            <span className="count">18</span>
          </div>

          <div className="collab-item">
            <span className="dot blue"></span>
            <span className="label">Stock Alerts</span>
            <span className="count">12</span>
          </div>

          <div className="collab-item">
            <span className="dot purple"></span>
            <span className="label">Payment Pending</span>
            <span className="count">8</span>
          </div>
        </div>

      </div>

      {/* ===== MIDDLE TABLES ===== */}
      <div className="grid-2">

        {/* Recent Products */}
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
              <tr>
                <td>MacBook Pro</td>
                <td>#PRD001</td>
                <td>124</td>
                <td>₹2,499</td>
              </tr>
              <tr>
                <td>iPhone 14 Pro</td>
                <td>#PRD002</td>
                <td>89</td>
                <td>₹1,299</td>
              </tr>
              <tr>
                <td>iPad Air</td>
                <td>#PRD003</td>
                <td>56</td>
                <td>₹899</td>
              </tr>
              <tr>
                <td>AirPods Pro</td>
                <td>#PRD004</td>
                <td>203</td>
                <td>₹249</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Recent Invoices */}
        <div className="table-card">
          <div className="table-header">
            <h3>Recent Invoices <span className="view-all">View All</span></h3>
          </div>

          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>#INV1024</td>
                <td>John Smith</td>
                <td>₹2,450</td>
                <td><span className="status paid">Paid</span></td>
              </tr>
              <tr>
                <td>#INV1023</td>
                <td>Sarah Johnson</td>
                <td>₹1,890</td>
                <td><span className="status pending">Pending</span></td>
              </tr>
              <tr>
                <td>#INV1022</td>
                <td>Mike Davis</td>
                <td>₹3,200</td>
                <td><span className="status paid">Paid</span></td>
              </tr>
              <tr>
                <td>#INV1021</td>
                <td>Emily Brown</td>
                <td>₹980</td>
                <td><span className="status overdue">Overdue</span></td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      {/* ===== BOTTOM CARDS ===== */}
      <div className="grid-3">

        {/* Top Customers */}
        <div className="top-card">
          <div className="top-header">
            <h3>Top Customers</h3>
            <Star className="star-icon" size={20} />
          </div>

          <div className="customer-row">
            <img src="https://i.pravatar.cc/100?img=1" alt="user" />
            <span className="name">Lisa Anderson</span>
            <span className="amount">₹12,450</span>
          </div>

          <div className="customer-row">
            <img src="https://i.pravatar.cc/100?img=2" alt="user" />
            <span className="name">Robert Wilson</span>
            <span className="amount">₹10,890</span>
          </div>

          <div className="customer-row">
            <img src="https://i.pravatar.cc/100?img=3" alt="user" />
            <span className="name">Jennifer Lee</span>
            <span className="amount">₹9,340</span>
          </div>

          <div className="customer-row">
            <img src="https://i.pravatar.cc/100?img=4" alt="user" />
            <span className="name">David Martinez</span>
            <span className="amount">₹8,760</span>
          </div>
        </div>

        {/* Low Stock */}
        <div className="card">
          <h3>Low Stock Alert ❗</h3>
          <div className="alert red">Wireless Mouse <span>8 left</span></div>
          <div className="alert yellow">USB-C Cable <span>15 left</span></div>
          <div className="alert red">Keyboard <span>5 left</span></div>
          <div className="alert yellow">Monitor Stand <span>12 left</span></div>
        </div>

        {/* Quick Actions */}
        <div className="quick-card">
          <h3>Quick Actions</h3>

          <button>
            <Plus size={18} fill="#22c55e" color="#22c55e" /> Add Product
          </button>

          <button>
            <FileText size={18} fill="#60a5fa" color="#60a5fa" /> Create Invoice
          </button>

          <button>
            <UserPlus size={18} fill="#facc15" color="#facc15" /> Add Customer
          </button>

          <button>
            <BarChart3 size={18} fill="#c084fc" color="#c084fc" /> View Reports
          </button>
        </div>

      </div>

    </div>
  );
}

function UpdatesFeed() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-bold text-gray-800">Recent Updates</h4>
        <button className="text-sm font-semibold text-purple-600 hover:text-purple-700">View All</button>
      </div>

      <div className="space-y-6">
        {mockUpdates.map((update) => (
          <div key={update.id} className="relative pl-6 pb-6 border-l border-gray-100 last:pb-0">
            <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-purple-50"></div>
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-900">{update.userName}</span>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={12} />
                {update.timestamp}
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">{update.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    sales: '$15,000',
    orders: '45,634',
    visitors: '95,574',
    recentProducts: [],
    lowStockItems: [],
    customersCount: 0,
    backendConnected: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Check backend connection by fetching customers
      const token = localStorage.getItem('token');
      let customersCount = 0;
      let backendConnected = false;
      
      if (token) {
        try {
          const customersResponse = await fetch('http://localhost:2000/api/auth/admin/customers', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (customersResponse.ok) {
            const customers = await customersResponse.json();
            customersCount = customers.length;
            backendConnected = true;
          }
        } catch (err) {
          console.error('Backend connection failed:', err);
        }
      }
      
      // Load data from both IMS and Admin services
      const [productsData, inventoryData, ordersData, statsData] = await Promise.allSettled([
        imsService.products.getAllProducts(),
        imsService.inventory.getAllInventory(),
        adminService.orders.getAllOrders(),
        adminService.analytics.getDashboardStats()
      ]);
      
      const products = productsData.status === 'fulfilled' ? productsData.value : [];
      const inventory = inventoryData.status === 'fulfilled' ? inventoryData.value : [];
      const orders = ordersData.status === 'fulfilled' ? ordersData.value : [];
      const stats = statsData.status === 'fulfilled' ? statsData.value : {};
      
      const totalSales = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const totalOrders = orders.length;
      const availableStock = inventory.filter(item => item.inventoryStatus === 'AVAILABLE').length;
      
      setDashboardData({
        sales: `₹${totalSales.toLocaleString()}`,
        orders: totalOrders.toString(),
        visitors: availableStock.toString(),
        recentProducts: products.slice(0, 5),
        lowStockItems: inventory.filter(item => item.inventoryStatus === 'AVAILABLE').slice(0, 4),
        customersCount,
        backendConnected
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setDashboardData({
        sales: '₹0',
        orders: '0',
        visitors: '0',
        recentProducts: [],
        lowStockItems: [],
        customersCount: 0,
        backendConnected: false
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }
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
          <span className="font-medium" style={{color: '#b88e2f'}}>Analytics</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatsCard 
          title="Weekly Sales" 
          value={dashboardData.sales} 
          change="60%" 
          trend="up"
          icon={TrendingUp} 
          variant="sales" 
        />
        <StatsCard 
          title="Weekly Orders" 
          value={dashboardData.orders} 
          change="10%" 
          trend="down"
          icon={Bookmark} 
          variant="orders" 
        />
        <StatsCard 
          title="Visitors Online" 
          value={dashboardData.visitors} 
          change="5%" 
          trend="up"
          icon={Diamond} 
          variant="visitors" 
        />
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Customer Management</h3>
          <div className="flex items-center gap-2">
            {dashboardData.backendConnected ? (
              <>
                <span className="text-2xl font-bold text-green-600">✓ {dashboardData.customersCount}</span>
                <span className="text-xs text-green-600">Backend Connected</span>
              </>
            ) : (
              <>
                <span className="text-xl font-bold text-orange-600">⚠️</span>
                <span className="text-xs text-orange-600">Using Static Data - Backend Unavailable</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charts Combined */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <VisitsChart />
        </div>
        <div>
          <TrafficChart />
        </div>
      </div>

      {/* New Dashboard Section */}
      <NewDashboardSection />
    </div>
  );
}