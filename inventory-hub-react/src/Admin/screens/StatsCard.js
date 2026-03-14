import { cn } from "../lib/utils";

export function StatsCard({ title, value, change, icon: Icon, variant, trend }) {
  const variants = {
    sales: "bg-gradient-orange",
    orders: "bg-gradient-blue",
    visitors: "bg-gradient-green",
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6 text-white shadow-lg transition-transform hover:-translate-y-1 duration-300",
      variants[variant]
    )}>
      {/* Background Pattern */}
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
