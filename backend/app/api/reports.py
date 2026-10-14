from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models import Customer, Product, Sale, StatisticalAnalysis, User
from ..statistics import engine
from .deps import require_roles

router = APIRouter(prefix="/reports", tags=["Reportes"])
READERS = require_roles("gerente", "analista")

KINDS = {
    "ventas": "Reporte de ventas",
    "estadistico": "Reporte estadístico",
    "productos": "Reporte de productos",
    "clientes": "Reporte de clientes",
    "vendedores": "Reporte de vendedores",
}


@router.get("")
def list_reports(_: User = Depends(READERS)):
    return [{"kind": k, "title": v} for k, v in KINDS.items()]


@router.get("/{kind}")
def build_report(kind: str, days: int = 30, db: Session = Depends(get_db), _: User = Depends(READERS)):
    if kind not in KINDS:
        raise HTTPException(404, "Reporte no existe")
    since = datetime.utcnow() - timedelta(days=days)
    sales = list(db.scalars(select(Sale).where(Sale.status == "pagada", Sale.created_at >= since)
                            .order_by(Sale.created_at.desc())).all())
    summary: dict = {}

    if kind == "ventas":
        columns = ["ID", "Fecha", "Cliente", "Vendedor", "Pago", "Subtotal", "Descuento", "IGV", "Total"]
        rows = [[s.id, s.created_at.strftime("%Y-%m-%d %H:%M"), s.customer.name, s.seller.name,
                 s.payments[0].method if s.payments else "", s.subtotal, s.discount, s.tax, s.total]
                for s in sales]
        summary = {"ventas": len(sales), "ingresos": round(sum(s.total for s in sales), 2)}

    elif kind == "estadistico":
        totals = [s.total for s in sales]
        columns = ["Métrica", "Valor"]
        rows = []
        if totals:
            cmp = engine.compare_mean_median(totals)
            rv = engine.random_variable_analysis(totals)
            rows = [["Observaciones (n)", cmp["n"]], ["Media (venta promedio)", cmp["mean"]],
                    ["Mediana", cmp["median"]], ["Diferencia media − mediana", cmp["difference"]],
                    ["Forma de la distribución", cmp["shape"]], ["Varianza", rv["variance"]],
                    ["Desviación estándar", rv["std_dev"]], ["Mínimo", rv["min"]], ["Máximo", rv["max"]]]
            summary = {"lectura": cmp["reading"]}
        analyses = db.scalars(select(StatisticalAnalysis).order_by(StatisticalAnalysis.id.desc()).limit(10)).all()
        summary["analisis_guardados"] = len(analyses)

    elif kind == "productos":
        acc: dict[str, dict] = {}
        for s in sales:
            for d in s.details:
                a = acc.setdefault(d.product.name, {"sku": d.product.sku, "qty": 0, "rev": 0.0})
                a["qty"] += d.quantity
                a["rev"] += d.line_total
        stock = {p.name: p.stock for p in db.scalars(select(Product).where(Product.active.is_(True))).all()}
        columns = ["Producto", "Código", "Unidades vendidas", "Ingresos", "Existencias actuales"]
        rows = [[n, a["sku"], a["qty"], round(a["rev"], 2), stock.get(n, 0)]
                for n, a in sorted(acc.items(), key=lambda kv: -kv[1]["rev"])]

    elif kind == "clientes":
        acc = {}
        for s in sales:
            a = acc.setdefault(s.customer.name, {"n": 0, "total": 0.0})
            a["n"] += 1
            a["total"] += s.total
        columns = ["Cliente", "Compras", "Total gastado", "Venta promedio"]
        rows = [[n, a["n"], round(a["total"], 2), round(a["total"] / a["n"], 2)]
                for n, a in sorted(acc.items(), key=lambda kv: -kv[1]["total"])]

    else:  # vendedores
        acc = {}
        for s in sales:
            a = acc.setdefault(s.seller.name, {"n": 0, "total": 0.0})
            a["n"] += 1
            a["total"] += s.total
        columns = ["Vendedor", "Ventas", "Ingresos", "Promedio por venta"]
        rows = [[n, a["n"], round(a["total"], 2), round(a["total"] / a["n"], 2)]
                for n, a in sorted(acc.items(), key=lambda kv: -kv[1]["total"])]

    return {"kind": kind, "title": KINDS[kind], "days": days, "generated_at": datetime.utcnow(),
            "columns": columns, "rows": rows, "summary": summary}
