from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.database import get_db
from ..models import Customer, InventoryMovement, Payment, Product, Sale, SaleDetail, User
from ..schemas import SaleCreate
from .deps import audit, get_current_user, require_roles

router = APIRouter(prefix="/sales", tags=["Ventas"])


def sale_out(s: Sale, with_details: bool = True) -> dict:
    out = {
        "id": s.id, "customer_id": s.customer_id, "customer": s.customer.name,
        "seller_id": s.seller_id, "seller": s.seller.name, "status": s.status,
        "subtotal": s.subtotal, "discount": s.discount, "tax": s.tax, "total": s.total,
        "payment_method": s.payments[0].method if s.payments else None,
        "items_count": sum(d.quantity for d in s.details),
        "created_at": s.created_at,
    }
    if with_details:
        out["details"] = [{"product_id": d.product_id, "product": d.product.name, "sku": d.product.sku,
                           "quantity": d.quantity, "unit_price": d.unit_price, "line_total": d.line_total}
                          for d in s.details]
    return out


@router.post("", status_code=201)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db),
                user: User = Depends(require_roles("gerente", "vendedor"))):
    customer = db.get(Customer, payload.customer_id)
    if not customer or not customer.active:
        raise HTTPException(404, "Cliente no encontrado")

    # Fusionar líneas repetidas del mismo producto
    merged: dict[int, int] = {}
    for item in payload.items:
        merged[item.product_id] = merged.get(item.product_id, 0) + item.quantity

    sale = Sale(customer_id=customer.id, seller_id=user.id, status="pagada",
                subtotal=0, discount=0, tax=0, total=0)
    subtotal = 0.0
    for product_id, qty in merged.items():
        product = db.get(Product, product_id)
        if not product or not product.active:
            raise HTTPException(404, f"Producto {product_id} no encontrado")
        if product.stock < qty:
            raise HTTPException(400, f"Existencias insuficientes de «{product.name}» "
                                     f"(disponible: {product.stock}, pedido: {qty})")
        line = round(product.price * qty, 2)
        subtotal += line
        sale.details.append(SaleDetail(product_id=product.id, quantity=qty,
                                       unit_price=product.price, line_total=line))
        product.stock -= qty
        db.add(InventoryMovement(product_id=product.id, kind="salida", quantity=-qty,
                                 reference="venta", user_id=user.id))

    subtotal = round(subtotal, 2)
    discount = round(subtotal * payload.discount_pct / 100, 2)
    base = subtotal - discount
    tax = round(base * settings.TAX_RATE, 2)
    total = round(base + tax, 2)
    sale.subtotal, sale.discount, sale.tax, sale.total = subtotal, discount, tax, total
    sale.payments.append(Payment(method=payload.payment_method, amount=total))
    db.add(sale)
    db.flush()
    audit(db, user, "registrar_venta", "sale", sale.id, f"total {total:.2f} · {customer.name}")
    db.commit()
    db.refresh(sale)
    return sale_out(sale)


@router.get("")
def list_sales(date_from: datetime | None = None, date_to: datetime | None = None,
               customer_id: int | None = None, seller_id: int | None = None, limit: int = 200,
               db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Sale).order_by(Sale.created_at.desc()).limit(min(limit, 1000))
    if user.role == "vendedor":
        stmt = stmt.where(Sale.seller_id == user.id)  # el vendedor solo ve sus ventas
    elif seller_id:
        stmt = stmt.where(Sale.seller_id == seller_id)
    if date_from:
        stmt = stmt.where(Sale.created_at >= date_from)
    if date_to:
        stmt = stmt.where(Sale.created_at <= date_to)
    if customer_id:
        stmt = stmt.where(Sale.customer_id == customer_id)
    return [sale_out(s, with_details=False) for s in db.scalars(stmt).all()]


@router.get("/{sale_id}")
def get_sale(sale_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sale = db.get(Sale, sale_id)
    if not sale or (user.role == "vendedor" and sale.seller_id != user.id):
        raise HTTPException(404, "Venta no encontrada")
    return sale_out(sale)


@router.post("/{sale_id}/cancel")
def cancel_sale(sale_id: int, db: Session = Depends(get_db),
                user: User = Depends(require_roles("gerente"))):
    sale = db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(404, "Venta no encontrada")
    if sale.status == "anulada":
        raise HTTPException(400, "La venta ya está anulada")
    sale.status = "anulada"
    for d in sale.details:  # devolver stock
        d.product.stock += d.quantity
        db.add(InventoryMovement(product_id=d.product_id, kind="entrada", quantity=d.quantity,
                                 reference=f"anulación venta #{sale.id}", user_id=user.id))
    audit(db, user, "anular_venta", "sale", sale.id, f"total {sale.total:.2f}")
    db.commit()
    db.refresh(sale)
    return sale_out(sale)
