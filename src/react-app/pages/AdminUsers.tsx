import { useState, useEffect } from "react";
import { UserSearch } from "@/react-app/components/UserSearch";
import { UsersTable } from "@/react-app/components/UsersTable";
import { EditUserDialog } from "@/react-app/components/EditUserDialog";
import { DeleteUserDialog } from "@/react-app/components/DeleteUserDialog";
import { AdminSidebar } from "@/react-app/components/AdminSidebar";
import { Users, UserPlus } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  is_active: number;
  avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let result = [...users];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }
    
    if (roleFilter !== "all") {
      result = result.filter((user) => user.role === roleFilter);
    }
    
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active" ? 1 : 0;
      result = result.filter((user) => user.is_active === isActive);
    }
    
    setFilteredUsers(result);
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  const handleStatusToggle = async (userId: number, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    try {
      await fetch(`/api/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newStatus }),
      });
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, is_active: newStatus } : user
        )
      );
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleEditUser = async (userData: Partial<User>) => {
    if (!editingUser) return;
    try {
      await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      setUsers((prev) =>
        prev.map((user) =>
          user.id === editingUser.id ? { ...user, ...userData } : user
        )
      );
      setEditingUser(null);
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await fetch(`/api/users/${deletingUser.id}`, {
        method: "DELETE",
      });
      setUsers((prev) => prev.filter((user) => user.id !== deletingUser.id));
      setDeletingUser(null);
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    customers: users.filter((u) => u.role === "customer").length,
    active: users.filter((u) => u.is_active === 1).length,
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Customer Management
              </h1>
              <p className="text-slate-500 mt-1">
                Manage users, roles, and permissions
              </p>
            </div>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add Customer
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <StatsCard
              label="Total Users"
              value={stats.total}
              icon={<Users className="w-5 h-5 text-primary" />}
            />
            <StatsCard
              label="Administrators"
              value={stats.admins}
              color="text-violet-600"
              bg="bg-violet-50"
            />
            <StatsCard
              label="Customers"
              value={stats.customers}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <StatsCard
              label="Active Users"
              value={stats.active}
              color="text-amber-600"
              bg="bg-amber-50"
            />
          </div>

          {/* Search and Filters */}
          <UserSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />

          {/* Users Table */}
          <UsersTable
            users={filteredUsers}
            isLoading={isLoading}
            onRoleChange={handleRoleChange}
            onStatusToggle={handleStatusToggle}
            onEdit={setEditingUser}
            onDelete={setDeletingUser}
          />
        </div>
      </main>

      {/* Dialogs */}
      <EditUserDialog
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleEditUser}
      />
      
      <DeleteUserDialog
        user={deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteUser}
      />
    </div>
  );
}

function StatsCard({
  label,
  value,
  icon,
  color = "text-primary",
  bg = "bg-primary/10",
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        {icon ? (
          <div className={`${bg} p-3 rounded-lg`}>{icon}</div>
        ) : (
          <div className={`${bg} w-10 h-10 rounded-lg`} />
        )}
      </div>
    </div>
  );
}
