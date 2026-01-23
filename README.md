# Stocker - Depletion-Based Inventory Tracker

A modern inventory and profit tracking tool designed for informal retailers like kiosks and small shops, with a roadmap to support workshops, artisans, and other informal businesses. Track stock by depletion instead of individual sales, reducing cognitive load while providing actionable business insights.

## Features
* Depletion-Based Tracking: Log stock in bulk and mark when depleted
* Automatic Profit Calculation: System estimates revenue and profit
* Stock Velocity Analysis: Identify fast and slow-moving products
* Low Stock Alerts: Never run out of popular items
* Visual Reports: Weekly profit trends and turnover rates
* Simple Data Entry: Minimal input for maximum insights

## Tech Stack
### Backend

* Django 4.2
* Django REST Framework
* PostgreSQL
* JWT Authentication

### Frontend

* React 18
* Tailwind CSS
* Recharts (for visualizations)
* Axios
* React Router

## Installation
### Prerequisites

* Python 3.10+
* Node.js 18+
* PostgreSQL 14+

### Backend Setup
```bash

# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv stock

# Activate
source stock/bin/activate 

# Install dependencies
pip install -r requirements.txt

# Create PostgreSQL database
createdb stocker_db

# Copy environment variables
cp .env.example .env


# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```
### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run development server
npm run dev 
```

### The application will be available at:

    Frontend: http://localhost:3000
    Backend API: http://localhost:8000
    Admin Panel: http://localhost:8000/admin

## API Endpoints
### Authentication

    POST /api/token/ - Obtain JWT token
    POST /api/token/refresh/ - Refresh JWT token

### Products

    GET /api/products/ - List all products
    POST /api/products/ - Create new product
    GET /api/products/{id}/ - Get product details
    PUT /api/products/{id}/ - Update product
    DELETE /api/products/{id}/ - Delete product

### Stock Batches

    GET /api/batches/ - List all batches
    POST /api/batches/ - Add new stock batch
    GET /api/batches/active/ - Get non-depleted batches
    POST /api/batches/{id}/mark_depleted/ - Mark batch as depleted

### Dashboard

    GET /api/dashboard/ - Get dashboard statistics


### Alerts

    GET /api/alerts/ - List all alerts
    POST /api/alerts/ - Create alert
    GET /api/alerts/triggered/ - Get triggered alerts

## Usage
### Adding Stock

- Click "Add New Stock" button
- Select existing product or create new one
- Enter quantity, buy price, and sell price
- Save

### Marking Stock as Depleted

- Click "Mark Stock Depleted"
- Select the product/batch
- Choose status:
  - **Yes, Finished** — Completely sold out
  - **Partly Used** — Enter quantity used
  - **Still Remaining** — No change

### Understanding Metrics

- Daily Profit: Profit from items depleted today
- Stock Velocity: Average days to sell a batch
- Fast Movers: Products that sell quickly
- Slow Movers: Products that take longer to sell
- Stock Turnover: Average time inventory stays in stock

## Project Structure
```text
stocker/
├── backend/
│   ├── stocker/
│   │   ├── settings.py
│   │   └── urls.py
│   ├── inventory/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddStockModal.jsx
│   │   │   ├── DepletionModal.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   └── Login.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Key Models
**Product**- Base catalog of items sold in the shop.

**StockBatch**-Individual stock purchases - the core entity. Tracks quantity, prices, and depletion status.


**PartialDepletion**- Records partial usage of stock batches.


**LowStockAlert**- Configurable alerts for products running low.


## Business Logic

The system uses depletion-based tracking instead of traditional point-of-sale:

- Stock Entry: User logs bulk purchases with buy/sell prices
- Sales Tracking: Mark entire batches as "depleted" when sold
- Profit Calculation: System automatically calculates profit based on batch data
- Velocity Analysis: Tracks days between purchase and depletion
- Insights: Identifies patterns in fast/slow-moving products

### This approach:

* Reduces data entry burden
* Matches how informal retailers think
* Provides accurate profit visibility
* Enables better purchasing decisions

### Future Enhancements
* Support for non-retail informal businesses (e.g. jua kali artisans and service-based traders)
* Offline mode with local storage
* SMS/Push notifications for alerts
* Multi-location support
* Supplier management
* Credit/debt tracking
* Mobile app (React Native)
* Barcode scanning
* Export reports to PDF/Excel

### Contributing
 
- Fork the repository
- Create a feature branch
- Commit your changes
- Push to the branch
- Open a Pull Request

### License

MIT License - feel free to use for commercial projects

### Support

For issues and questions, please open an issue on GitHub.


