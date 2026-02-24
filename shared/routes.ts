import { z } from 'zod';
import { 
  insertCartItemSchema, 
  products, 
  categories, 
  cartItems, 
  wishlistItems,
  orders 
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories' as const,
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
      },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      input: z.object({
        categoryId: z.coerce.number().optional(),
        search: z.string().optional(),
        isBestseller: z.coerce.boolean().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id' as const,
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
  cart: {
    list: {
      method: 'GET' as const,
      path: '/api/cart' as const,
      responses: {
        200: z.array(z.custom<typeof cartItems.$inferSelect & { product: typeof products.$inferSelect }>()),
        401: errorSchemas.unauthorized,
      }
    },
    add: {
      method: 'POST' as const,
      path: '/api/cart' as const,
      input: insertCartItemSchema,
      responses: {
        201: z.custom<typeof cartItems.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/cart/:id' as const,
      input: z.object({ quantity: z.number().min(1) }),
      responses: {
        200: z.custom<typeof cartItems.$inferSelect>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    },
    remove: {
      method: 'DELETE' as const,
      path: '/api/cart/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    },
    clear: {
      method: 'DELETE' as const,
      path: '/api/cart' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  wishlist: {
    list: {
      method: 'GET' as const,
      path: '/api/wishlist' as const,
      responses: {
        200: z.array(z.custom<typeof wishlistItems.$inferSelect & { product: typeof products.$inferSelect }>()),
        401: errorSchemas.unauthorized,
      }
    },
    toggle: {
      method: 'POST' as const,
      path: '/api/wishlist/toggle' as const,
      input: z.object({ productId: z.number() }),
      responses: {
        200: z.object({ added: z.boolean() }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  checkout: {
    process: {
      method: 'POST' as const,
      path: '/api/checkout' as const,
      responses: {
        200: z.object({ success: z.boolean(), orderId: z.number() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    }
  },
  orders: {
    list: {
      method: 'GET' as const,
      path: '/api/orders' as const,
      responses: {
        200: z.array(z.custom<typeof orders.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
