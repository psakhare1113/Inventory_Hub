import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

// Get all users
app.get("/api/users", async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT * FROM users ORDER BY created_at DESC"
  ).all();
  return c.json(result.results);
});

// Update user details
app.put("/api/users/:id", async (c) => {
  const id = c.req.param("id");
  const { name, email, phone } = await c.req.json();
  
  await c.env.DB.prepare(
    "UPDATE users SET name = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  )
    .bind(name, email, phone, id)
    .run();
  
  return c.json({ success: true });
});

// Update user role
app.patch("/api/users/:id/role", async (c) => {
  const id = c.req.param("id");
  const { role } = await c.req.json();
  
  await c.env.DB.prepare(
    "UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  )
    .bind(role, id)
    .run();
  
  return c.json({ success: true });
});

// Update user status (activate/deactivate)
app.patch("/api/users/:id/status", async (c) => {
  const id = c.req.param("id");
  const { is_active } = await c.req.json();
  
  await c.env.DB.prepare(
    "UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  )
    .bind(is_active, id)
    .run();
  
  return c.json({ success: true });
});

// Delete user
app.delete("/api/users/:id", async (c) => {
  const id = c.req.param("id");
  
  await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  
  return c.json({ success: true });
});

export default app;
