import { useTickets } from "../hooks/use-tickets";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { cn } from "../lib/utils";

const statusStyles = {
  DONE: "bg-gradient-to-r from-green-400 to-green-500 text-white border-0",
  PROGRESS: "bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0",
  "ON HOLD": "bg-gradient-to-r from-blue-400 to-blue-500 text-white border-0",
  REJECTED: "bg-gradient-to-r from-red-400 to-pink-500 text-white border-0",
};

export function TicketTable() {
  const { data: tickets, isLoading } = useTickets();

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
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading tickets...</td></tr>
            ) : (
              tickets?.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img src={ticket.assigneeAvatar || ""} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <span className="text-sm font-medium text-gray-900">{ticket.assigneeName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {ticket.subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={cn("text-[10px] px-2 py-0.5 font-bold shadow-sm", statusStyles[ticket.status])}>
                      {ticket.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ticket.lastUpdate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ticket.trackingId}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
