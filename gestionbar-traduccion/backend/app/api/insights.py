"""Insights determinísticos: cada conclusión muestra la evidencia numérica que la origina."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models import Insight, Product, Sale, User
from ..schemas import InsightOut
from ..statistics import engine
from .deps import audit, get_current_user, require_roles

router = APIRouter(prefix="/insights", tags=["Hallazgos"])


def build_insights(db: Session) -> list[dict]:
    now = datetime.utcnow()
    sales = list(db.scalars(select(Sale).where(Sale.status == "pagada",
                                               Sale.created_at >= now - timedelta(days=90))).all())
    out: list[dict] = []
    totals = [s.total for s in sales]

    # Regla 1: media vs. mediana del ticket
    if len(totals) >= 10:
        cmp = engine.compare_mean_median(totals)
        if abs(cmp["difference_pct"]) > 15:
            out.append({
                "rule": "media_vs_mediana", "severity": "atencion",
                "title": "La venta promedio no representa la venta típica",
                "message": (f"La media (S/ {cmp['mean']:.2f}) y la mediana (S/ {cmp['median']:.2f}) difieren "
                            f"{cmp['difference_pct']:+.1f}%. {cmp['reading']}"),
                "evidence": cmp})
        else:
            out.append({
                "rule": "media_vs_mediana", "severity": "info",
                "title": "La venta promedio es representativa",
                "message": (f"Media S/ {cmp['mean']:.2f} y mediana S/ {cmp['median']:.2f} están cerca "
                            f"({cmp['difference_pct']:+.1f}%): la venta típica es estable."),
                "evidence": cmp})

    # Regla 2: concentración de ingresos por producto
    revenue_by_product: dict[str, float] = {}
    for s in sales:
        for d in s.details:
            revenue_by_product[d.product.name] = revenue_by_product.get(d.product.name, 0) + d.line_total
    total_rev = sum(revenue_by_product.values())
    if total_rev:
        name, rev = max(revenue_by_product.items(), key=lambda kv: kv[1])
        share = rev / total_rev * 100
        if share >= 30:
            out.append({
                "rule": "concentracion_producto", "severity": "atencion",
                "title": f"Alta dependencia de «{name}»",
                "message": f"«{name}» genera {share:.1f}% de los ingresos de los últimos 90 días.",
                "evidence": {"product": name, "revenue": round(rev, 2), "share_pct": round(share, 1),
                             "total_revenue": round(total_rev, 2)}})

    # Regla 3: stock bajo
    low = db.scalars(select(Product).where(Product.active.is_(True), Product.stock <= Product.min_stock)).all()
    if low:
        out.append({
            "rule": "stock_bajo", "severity": "alerta",
            "title": f"{len(low)} producto(s) con existencias bajas",
            "message": "Reponer: " + ", ".join(f"{p.name} ({p.stock}/{p.min_stock})" for p in low[:8]),
            "evidence": {"products": [{"name": p.name, "stock": p.stock, "min_stock": p.min_stock} for p in low]}})

    # Regla 4: tendencia semanal
    last7 = sum(s.total for s in sales if s.created_at >= now - timedelta(days=7))
    prev7 = sum(s.total for s in sales if now - timedelta(days=14) <= s.created_at < now - timedelta(days=7))
    if prev7 > 0:
        change = (last7 - prev7) / prev7 * 100
        if abs(change) >= 10:
            out.append({
                "rule": "tendencia_semanal", "severity": "info" if change > 0 else "atencion",
                "title": "Ventas en alza esta semana" if change > 0 else "Ventas a la baja esta semana",
                "message": f"Los últimos 7 días suman S/ {last7:.2f} frente a S/ {prev7:.2f} de la semana previa ({change:+.1f}%).",
                "evidence": {"last_7_days": round(last7, 2), "previous_7_days": round(prev7, 2),
                             "change_pct": round(change, 1)}})
    return out


@router.get("", response_model=list[InsightOut])
def list_insights(limit: int = 50, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.scalars(select(Insight).order_by(Insight.id.desc()).limit(min(limit, 200))).all()


@router.post("/generate", response_model=list[InsightOut])
def generate_insights(db: Session = Depends(get_db), user: User = Depends(require_roles("gerente", "analista"))):
    rows = [Insight(**data) for data in build_insights(db)]
    db.add_all(rows)
    audit(db, user, "generar_insights", "insight", None, f"{len(rows)} hallazgos")
    db.commit()
    for r in rows:
        db.refresh(r)
    return rows
