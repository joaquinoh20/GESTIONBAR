# Base de datos

Las tablas se definen en `backend/app/models.py` y se crean al iniciar la API (`create_all`).
Los datos de ejemplo se cargan desde `backend/app/seed.py` solo cuando la base está vacía.

Entidades: `users`, `customers`, `categories`, `products`, `sales`, `sale_details`, `payments`,
`inventory_movements`, `statistical_analyses`, `insights`, `audit_logs`.

- `migrations/`: reservada para Alembic (`alembic init`) cuando el sistema pase a producción.
- `seeds/`: reservada para cargas iniciales propias de la empresa (la semilla de demostración vive en el backend).
