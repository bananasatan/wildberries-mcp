/**
 * 12 MCP tools for Wildberries Seller API.
 */
import type { WBClient } from "./client.js";

// ---------- Tool definitions ----------

export const toolDefinitions = {
  list_products: {
    description: "List seller products (cards) with pagination",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Number of cards to return (max 100)" },
        cursor: { type: "string", description: "Pagination cursor (updatedAt from previous response)" },
        textSearch: { type: "string", description: "Search text filter" },
      },
    },
  },
  get_product: {
    description: "Get detailed info for specific product cards by nm IDs",
    inputSchema: {
      type: "object" as const,
      properties: {
        nmIDs: {
          type: "array",
          items: { type: "number" },
          description: "Array of nomenclature IDs (max 100)",
        },
      },
      required: ["nmIDs"],
    },
  },
  update_prices: {
    description: "Update product prices",
    inputSchema: {
      type: "object" as const,
      properties: {
        prices: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nmID: { type: "number", description: "Nomenclature ID" },
              price: { type: "number", description: "New price in rubles" },
            },
            required: ["nmID", "price"],
          },
          description: "Array of price updates",
        },
      },
      required: ["prices"],
    },
  },
  update_stocks: {
    description: "Update product stocks at a specific warehouse",
    inputSchema: {
      type: "object" as const,
      properties: {
        warehouseId: { type: "number", description: "Warehouse ID" },
        stocks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sku: { type: "string", description: "Barcode/SKU" },
              amount: { type: "number", description: "Stock quantity" },
            },
            required: ["sku", "amount"],
          },
          description: "Array of stock updates",
        },
      },
      required: ["warehouseId", "stocks"],
    },
  },
  get_orders: {
    description: "Get orders list with filters",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Number of orders (max 1000)" },
        next: { type: "number", description: "Pagination cursor" },
        dateFrom: { type: "string", description: "Date from (RFC3339, e.g. 2024-01-01T00:00:00Z)" },
        dateTo: { type: "string", description: "Date to (RFC3339)" },
      },
    },
  },
  get_new_orders: {
    description: "Get new (unprocessed) orders",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  get_sales: {
    description: "Get sales report",
    inputSchema: {
      type: "object" as const,
      properties: {
        dateFrom: { type: "string", description: "Date from (RFC3339)" },
        dateTo: { type: "string", description: "Date to (RFC3339)" },
        flag: { type: "number", description: "0 = all, 1 = only new since last request" },
      },
      required: ["dateFrom"],
    },
  },
  get_warehouses: {
    description: "Get list of WB warehouses (offices)",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  get_supply: {
    description: "Get supply (delivery) details",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Number of supplies" },
        next: { type: "number", description: "Pagination cursor" },
      },
    },
  },
  create_supply: {
    description: "Create a new supply (delivery)",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Supply name" },
      },
      required: ["name"],
    },
  },
  get_statistics: {
    description: "Get detailed sales statistics report by period",
    inputSchema: {
      type: "object" as const,
      properties: {
        dateFrom: { type: "string", description: "Start date (RFC3339)" },
        dateTo: { type: "string", description: "End date (RFC3339)" },
        limit: { type: "number", description: "Number of records" },
        rrdid: { type: "number", description: "Pagination cursor (last rrd_id from previous response)" },
      },
      required: ["dateFrom", "dateTo"],
    },
  },
  get_feedbacks: {
    description: "Get product feedbacks (reviews)",
    inputSchema: {
      type: "object" as const,
      properties: {
        isAnswered: { type: "boolean", description: "Filter by answered status" },
        take: { type: "number", description: "Number of feedbacks to return" },
        skip: { type: "number", description: "Number of feedbacks to skip" },
        order: { type: "string", description: "Sort order: dateAsc or dateDesc" },
      },
    },
  },
} as const;

// ---------- Tool handlers ----------

export type ToolName = keyof typeof toolDefinitions;

export async function handleTool(
  client: WBClient,
  name: ToolName,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "list_products": {
      const body: Record<string, unknown> = {
        settings: {
          cursor: { limit: (args.limit as number) ?? 100 },
          filter: { withPhoto: -1 },
        },
      };
      if (args.cursor) {
        (body.settings as Record<string, unknown>).cursor = {
          limit: (args.limit as number) ?? 100,
          updatedAt: args.cursor,
        };
      }
      if (args.textSearch) {
        (body.settings as Record<string, unknown>).filter = {
          withPhoto: -1,
          textSearch: args.textSearch,
        };
      }
      return client.post("/content/v2/get/cards/list", body);
    }

    case "get_product":
      return client.post("/content/v2/get/cards/detail", { nmIDs: args.nmIDs });

    case "update_prices":
      return client.post("/api/v2/upload/task", { data: args.prices });

    case "update_stocks": {
      const warehouseId = args.warehouseId as number;
      return client.put(`/api/v3/stocks/${warehouseId}`, { stocks: args.stocks });
    }

    case "get_orders": {
      const params: Record<string, string> = {};
      if (args.limit) params.limit = String(args.limit);
      if (args.next) params.next = String(args.next);
      if (args.dateFrom) params.dateFrom = String(args.dateFrom);
      if (args.dateTo) params.dateTo = String(args.dateTo);
      return client.get("/api/v3/orders", params);
    }

    case "get_new_orders":
      return client.get("/api/v3/orders/new");

    case "get_sales": {
      const params: Record<string, string> = { dateFrom: args.dateFrom as string };
      if (args.dateTo) params.dateTo = String(args.dateTo);
      if (args.flag !== undefined) params.flag = String(args.flag);
      return client.get("/api/v1/supplier/sales", params);
    }

    case "get_warehouses":
      return client.get("/api/v3/offices");

    case "get_supply": {
      const params: Record<string, string> = {};
      if (args.limit) params.limit = String(args.limit);
      if (args.next) params.next = String(args.next);
      return client.get("/api/v3/supplies", params);
    }

    case "create_supply":
      return client.post("/api/v3/supplies", { name: args.name });

    case "get_statistics": {
      const params: Record<string, string> = {
        dateFrom: args.dateFrom as string,
        dateTo: args.dateTo as string,
      };
      if (args.limit) params.limit = String(args.limit);
      if (args.rrdid) params.rrdid = String(args.rrdid);
      return client.get("/api/v1/supplier/reportDetailByPeriod", params);
    }

    case "get_feedbacks": {
      const params: Record<string, string> = {};
      if (args.isAnswered !== undefined) params.isAnswered = String(args.isAnswered);
      if (args.take) params.take = String(args.take);
      if (args.skip) params.skip = String(args.skip);
      if (args.order) params.order = String(args.order);
      return client.get("/api/v1/feedbacks", params);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
