import { useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { Navbar } from "../components/Navbar";
import Dashboard from "../components/Dashboard";
import CustomersCards from "../components/CustomersCards";
import CustomersModernPro from "../components/CustomersModernPro";
import Contacts from "../components/Contacts";
import Products from "../components/Products";
import Pricing from "../components/Pricing";
import Categories from "../components/Categories";
import Orders from "../components/Orders";
import Inventory from "../components/Inventory";
import Analytics from "../components/Analytics";
import Package from "../components/Package";
import Invoice from "../components/Invoice";
import SystemStatus from "../components/SystemStatus";
import ConnectionStatus from "../../components/ConnectionStatus";

export default function Home() {
  const [selectedMenu, setSelectedMenu] = useState('Dashboard');

  const renderContent = () => {
    switch(selectedMenu) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Customers':
        return <CustomersModernPro />;
      case 'Contacts':
        return <Contacts />;
      case 'Products':
        return <Products />;
      case 'Pricing':
        return <Pricing />;
      case 'Inventory':
        return <Inventory />;
      case 'Analytics':
        return <Analytics />;
      case 'Categories':
        return <Categories />;
      case 'Orders':
        return <Orders />;
       case 'Packages':
        return <Package />;
      case 'Invoice':
        return <Invoice />;
      case 'Suppliers':
        return <div className="p-6"><h1 className="text-2xl font-bold">Suppliers</h1><p>Suppliers component coming soon...</p></div>;
      case 'Outgoing Products':
        return <div className="p-6"><h1 className="text-2xl font-bold">Outgoing Products</h1><p>Outgoing Products component coming soon...</p></div>;
      case 'Reports':
        return <div className="p-6"><h1 className="text-2xl font-bold">Reports</h1><p>Reports component coming soon...</p></div>;
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
      <ConnectionStatus />
      <Sidebar onMenuSelect={setSelectedMenu} selectedMenu={selectedMenu} />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Navbar />
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