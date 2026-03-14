import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/react-app/components/ui/table";
import { Badge } from "@/react-app/components/ui/badge";
import { Button } from "@/react-app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/react-app/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Shield,
  User as UserIcon,
  Power,
  PowerOff,
} from "lucide-react";
import type { User } from "@/react-app/pages/AdminUsers";

interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  onRoleChange: (userId: number, newRole: string) => void;
  onStatusToggle: (userId: number, currentStatus: number) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

export function UsersTable({
  users,
  isLoading,
  onRoleChange,
  onStatusToggle,
  onEdit,
  onDelete,
}: UsersTableProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 shadow-sm">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 shadow-sm text-center">
        <p className="text-slate-500">No users found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="font-semibold text-slate-700">User</TableHead>
            <TableHead className="font-semibold text-slate-700">Contact</TableHead>
            <TableHead className="font-semibold text-slate-700">Role</TableHead>
            <TableHead className="font-semibold text-slate-700">Status</TableHead>
            <TableHead className="font-semibold text-slate-700">Last Login</TableHead>
            <TableHead className="font-semibold text-slate-700">Joined</TableHead>
            <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="hover:bg-slate-50/50">
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-medium text-sm">
                    {getInitials(user.name)}
                  </div>
                  <span className="font-medium text-slate-900">{user.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-slate-900">{user.email}</p>
                  <p className="text-sm text-slate-500">{user.phone}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={user.role === "admin" ? "default" : "secondary"}
                  className={
                    user.role === "admin"
                      ? "bg-violet-100 text-violet-700 hover:bg-violet-100"
                      : "bg-slate-100 text-slate-700"
                  }
                >
                  {user.role === "admin" ? (
                    <Shield className="w-3 h-3 mr-1" />
                  ) : (
                    <UserIcon className="w-3 h-3 mr-1" />
                  )}
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={user.is_active === 1 ? "default" : "secondary"}
                  className={
                    user.is_active === 1
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                      : "bg-red-100 text-red-700 hover:bg-red-100"
                  }
                >
                  {user.is_active === 1 ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-slate-600">
                {formatDate(user.last_login_at)}
              </TableCell>
              <TableCell className="text-slate-600">
                {formatDate(user.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {user.role === "customer" ? (
                      <DropdownMenuItem
                        onClick={() => onRoleChange(user.id, "admin")}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Make Admin
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => onRoleChange(user.id, "customer")}
                      >
                        <UserIcon className="w-4 h-4 mr-2" />
                        Make Customer
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onStatusToggle(user.id, user.is_active)}
                    >
                      {user.is_active === 1 ? (
                        <>
                          <PowerOff className="w-4 h-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Power className="w-4 h-4 mr-2" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(user)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
