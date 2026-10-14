"""Dashboard, datasets analíticos derivados de las ventas y motor estadístico (Semana 07)."""
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models import Category, Customer, Product, Sale, SaleDetail, StatisticalAnalysis, User
from ..schemas import AnalysisOut, BayesIn, RandomVarIn, SimpleProbIn, ValuesIn
from ..statistics import engine
from .deps import get_current_user, require_roles

router = APIRouter(tags=["Análisis y estadística"])
ANALYST = require_roles("gerente", "analista")

DATASETS = {
    "monto_venta": "Monto total de cada venta (S/)",
    "items_por_venta": "Cantidad de unidades por venta",
    "precio_producto": "Precio unitario de los productos",
    "stock_producto": "Existencias disponibles por producto",
}


def _paid_sales(db: Session, days: int | None = None, category_id: int | None = None,
                seller_id: int | None = None) -> list[Sale]:
    stmt = select(Sale).where(Sale.status == "pagada").order_by(Sale.created_at)
    if days:
        stmt = stmt.where(Sale.created_at >= datetime.utcnow() - timedelta(days=days))
    if seller_id:
        stmt = stmt.where(Sale.seller_id == seller_id)
    sales = list(db.scalars(stmt).all())
    if category_id:
        sales = [s for s in sales if any(d.product.category_id == category_id for d in s.details)]
    return sales


def _save(db: Session, user: User, kind: str, title: str, input_data: dict, result: dict) -> int:
    row = StatisticalAnalysis(kind=kind, title=title, input_data=input_data, result=result, user_id=user.id)
    db.add(row)
    db.commit()
    return row.id


def _stat_call(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except engine.StatisticsError as e:
        raise HTTPException(422, str(e))


# ---------------------------------------------------------------- Dashboard
@router.get("/dashboard/summary")
def dashboard_summary(days: int = 30, category_id: int | None = None, seller_id: int | None = None,
                      db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role == "vendedor":
        seller_id = user.id
    sales = _paid_sales(db, days, category_id, seller_id)
    totals = [s.total for s in sales]
    by_day: dict[str, float] = defaultdict(float)
    by_product: dict[str, dict] = defaultdict(lambda: {"quantity": 0, "revenue": 0.0})
    by_category: dict[str, float] = defaultdict(float)
    by_seller: dict[str, dict] = defaultdict(lambda: {"sales": 0, "revenue": 0.0})
    for s in sales:
        by_day[s.created_at.strftime("%Y-%m-%d")] += s.total
        by_seller[s.seller.name]["sales"] += 1
        by_seller[s.seller.name]["revenue"] += s.total
        for d in s.details:
            if category_id and d.product.category_id != category_id:
                continue
            by_product[d.product.name]["quantity"] += d.quantity
            by_product[d.product.name]["revenue"] += d.line_total
            by_category[d.product.category.name] += d.line_total
    revenue = sum(totals)
    low_stock = db.scalar(select(func.count()).select_from(Product)
                          .where(Product.active.is_(True), Product.stock <= Product.min_stock))
    top_products = sorted(({"name": k, **v} for k, v in by_product.items()),
                          key=lambda x: x["revenue"], reverse=True)
    for p in top_products:
        p["revenue"] = round(p["revenue"], 2)
        p["share"] = round(p["revenue"] / revenue * 100, 1) if revenue else 0
    return {
        "days": days,
        "kpis": {
            "revenue": round(revenue, 2),
            "sales_count": len(sales),
            "average_ticket": round(engine.mean(totals), 2) if totals else 0,
            "median_ticket": round(engine.median(totals), 2) if totals else 0,
            "customers": db.scalar(select(func.count()).select_from(Customer).where(Customer.active.is_(True))),
            "low_stock": low_stock,
        },
        "sales_by_day": [{"date": k, "revenue": round(v, 2)} for k, v in sorted(by_day.items())],
        "top_products": top_products[:8],
        "by_category": [{"name": k, "revenue": round(v, 2)}
                        for k, v in sorted(by_category.items(), key=lambda x: -x[1])],
        "by_seller": sorted(({"name": k, "sales": v["sales"], "revenue": round(v["revenue"], 2),
                              "average": round(v["revenue"] / v["sales"], 2)} for k, v in by_seller.items()),
                            key=lambda x: -x["revenue"]),
    }


# ---------------------------------------------------------------- Datasets
def dataset_values(db: Session, name: str, days: int | None, category_id: int | None,
                   seller_id: int | None) -> list[float]:
    if name == "monto_venta":
        return [s.total for s in _paid_sales(db, days, category_id, seller_id)]
    if name == "items_por_venta":
        return [float(sum(d.quantity for d in s.details)) for s in _paid_sales(db, days, category_id, seller_id)]
    stmt = select(Product).where(Product.active.is_(True))
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    products = db.scalars(stmt).all()
    if name == "precio_producto":
        return [p.price for p in products]
    if name == "stock_producto":
        return [float(p.stock) for p in products]
    raise HTTPException(404, "El conjunto de datos no existe")


@router.get("/analytics/datasets")
def list_datasets(_: User = Depends(ANALYST)):
    return [{"name": k, "description": v} for k, v in DATASETS.items()]


@router.get("/analytics/datasets/{name}")
def analyze_dataset(name: str, days: int | None = 90, category_id: int | None = None,
                    seller_id: int | None = None, threshold: float | None = None,
                    save: bool = True, db: Session = Depends(get_db), user: User = Depends(ANALYST)):
    if name not in DATASETS:
        raise HTTPException(404, "El conjunto de datos no existe")
    values = dataset_values(db, name, days, category_id, seller_id)
    if not values:
        raise HTTPException(422, "No hay datos para esos filtros")
    result = {
        "dataset": name,
        "description": DATASETS[name],
        "variable": _stat_call(engine.classify_variable, values),
        "comparison": _stat_call(engine.compare_mean_median, values),
        "random_variable": _stat_call(engine.random_variable_analysis, values, threshold),
    }
    if save:
        result["analysis_id"] = _save(db, user, "dataset", f"Conjunto de datos: {DATASETS[name]}",
                                      {"days": days, "category_id": category_id, "seller_id": seller_id,
                                       "threshold": threshold}, result)
    return result


# ---------------------------------------------------------------- Operaciones sobre valores libres
@router.post("/statistics/mean")
def stat_mean(payload: ValuesIn, db: Session = Depends(get_db), user: User = Depends(ANALYST)):
    value = _stat_call(engine.mean, payload.values)
    result = {"n": len(payload.values), "mean": round(value, 4),
              "formula": "media = (x₁ + x₂ + … + xₙ) / n"}
    result["analysis_id"] = _save(db, user, "mean", payload.title or "Media aritmética",
                                  {"values": payload.values}, result)
    return result


@router.post("/statistics/median")
def stat_median(payload: ValuesIn, db: Session = Depends(get_db), user: User = Depends(ANALYST)):
    value = _stat_call(engine.median, payload.values)
    result = {"n": len(payload.values), "median": round(value, 4),
              "sorted": sorted(payload.values)[:200]}
    result["analysis_id"] = _save(db, user, "median", payload.title or "Mediana",
                                  {"values": payload.values}, result)
    return result


@router.post("/statistics/compare")
def stat_compare(payload: ValuesIn, db: Session = Depends(get_db), user: User = Depends(ANALYST)):
    result = _stat_call(engine.compare_mean_median, payload.values)
    result["variable"] = engine.classify_variable(payload.values)
    result["analysis_id"] = _save(db, user, "compare", payload.title or "Media vs. mediana",
                                  {"values": payload.values}, result)
    return result


@router.post("/random-variables/analyze")
def analyze_random_variable(payload: RandomVarIn, db: Session = Depends(get_db), user: User = Depends(ANALYST)):
    result = _stat_call(engine.random_variable_analysis, payload.values, payload.threshold)
    result["analysis_id"] = _save(db, user, "random_variable", payload.title or "Variable aleatoria",
                                  {"values": payload.values, "threshold": payload.threshold}, result)
    return result


@router.post("/probability/simple")
def probability_simple(payload: SimpleProbIn, db: Session = Depends(get_db), user: User = Depends(ANALYST)):
    result = _stat_call(engine.simple_probability, payload.favorable, payload.total)
    result["analysis_id"] = _save(db, user, "probability", "Probabilidad simple", payload.model_dump(), result)
    return result


@router.post("/probability/bayes")
def probability_bayes(payload: BayesIn, db: Session = Depends(get_db), user: User = Depends(ANALYST)):
    result = _stat_call(engine.bayes, payload.p_a, payload.p_b_given_a, payload.p_b_given_not_a, payload.p_b)
    result["analysis_id"] = _save(db, user, "bayes", payload.title or "Teorema de Bayes",
                                  payload.model_dump(exclude={"title"}), result)
    return result


@router.get("/analyses", response_model=list[AnalysisOut])
def analysis_history(kind: str | None = None, limit: int = 50, db: Session = Depends(get_db),
                     _: User = Depends(ANALYST)):
    stmt = select(StatisticalAnalysis).order_by(StatisticalAnalysis.id.desc()).limit(min(limit, 200))
    if kind:
        stmt = stmt.where(StatisticalAnalysis.kind == kind)
    return db.scalars(stmt).all()
