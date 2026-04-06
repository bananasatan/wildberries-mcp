# @theyahia/wildberries-mcp

Wildberries Seller API MCP server. 15 tools. Production-grade rate limiting with 409 penalty protection.

## Features

- **15 tools** covering products, prices, stocks, orders, sales, warehouses, supplies, statistics, feedbacks, and ABC analysis
- **Production-grade rate limiter**: token bucket (300 req/min), 200ms minimum interval, automatic 409 penalty handling
- **409 penalty protection**: parses `X-Ratelimit-Remaining` and `X-Ratelimit-Retry-After` headers, waits the required duration
- **Streamable HTTP transport** (`--http` flag) for web deployments
- **Bearer JWT auth** (180-day validity tokens)

## Quick Start

```bash
npm install -g @theyahia/wildberries-mcp

# stdio transport (for Claude Desktop, Cursor, etc.)
WB_API_TOKEN=your_token wildberries-mcp

# Streamable HTTP transport
WB_API_TOKEN=your_token wildberries-mcp --http
```

## Configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wildberries": {
      "command": "npx",
      "args": ["-y", "@theyahia/wildberries-mcp"],
      "env": {
        "WB_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @theyahia/wildberries-mcp
```

## Auth

Authorization: `Bearer {WB_API_TOKEN}` (JWT, 180-day validity).

Get your token at: https://seller.wildberries.ru/supplier-settings/access-to-api

## Tools (15)

| Tool | Method | Endpoint |
|------|--------|----------|
| `list_products` | POST | `/content/v2/get/cards/list` |
| `get_product` | POST | `/content/v2/get/cards/detail` |
| `update_prices` | POST | `/api/v2/upload/task` |
| `update_stocks` | PUT | `/api/v3/stocks/{warehouseId}` |
| `get_stocks` | POST | `/api/v3/stocks/{warehouseId}` |
| `get_orders` | GET | `/api/v3/orders` |
| `get_new_orders` | GET | `/api/v3/orders/new` |
| `get_sales` | GET | `/api/v1/supplier/sales` |
| `get_warehouses` | GET | `/api/v3/offices` |
| `get_supply` | GET | `/api/v3/supplies` |
| `create_supply` | POST | `/api/v3/supplies` |
| `get_statistics` | GET | `/api/v1/supplier/reportDetailByPeriod` |
| `get_feedbacks` | GET | `/api/v1/feedbacks` |
| `reply_feedback` | PATCH | `/api/v1/feedbacks` |
| `get_abc_analysis` | GET | `/api/v1/supplier/reportDetailByPeriod` (computed) |

## Rate Limiting

Wildberries enforces strict rate limits with **penalties**:

- **300 requests per minute** (token bucket)
- **200ms minimum interval** between requests
- **HTTP 409 = PENALTY**: 5-10 tokens deducted from your bucket
  - Server reads `X-Ratelimit-Retry-After` header and waits the specified duration
  - Server reads `X-Ratelimit-Remaining` to sync token count
  - All throttling activity is logged to stderr

The rate limiter is built into the client -- no configuration needed.

## Development

```bash
git clone https://github.com/theYahia/wildberries-mcp.git
cd wildberries-mcp
npm install
npm run build
npm test
```

## License

MIT
