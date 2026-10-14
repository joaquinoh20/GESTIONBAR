# Arquitectura de SalesIA Enterprise

```
Usuario → React + TypeScript → HTTPS/REST → FastAPI → PostgreSQL
                                              └─ motor estadístico (Python)
```

El flujo de negocio es: cliente → venta → pago → inventario → base de datos → dataset analítico → media / mediana / variables / probabilidad / Bayes → gráficos → insights → dashboard y reportes.

## Cobertura del plan por fases

| Fase | Estado | Dónde |
|---|---|---|
| 01–02 Análisis y arquitectura | Aplicado | Este documento, `README.md` |
| 03 UX/UI | Implementado | `frontend/src/styles.css`, `components/`, paleta Creativa |
| 04 Base de datos | Modelos y semilla; sin migraciones Alembic | `backend/app/models.py`, `seed.py` |
| 05 Backend/API | Implementado | `backend/app/api/` (documentación en `/docs`) |
| 06 Frontend | Implementado | `frontend/src/` |
| 07 Clientes y productos | Implementado | `modules/customers`, `modules/products` |
| 08 Ventas, pedidos e inventario | Venta directa con pago e inventario; sin estado de «pedido» previo | `modules/sales`, `api/sales.py` |
| 09 Motor estadístico | Implementado y probado | `backend/app/statistics/engine.py` |
| 10 Dashboard Analytics | Implementado | `modules/dashboard`, `modules/analytics` |
| 11 Insights | Implementado | `api/insights.py` |
| 12 Reportes | Implementado (CSV e impresión; sin PDF/Excel) | `api/reports.py`, `modules/reports` |
| 13 Seguridad y auditoría | JWT, roles, auditoría | `core/security.py`, `api/deps.py` |
| 14 Pruebas | Pruebas de motor y API escritas; frontend sin pruebas automáticas | `backend/tests/` |
| 15 Despliegue | Docker Compose incluido | `docker-compose.yml` |
| 16 Documentación | README y este documento; sin manual de usuario | `README.md`, `docs/` |

## API principal (prefijo `/api`)

| Método | Endpoint | Función |
|---|---|---|
| POST | `/auth/login` | Autenticación (JWT) |
| GET/POST/PUT/DELETE | `/customers` | Clientes (`/customers/{id}/history`) |
| GET/POST/PUT/DELETE | `/products`, `/categories` | Catálogo |
| POST | `/inventory/adjust` · GET `/inventory/movements` | Inventario |
| POST/GET | `/sales` · POST `/sales/{id}/cancel` | Ventas |
| GET | `/dashboard/summary` | Resumen ejecutivo |
| GET | `/analytics/datasets/{name}` | Análisis estadístico de datos de ventas |
| POST | `/statistics/mean`, `/statistics/median`, `/statistics/compare` | Media, mediana, comparación |
| POST | `/random-variables/analyze` | Variable aleatoria |
| POST | `/probability/simple`, `/probability/bayes` | Probabilidad y Bayes |
| GET | `/analyses` | Historial de análisis |
| GET/POST | `/insights`, `/insights/generate` | Insights por reglas |
| GET | `/reports/{kind}` | Reportes |
| GET | `/audit` | Auditoría |

## Motor estadístico

- **Media:** `(x₁ + … + xₙ) / n`.
- **Mediana:** valor central de los datos ordenados; con `n` par, promedio de los dos centrales.
- **Comparación:** diferencia media − mediana; si supera ±5 % se informa sesgo positivo o negativo y se explica cuál medida representa mejor el valor típico.
- **Variable aleatoria observada:** esperanza, varianza y desviación (poblacionales), distribución de frecuencias y `P(X > umbral)`.
- **Bayes:** `P(A|B) = P(B|A)·P(A) / P(B)`, con `P(B)` ingresada o calculada por probabilidad total; devuelve el procedimiento paso a paso y rechaza datos inconsistentes.
