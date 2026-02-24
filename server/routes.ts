import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

async function seedDatabase() {
  const categoriesCount = await storage.getCategories();
  if (categoriesCount.length === 0) {
    // Parent Categories
    const livingRoom = await storage.createCategory({ name: "Living Room", slug: "living-room", imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80" });
    const bedroom = await storage.createCategory({ name: "Bedroom", slug: "bedroom", imageUrl: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80" });
    const office = await storage.createCategory({ name: "Home Office", slug: "home-office", imageUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80" });

    // Subcategories
    const sofas = await storage.createCategory({ name: "Sofas", slug: "sofas", imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80", parentId: livingRoom.id });
    const beds = await storage.createCategory({ name: "Beds", slug: "beds", imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80", parentId: bedroom.id });
    const desks = await storage.createCategory({ name: "Desks", slug: "desks", imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&q=80", parentId: office.id });

    // Products
    const sampleProducts = [
      {
        categoryId: sofas.id,
        name: "Genova Leatherette Sofa",
        description: "Luxurious tan leatherette sofa for your living room. Perfect combination of style and comfort.",
        price: 33200,
        originalPrice: 109000,
        imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80",
        isBestseller: true,
        features: ["Premium leatherette", "Tan color", "Exchange offer available"],
      },
      {
        categoryId: sofas.id,
        name: "Alexa Elite Half Leather Sofa",
        description: "Comfortable and elegant half leather sofa in grey. Fits any modern interior.",
        price: 55000,
        originalPrice: 159900,
        imageUrl: "https://images.unsplash.com/photo-1540574163026-643ea20d25b5?auto=format&fit=crop&q=80",
        isBestseller: true,
        features: ["Half leather", "Grey color", "Elite design"],
      },
      {
        categoryId: beds.id,
        name: "Queen Size Wooden Bed",
        description: "Sturdy wooden bed with a minimalist design.",
        price: 25000,
        originalPrice: 40000,
        imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80",
        isBestseller: false,
        features: ["Queen size", "Solid wood", "Minimalist"],
      },
      {
        categoryId: desks.id,
        name: "Minimalist Study Table",
        description: "Clean lines and functional design for your workspace.",
        price: 12000,
        originalPrice: 18000,
        imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&q=80",
        isBestseller: true,
        features: ["Solid oak", "Storage drawer", "Compact design"],
      },
      {
        categoryId: sofas.id,
        name: "Lounge Armchair",
        description: "Ergonomic and stylish armchair for relaxation.",
        price: 18500,
        originalPrice: 28000,
        imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&q=80",
        isBestseller: false,
        features: ["Soft fabric", "Solid wood legs", "Mustard yellow"],
      }
    ];

    for (const product of sampleProducts) {
      await storage.createProduct(product);
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Initialize auth
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get(api.categories.list.path, async (req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.get(api.products.list.path, async (req, res) => {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const isBestseller = req.query.isBestseller === 'true' ? true : undefined;
    const products = await storage.getProducts(categoryId, isBestseller);
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  });

  app.get(api.cart.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const items = await storage.getCart(userId);
    res.json(items);
  });

  app.post(api.cart.add.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.cart.add.input.parse(req.body);
      const userId = req.user.claims.sub;
      const item = await storage.addToCart(userId, input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.cart.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.cart.update.input.parse(req.body);
      const item = await storage.updateCartItem(Number(req.params.id), input.quantity);
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.cart.remove.path, isAuthenticated, async (req: any, res) => {
    await storage.removeFromCart(Number(req.params.id));
    res.status(204).end();
  });

  app.delete(api.cart.clear.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    await storage.clearCart(userId);
    res.status(204).end();
  });

  app.get(api.wishlist.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const items = await storage.getWishlist(userId);
    res.json(items);
  });

  app.post(api.wishlist.toggle.path, isAuthenticated, async (req: any, res) => {
    const input = api.wishlist.toggle.input.parse(req.body);
    const userId = req.user.claims.sub;
    const added = await storage.toggleWishlist(userId, input.productId);
    res.json({ added });
  });

  app.post(api.checkout.process.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const cart = await storage.getCart(userId);
    
    if (cart.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const order = await storage.createOrder(userId, total);
    await storage.clearCart(userId);
    
    res.json({ success: true, orderId: order.id });
  });

  app.get(api.orders.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const orders = await storage.getOrders(userId);
    res.json(orders);
  });

  // Seed db (fire and forget)
  seedDatabase().catch(console.error);

  return httpServer;
}
