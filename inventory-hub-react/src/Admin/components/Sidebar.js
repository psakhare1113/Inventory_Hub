import { useState } from "react";
import { 
  Home, 
  Settings, 
  BarChart2, 
  FileText,
  Menu,
  X,
  Package,
  ShoppingCart,
  Users,
  FolderOpen,
  Truck,
  Receipt,
  Building2,
  ChevronLeft,
  Contact,
  Warehouse,
  TrendingUp,
  IndianRupee,
  Server
} from "lucide-react";
import logo from "../images/logo.png";
import "../css/Sidebar.css";

const menuItems = [
  { icon: Home, label: "Dashboard" },
  { icon: Contact, label: "Contacts" },
  { icon: Users, label: "Customers" },
  { icon: ShoppingCart, label: "Products" },
  { icon: IndianRupee, label: "Pricing" },
  { icon: Warehouse, label: "Inventory" },
  { icon: TrendingUp, label: "Analytics" },
  { icon: FolderOpen, label: "Categories" },
  { icon: FileText, label: "Orders" },
  { icon: Package, label: "Packages" },
  { icon: Receipt, label: "Invoice" },
  { icon: Building2, label: "Suppliers" },
  { icon: Truck, label: "Outgoing Products" },
  { icon: BarChart2, label: "Reports" },
  { icon: Server, label: "System Status" },
  { icon: Settings, label: "Settings" },
];

export function Sidebar({ className, onMenuSelect, selectedMenu }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const cn = (...classes) => classes.filter(Boolean).join(' ');

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-purple-600 text-white rounded-lg shadow-lg"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={cn(
        "relative h-screen bg-white border-r flex flex-col transition-all duration-300 z-40",
        isMobileOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full",
        "lg:translate-x-0 lg:sticky lg:top-0",
        isCollapsed ? "lg:w-20 sidebar-collapsed" : "lg:w-64 sidebar-expanded",
        className
      )}>
        {/* Header with Logo and Toggle */}
        <div className={cn(
          "h-16 flex items-center justify-between border-b border-gray-200 transition-all duration-300",
          isCollapsed ? "lg:px-3" : "px-6"
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-2 flex-1">
              <img src={logo} alt="Logo" className="w-8 h-8 flex-shrink-0" />
              <span className="text-xl font-bold sidebar-inventory-text">
                Admin
              </span>
            </div>
          )}
          
          {isCollapsed && (
            <div className="flex items-center justify-center w-full">
              <img src={logo} alt="Logo" className="w-8 h-8" />
            </div>
          )}
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 ml-auto flex-shrink-0"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft size={22} className={cn(
              "transition-transform duration-300 text-gray-600",
              isCollapsed && "rotate-180"
            )} />
          </button>
        </div>

        {/* User Profile Summary */}
        {!isCollapsed && (
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60" 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-100"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Admin User</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={cn(
          "flex-1 overflow-y-auto pb-4 transition-all duration-300",
          isCollapsed ? "px-2 space-y-2" : "px-4 space-y-1"
        )}>
          {menuItems.map((item) => {
            const isActive = selectedMenu === item.label;
            return (
              <div 
                key={item.label} 
                onClick={() => {
                  setIsMobileOpen(false);
                  onMenuSelect && onMenuSelect(item.label);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg transition-all duration-200 group relative cursor-pointer",
                  isCollapsed ? "lg:justify-center lg:p-2.5" : "px-4 py-3",
                  isActive 
                    ? "font-semibold sidebar-active-item" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <div className={cn(
                  "rounded-md transition-colors flex-shrink-0",
                  isCollapsed ? "p-2" : "p-2",
                  isActive ? "sidebar-active-icon" : "text-gray-500 group-hover:text-gray-700"
                )}>
                  <item.icon size={20} />
                </div>
                
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                    <ChevronLeft size={18} className={cn(
                      "flex-shrink-0 ml-2 transition-all duration-200 rotate-180",
                      isActive ? "sidebar-active-arrow" : "text-gray-400"
                    )} />
                  </div>
                )}
                
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}