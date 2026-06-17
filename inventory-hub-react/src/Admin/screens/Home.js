import { useState, useEffect } from "react";
import { Sidebar } from "../components/Sidebar";
import Dashboard from "../components/Dashboard";
import CustomersModernPro from "../components/CustomersModernPro";
import Contacts from "../components/Contacts";
import SupplierContacts from "../components/SupplierContacts";
import Products from "../components/Products";
import Pricing from "../components/Pricing";
import Categories from "../components/Categories";
import Orders from "../components/Orders";
import Inventory from "../components/Inventory";
import Analytics from "../components/Analytics";
import UserAnalyticsDashboard from "../UserAnalyticsDashboard";
import RealTimeAnalyticsDashboard from "../components/RealTimeAnalyticsDashboard";
import Package from "../components/Package";
import PackageTracking from "../components/PackageTracking";
import Reports from "../components/Reports";
import ReportsModern from "../components/ReportsModern";
import Invoice from "../components/Invoice";
import Shipping from "../components/Shipping";
import SystemStatus from "../components/SystemStatus";
import Payments from "../components/Payments";
import AdminAuthorityModal from "../components/AdminAuthorityModal";
import DeliveryBoyManagement from "../components/DeliveryBoyManagement";
import PermissionManagement from "../components/PermissionManagement";
import BatchManagement from "../components/BatchManagement";
import AuditLogs from "../components/AuditLogs";
import WarehouseManagement from "../components/WarehouseManagement";
import AdminWarehouseStaff from "../components/AdminWarehouseStaff";
import AuditStaffManagement from "../components/AuditStaffManagement";
import ConnectionStatus from "../../components/ConnectionStatus";

export default function Home() {
  const [selectedMenu, setSelectedMenu] = useState('Dashboard');

  // Listen for navigation events from AdminNotifications bell
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.section) {
        setSelectedMenu(e.detail.section);
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('admin_navigate', handler);
    return () => window.removeEventListener('admin_navigate', handler);
  }, []);

  const renderContent = () => {
    switch(selectedMenu) {
      case 'Dashboard':
        return <Dashboard onMenuSelect={setSelectedMenu} />;
      case 'Customers':
        return <CustomersModernPro />;
      case 'Contacts':
        return <Contacts />;
      case 'Suppliers':
        return <SupplierContacts />;
      case 'Products':
        return <Products />;
      case 'Pricing':
        return <Pricing />;
      case 'Inventory':
        return <Inventory />;
      case 'Analytics':
        return <Analytics />;
      case 'User Analytics':
        return <UserAnalyticsDashboard />;
      case 'Real-Time Analytics':
        return <RealTimeAnalyticsDashboard />;
      case 'Categories':
        return <Categories />;
      case 'Audit Logs':
        return <AuditLogs />;
      case 'Orders':
        return <Orders />;
      case 'Payments':
        return <Payments />;
      case 'Packages':
        return <Package />;
      case 'Invoice':
        return <Invoice />;
      case 'Shipping':
        return <Shipping />;
      case 'Delivery Boys':
        return <DeliveryBoyManagement />;
      case 'Reports':
        return <ReportsModern />;
      case 'Permissions':
        return <PermissionManagement />;
      case 'Batch Management':
        return <BatchManagement />;
      case 'Warehouse Management':
        return <WarehouseManagement />;
      case 'Warehouse Staff':
        return <AdminWarehouseStaff />;
      case 'Audit Management':
        return <AuditStaffManagement />;
      case 'Settings':
        return <div className="p-6"><h1 className="text-2xl font-bold">Settings</h1><p>Settings component coming soon...</p></div>;
      case 'System Status':
        return <SystemStatus />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="admin min-h-screen bg-gray-50 flex">
      <AdminAuthorityModal />
      <ConnectionStatus />
      <Sidebar onMenuSelect={setSelectedMenu} selectedMenu={selectedMenu} />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <main className="flex-1 overflow-x-hidden">
          {renderContent()}
          {/* Footer */}
          <footer className="mt-12 text-center text-sm text-gray-400 pb-4">
            <p>Copyright © 2024 <span style={{color: '#b88e2f'}} className="font-medium">Inventory Admin</span>. All rights reserved.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}