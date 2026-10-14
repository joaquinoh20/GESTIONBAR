# SalesIA Enterprise

Sistema web empresarial de gestión de ventas con un módulo **Analytics** que convierte los datos de las ventas en estadística aplicada (Semana 07): variables estadísticas, media, mediana, variables aleatorias, probabilidad y Teorema de Bayes.

- **Frontend:** React + TypeScript (Vite) — paleta **Creativa**: verde azulado `#1A8A80`, verde lima `#A9C623`, amarillo `#FAD022`.
- **Backend:** Python + FastAPI + SQLAlchemy.
- **Base de datos:** PostgreSQL (SQLite local como alternativa para probar rápido).

## Cómo ejecutarlo

### Opción A — Docker (PostgreSQL + API + web)

```bash
docker compose up --build
```

- Web: <http://localhost:8080>
- API y documentación Swagger: <http://localhost:8000/docs>

### Opción B — Local

**Backend** (Python 3.11 o superior):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload    # usa SQLite (salesia.db) si no defines DATABASE_URL
```

Para usar PostgreSQL, copia `backend/.env.example` a `backend/.env` y ajusta `DATABASE_URL`.

**Frontend** (Node 18 o superior):

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173 (redirige /api al backend en :8000)
```

Al primer arranque, el backend crea las tablas y carga **datos de ejemplo** (180 ventas de los últimos 85 días, 16 productos, 20 clientes).

## Cuentas de demostración

| Rol | Correo | Contraseña | Puede |
|---|---|---|---|
| Administrador | admin@salesia.com | admin123 | Todo |
| Gerente | gerente@salesia.com | gerente123 | Ventas, clientes, productos, Analytics, reportes, auditoría, anular ventas |
| Vendedor | vendedor@salesia.com | vendedor123 | Registrar ventas (ve solo las suyas), clientes, consultar productos |
| Analista | analista@salesia.com | analista123 | Analytics, probabilidad/Bayes, insights, reportes |
| Almacén | almacen@salesia.com | almacen123 | Productos y movimientos de inventario |

**Cambia estas contraseñas y la `SECRET_KEY` antes de publicar el sistema.** Para no cargar datos de ejemplo en producción, usa `SEED_ON_START=false`.

## Qué incluye

| Módulo | Qué hace |
|---|---|
| Dashboard | KPIs, ingresos por día, productos más vendidos, categorías, desempeño por vendedor; ticket promedio (media) frente a venta típica (mediana) |
| Ventas | Venta con varias líneas, descuento, IGV 18 % configurable, pago, validación de stock, descuento automático de inventario y anulación que devuelve stock |
| Clientes / Productos | CRUD con búsqueda, filtros, historial del cliente, categorías, stock mínimo y movimientos de inventario |
| Analytics | Dataset derivado de las ventas (monto, unidades por venta, precio, stock): clasificación de la variable, media vs. mediana con lectura explicada, esperanza, varianza, desviación, histograma y P(X > umbral). Incluye calculadora libre |
| Probabilidad y Bayes | Teorema de Bayes con procedimiento paso a paso, probabilidad simple e historial de análisis |
| Insights | Reglas determinísticas (media vs. mediana, concentración de ingresos, stock bajo, tendencia semanal), cada una con su evidencia numérica |
| Reportes | Ventas, estadístico, productos, clientes y vendedores; exportación a CSV e impresión |
| Seguridad | JWT, roles con permisos por endpoint, validación en backend y frontend, registro de auditoría |

## Estructura

```
salesia-enterprise/
├── backend/
│   ├── app/
│   │   ├── api/            # routers: auth, customers, products, sales, analytics, insights, reports
│   │   ├── core/           # configuración, base de datos, seguridad (JWT + bcrypt)
│   │   ├── statistics/     # motor estadístico (funciones puras)
│   │   ├── models.py       # tablas SQLAlchemy
│   │   ├── schemas.py      # validación Pydantic
│   │   └── seed.py         # datos de ejemplo
│   └── tests/              # pruebas del motor estadístico y de la API
├── frontend/src/
│   ├── app/ layouts/ components/ hooks/ services/ types/ utils/
│   └── modules/            # auth, dashboard, customers, products, sales, analytics, probability, insights, reports, audit
├── database/               # notas de migraciones y semillas
├── docs/ARQUITECTURA.md
└── docker-compose.yml
```

## Pruebas

```bash
cd backend
pytest -q
```

- `tests/test_statistics.py`: media, mediana, comparación, variables, frecuencias, variable aleatoria, probabilidad y Bayes (incluye casos límite y datos inválidos).
- `tests/test_api.py`: login, permisos por rol, venta → inventario → anulación, dashboard, endpoints estadísticos, insights, reportes y auditoría.

## Pendiente / siguientes pasos

- **Migraciones:** las tablas se crean con `create_all` al iniciar. Para producción conviene adoptar Alembic (carpeta `database/migrations` reservada).
- **Importes:** se guardan como `Float` redondeado a 2 decimales; para contabilidad estricta, migrar a `Numeric(12,2)`.
- **Semana 08:** la arquitectura admite varianza por grupos, pruebas de hipótesis, p-valor y modelos predictivos como nuevos módulos en `statistics/`.
