import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  Layout, 
  Settings, 
  Table, 
  BarChart2, 
  User, 
  FileText, 
  AlertCircle,
  Menu,
  X,
  Package,
  ShoppingCart,
  Zap,
  Lock,
  Bell,
  MessageSquare,
  Eye,
  ChevronLeft
} from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

const menuItems = [
  { icon: Home, label: "Dashboard", href: "/" },
  { icon: Package, label: "Inventory", href: "/inventory" },
  { icon: ShoppingCart, label: "Products", href: "/products" },
  { icon: Table, label: "Orders", href: "/orders" },
  { icon: BarChart2, label: "Analytics", href: "/analytics" },
  { icon: Zap, label: "Reports", href: "/reports" },
  { icon: User, label: "Users", href: "/users" },
  { icon: Lock, label: "Settings", href: "/settings" },
  { icon: Bell, label: "Notifications", href: "/notifications" },
  { icon: MessageSquare, label: "Messages", href: "/messages" },
  { icon: Eye, label: "Visibility", href: "/visibility" },
  { icon: Layout, label: "Layouts", href: "/layouts" },
];

export function Sidebar({ className }) {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gradient-purple text-white rounded-lg shadow-lg"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        data-testid="button-sidebar-toggle"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={cn(
        "relative h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-40",
        isMobileOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full",
        "lg:translate-x-0 lg:sticky lg:top-0",
        isCollapsed ? "lg:w-20" : "lg:w-64",
        className
      )}>
        {/* Header with Logo and Toggle */}
        <div className={cn(
          "h-16 flex items-center justify-between border-b border-gray-200 transition-all duration-300",
          isCollapsed ? "lg:px-3" : "px-6"
        )}>
          {!isCollapsed && (
            <Link to="/" className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-purple flex items-center justify-center text-white font-bold text-sm flex-shrink-0">P</div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                Purple
              </span>
            </Link>
          )}
          
          {isCollapsed && !isMobileOpen && (
            <Link to="/" className="flex items-center justify-center w-full">
              <div className="w-8 h-8 rounded-lg bg-gradient-purple flex items-center justify-center text-white font-bold text-sm">P</div>
            </Link>
          )}
          
          {/* Toggle Button - visible both expanded and collapsed */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-2 hover:bg-purple-100 rounded-lg transition-all duration-200 text-purple-500 hover:text-purple-600 ml-auto flex-shrink-0 hover:scale-110"
            data-testid="button-sidebar-collapse"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft size={22} className={cn(
              "transition-transform duration-300",
              isCollapsed && "rotate-180"
            )} />
          </button>
        </div>

        {/* User Profile Summary - Hidden when collapsed */}
        {!isCollapsed && (
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                {/* User Avatar */}
                <img 
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60" 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-100"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">David Grey</p>
                <p className="text-xs text-gray-500">Project Manager</p>
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
            const isActive = location.pathname === item.href;
            return (
              <Link 
                key={item.href} 
                to={item.href} 
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg transition-all duration-200 group relative",
                  isCollapsed ? "lg:justify-center lg:p-2.5" : "px-4 py-3",
                  isActive 
                    ? "bg-purple-50 text-purple-600 font-semibold" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
                data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className={cn(
                  "rounded-md transition-colors flex-shrink-0",
                  isCollapsed ? "p-2" : "p-2",
                  isActive ? "text-purple-600" : "text-gray-500 group-hover:text-gray-700"
                )}>
                  <item.icon size={20} />
                </div>
                
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                    <ChevronLeft size={18} className={cn(
                      "flex-shrink-0 ml-2 transition-all duration-200",
                      isActive ? "text-purple-400" : "text-gray-400 group-hover:text-purple-500"
                    )} />
                  </div>
                )}
                
                {/* Tooltip on hover when collapsed */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Pro Banner - Hidden when collapsed */}
        {!isCollapsed && (
          <div className="p-4">
            <div className="bg-gradient-purple p-4 rounded-2xl text-white text-center relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-bold mb-1">Get Pro</h4>
                <p className="text-xs text-white/80 mb-3">Upgrade to pro for more features</p>
                <button className="px-4 py-2 bg-white text-purple-600 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors">
                  Upgrade Now
                </button>
              </div>
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
            </div>
          </div>
        )}
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