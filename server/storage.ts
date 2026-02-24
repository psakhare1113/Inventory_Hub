import { db } from "./db";
import { 
  categories, products, cartItems, wishlistItems, orders,
  type InsertCategory, type InsertProduct, type Category, type Product,
  type InsertCartItem, type CartItem, type WishlistItem, type Order
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Products
  getProducts(categoryId?: number, isBestseller?: boolean): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;

  // Cart
  getCart(userId: string): Promise<(CartItem & { product: Product })[]>;
  addToCart(userId: string, item: Omit<InsertCartItem, 'userId'>): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<CartItem>;
  removeFromCart(id: number): Promise<void>;
  clearCart(userId: string): Promise<void>;

  // Wishlist
  getWishlist(userId: string): Promise<(WishlistItem & { product: Product })[]>;
  toggleWishlist(userId: string, productId: number): Promise<boolean>;

  // Orders
  createOrder(userId: string, totalAmount: number): Promise<Order>;
  getOrders(userId: string): Promise<Order[]>;
}

export class DatabaseStorage implements IStorage {
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  async getProducts(categoryId?: number, isBestseller?: boolean): Promise<Product[]> {
    let query = db.select().from(products).$dynamic();
    
    if (categoryId !== undefined) {
      query = query.where(eq(products.categoryId, categoryId));
    } else if (isBestseller !== undefined) {
      query = query.where(eq(products.isBestseller, isBestseller));
    }
    
    return await query;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async getCart(userId: string): Promise<(CartItem & { product: Product })[]> {
    const items = await db.select({
      cartItem: cartItems,
      product: products
    }).from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId));
      
    return items.map(row => ({ ...row.cartItem, product: row.product }));
  }

  async addToCart(userId: string, item: Omit<InsertCartItem, 'userId'>): Promise<CartItem> {
    const [existing] = await db.select().from(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, item.productId)));

    if (existing) {
      return await this.updateCartItem(existing.id, existing.quantity + item.quantity);
    }

    const [created] = await db.insert(cartItems).values({ ...item, userId }).returning();
    return created;
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem> {
    const [updated] = await db.update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, id))
      .returning();
    return updated;
  }

  async removeFromCart(id: number): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  async getWishlist(userId: string): Promise<(WishlistItem & { product: Product })[]> {
    const items = await db.select({
      wishlistItem: wishlistItems,
      product: products
    }).from(wishlistItems)
      .innerJoin(products, eq(wishlistItems.productId, products.id))
      .where(eq(wishlistItems.userId, userId));
      
    return items.map(row => ({ ...row.wishlistItem, product: row.product }));
  }

  async toggleWishlist(userId: string, productId: number): Promise<boolean> {
    const [existing] = await db.select().from(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));

    if (existing) {
      await db.delete(wishlistItems).where(eq(wishlistItems.id, existing.id));
      return false; // removed
    }

    await db.insert(wishlistItems).values({ userId, productId });
    return true; // added
  }

  async createOrder(userId: string, totalAmount: number): Promise<Order> {
    const [order] = await db.insert(orders).values({ userId, totalAmount }).returning();
    return order;
  }

  async getOrders(userId: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(orders.createdAt);
  }
}

export const storage = new DatabaseStorage();
