import { useTodos, useCreateTodo, useToggleTodo, useDeleteTodo } from "../hooks/use-todos";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

export function TodoList() {
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
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-bold text-gray-800">Todo List</h4>
        <div className="flex gap-2">
          {/* Using simple buttons for add since full form is inline below */}
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <Input 
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="What do you need to do today?"
          className="flex-1 bg-gray-50 border-gray-200 focus:bg-white"
        />
        <Button 
          type="submit" 
          disabled={createTodo.isPending}
          className="bg-gradient-purple text-white border-0 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4 mr-2" /> Add
        </Button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {isLoading ? (
          <div className="text-center py-4 text-gray-400">Loading tasks...</div>
        ) : todos?.length === 0 ? (
          <div className="text-center py-4 text-gray-400">No tasks yet. Add one!</div>
        ) : (
          todos?.map((todo) => (
            <div key={todo.id} className="group flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <input 
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo.mutate({ id: todo.id, completed: !todo.completed })}
                className="w-5 h-5 rounded-md border-gray-300 text-purple-600 focus:ring-purple-500 transition-all cursor-pointer"
              />
              <span className={cn(
                "flex-1 text-sm font-medium transition-all",
                todo.completed ? "text-gray-400 line-through" : "text-gray-700"
              )}>
                {todo.task}
              </span>
              <button 
                onClick={() => deleteTodo.mutate(todo.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
