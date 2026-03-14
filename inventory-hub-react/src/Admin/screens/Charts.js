import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';

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

export function VisitsChart() {
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
      
      <div className="h-[300px] w-full" style={{ minWidth: 400, minHeight: 300, width: '100%', height: '300px' }}>
        <ResponsiveContainer width="100%" height={300} minWidth={400} minHeight={300}>
          <LineChart data={visitData} width={300} height={300}>
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

export function TrafficChart() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
      <h4 className="text-lg font-bold text-gray-800 mb-6">Traffic Sources</h4>
      <div className="h-[250px] w-full flex items-center justify-center relative" style={{ minWidth: 300, minHeight: 250, width: '100%', height: '250px' }}>
        <ResponsiveContainer width="100%" height={250} minWidth={300} minHeight={250}>
          <PieChart width={250} height={250}>
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
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-gray-800">40%</span>
          <span className="text-xs text-gray-500">Bookmarks</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
        <div>
          <div className="w-3 h-3 rounded bg-[#fe7096] mx-auto mb-1"></div>
          Search
        </div>
        <div>
          <div className="w-3 h-3 rounded bg-[#9a55ff] mx-auto mb-1"></div>
          Direct
        </div>
        <div>
          <div className="w-3 h-3 rounded bg-[#36a2eb] mx-auto mb-1"></div>
          Bookmarks
        </div>
      </div>
    </div>
  );
}
