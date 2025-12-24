# Chatbot API Documentation

This API provides access to the SkyLuxse fleet, vehicle details, and availability checking for chatbot integration.

## Base URL
```
https://skyluxse.ae
```

## Authentication
All endpoints require an API Key to be passed in the `x-api-key` header.

**Header:**
```
x-api-key: <YOUR_SECRET_KEY>
```
*Note: The key must match the `CHATBOT_API_KEY` environment variable on the server.*

---

## Endpoints

### 1. Get Fleet (List Cars)
Returns a paginated list of vehicles with filtering options.

**Endpoint:** `GET /api/cars`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Number of items per page (default: 10) |
| `offset` | number | Pagination offset (default: 0) |
| `car` | string | Filter by make (e.g., "BMW") |
| `model` | string | Filter by model (e.g., "X5") |
| `year` | number | Filter by model year |
| `seats` | number | Filter by seating capacity |
| `type` | string | Filter by body style (e.g., "SUV") |
| `minDailyPrice` | number | Minimum daily price |
| `maxDailyPrice` | number | Maximum daily price |

**Response Example:**
```json
{
  "data": [
    {
      "id": "uuid-string",
      "car": "BMW",
      "model": "X6",
      "year": 2024,
      "seats": 5,
      "prices": {
        "daily": 1000,
        "weekly": 6000,
        "monthly": 25000,
        "minimumDays": 1
      },
      "availability": {
        "from": "2025-12-24",
        "to": "2026-01-23"
      }
    }
  ],
  "meta": {
    "total": 52,
    "limit": 10,
    "offset": 0
  }
}
```

### 2. Get Car Details
Returns detailed information about a specific vehicle.

**Endpoint:** `GET /api/cars/{id}`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The unique UUID of the vehicle |

**Response Example:**
```json
{
  "data": {
    "id": "uuid-string",
    "car": "BMW",
    "model": "X6",
    "year": 2024,
    "type": "SUV",
    "seats": 5,
    "color": "Nardo Grey",
    "interiorColor": "Brown",
    "plateNumber": "K21656",
    "win": "WBX...",
    "prices": {
      "daily": 1000,
      "weekly": 6000,
      "monthly": 25000,
      "minimumDays": 1
    },
    "specifications": {
      "engineCapacity": 3.0,
      "hpw": 381,
      "cylinders": 6,
      "acceleration": 5.6,
      "transmission": "Automatic"
    },
    "website": "https://skyluxse.ae/catalog/bmw-x6/",
    "imageUrl": "https://...",
    "keywords": ["bmw", "x6", "suv"],
    "availability": {
      "from": "2025-12-24",
      "to": "2026-01-23"
    }
  }
}
```

### 3. Check Availability
Finds vehicles available for a specific date range.

**Endpoint:** `GET /api/cars/available`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date_from` | string | Yes | Start date (YYYY-MM-DD) |
| `date_to` | string | Yes | End date (YYYY-MM-DD) |

**Response Example:**
```json
{
  "data": [
    {
      "id": "uuid-string",
      "car": "Audi",
      "model": "Q8",
      "availability": {
        "from": "2025-01-01",
        "to": "2025-01-05"
      }
      // ... same structure as Get Fleet items
    }
  ],
  "meta": {
    "total": 5,
    "limit": 10,
    "dateFrom": "2025-01-01",
    "dateTo": "2025-01-05"
  }
}
```

## Error Codes
| Status | Code | Description |
|--------|------|-------------|
| 400 | Bad Request | Missing parameters or invalid data |
| 401 | Unauthorized | Missing or invalid `x-api-key` |
| 404 | Not Found | Vehicle not found |
| 500 | Server Error | Internal system error |

## Setup Instructions
1. Ensure the `CHATBOT_API_KEY` environment variable is set in the Vercel/Server project settings.
2. Use this key in the `x-api-key` header for all requests.
