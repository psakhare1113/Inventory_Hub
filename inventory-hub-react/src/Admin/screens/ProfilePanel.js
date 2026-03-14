import { useState } from "react";
import { X, MessageCircle } from "lucide-react";
import { useTodos, useCreateTodo, useToggleTodo, useDeleteTodo } from "../hooks/use-todos";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

const friendsList = [
  { id: 1, name: "Thomas Douglas", avatar: "https://randomuser.me/api/portraits/men/5.jpg", status: "Available", timeAgo: "19 min" },
  { id: 2, name: "Catherine", avatar: "https://randomuser.me/api/portraits/women/6.jpg", status: "Away", timeAgo: "23 min", badge: "4" },
  { id: 3, name: "Daniel Russell", avatar: "https://randomuser.me/api/portraits/men/7.jpg", status: "Available", timeAgo: "14 min" },
  { id: 4, name: "James Richardson", avatar: "https://randomuser.me/api/portraits/men/8.jpg", status: "Away", timeAgo: "2 min" },
  { id: 5, name: "Madeline Kennedy", avatar: "https://randomuser.me/api/portraits/women/9.jpg", status: "Available", timeAgo: "5 min" },
  { id: 6, name: "Sarah Graves", avatar: "https://randomuser.me/api/portraits/women/10.jpg", status: "Available", timeAgo: "47 min" },
];

export function ProfilePanel({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("todos");
  const { data: todos, isLoading } = useTodos();
  const createTodo = useCreateTodo();
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();
  const [newTask, setNewTask] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    createTodo.mutate({ task: newTask, completed: false });
    setNewTask("");
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-screen w-full sm:w-96 bg-white shadow-2xl z-50 transition-transform duration-300 flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header with Tabs */}
        <div className="bg-gradient-purple text-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold">Profile Menu</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              data-testid="button-close-panel"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-white/30">
            <button
              onClick={() => setActiveTab("todos")}
              className={cn(
                "pb-2 font-bold text-sm transition-colors",
                activeTab === "todos"
                  ? "text-white border-b-2 border-white"
                  : "text-white/60 hover:text-white/80"
              )}
              data-testid="tab-todos"
            >
              TO DO LIST
            </button>
            <button
              onClick={() => setActiveTab("chats")}
              className={cn(
                "pb-2 font-bold text-sm transition-colors",
                activeTab === "chats"
                  ? "text-white border-b-2 border-white"
                  : "text-white/60 hover:text-white/80"
              )}
              data-testid="tab-chats"
            >
              CHATS
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "todos" ? (
            // TODO LIST TAB
            <div className="p-6">
              <h4 className="text-lg font-bold text-gray-800 mb-6">Todo List</h4>

              {/* Add Todo Form */}
              <form onSubmit={handleAdd} className="flex gap-2 mb-6">
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="What do you need"
                  className="flex-1 bg-gray-50 border-gray-200 focus:bg-white"
                  data-testid="input-new-todo"
                />
                <Button
                  type="submit"
                  disabled={createTodo.isPending}
                  className="bg-gradient-purple text-white border-0 hover:opacity-90 transition-opacity"
                  data-testid="button-add-todo"
                >
                  Add
                </Button>
              </form>

              {/* Todo Items */}
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-4 text-gray-400">Loading...</div>
                ) : todos?.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">No tasks yet</div>
                ) : (
                  todos?.map((todo) => (
                    <div
                      key={todo.id}
                      className="group flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      data-testid={`todo-item-${todo.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() =>
                          toggleTodo.mutate({ id: todo.id, completed: !todo.completed })
                        }
                        className="w-5 h-5 rounded-md border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        data-testid={`checkbox-${todo.id}`}
                      />
                      <span
                        className={cn(
                          "flex-1 text-sm font-medium transition-all",
                          todo.completed
                            ? "text-gray-400 line-through"
                            : "text-gray-700"
                        )}
                      >
                        {todo.task}
                      </span>
                      <button
                        onClick={() => deleteTodo.mutate(todo.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        data-testid={`button-delete-${todo.id}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            // CHATS TAB
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold text-gray-800">FRIENDS</h4>
                <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                  See All
                </button>
              </div>

              <div className="space-y-4">
                {friendsList.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                    data-testid={`friend-${friend.id}`}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={friend.avatar}
                        alt={friend.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                      />
                      <div
                        className={cn(
                          "absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white",
                          friend.status === "Available"
                            ? "bg-green-500"
                            : "bg-gray-400"
                        )}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {friend.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {friend.status}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {friend.badge && (
                        <span className="bg-teal-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                          {friend.badge}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 w-12 text-right">
                        {friend.timeAgo}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
