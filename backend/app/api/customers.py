from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models import Customer, Sale, User
from ..schemas import CustomerIn, CustomerOut
from .deps import audit, get_current_user, require_roles

router = APIRouter(prefix="/customers", tags=["Clientes"])


@router.get("", response_model=list[CustomerOut])
def list_customers(q: str | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    stmt = select(Customer).where(Customer.active.is_(True)).order_by(Customer.name)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Customer.name.ilike(like), Customer.document.ilike(like), Customer.email.ilike(like)))
    return db.scalars(stmt).all()


@router.post("", response_model=CustomerOut, status_code=201)
def create_customer(payload: CustomerIn, db: Session = Depends(get_db),
                    user: User = Depends(require_roles("gerente", "vendedor"))):
    customer = Customer(**payload.model_dump())
    db.add(customer)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Ya existe un cliente con ese documento")
    audit(db, user, "crear_cliente", "customer", customer.id, customer.name)
    db.commit()
    return customer


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: int, payload: CustomerIn, db: Session = Depends(get_db),
                    user: User = Depends(require_roles("gerente", "vendedor"))):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(404, "Cliente no encontrado")
    for k, v in payload.model_dump().items():
        setattr(customer, k, v)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Ya existe un cliente con ese documento")
    audit(db, user, "editar_cliente", "customer", customer.id, customer.name)
    db.commit()
    return customer


@router.delete("/{customer_id}", status_code=204)
def deactivate_customer(customer_id: int, db: Session = Depends(get_db),
                        user: User = Depends(require_roles("gerente"))):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(404, "Cliente no encontrado")
    customer.active = False
    audit(db, user, "desactivar_cliente", "customer", customer.id, customer.name)
    db.commit()


@router.get("/{customer_id}/history")
def customer_history(customer_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(404, "Cliente no encontrado")
    sales = db.scalars(select(Sale).where(Sale.customer_id == customer_id, Sale.status == "pagada")
                       .order_by(Sale.created_at.desc())).all()
    totals = [s.total for s in sales]
    return {
        "customer": CustomerOut.model_validate(customer),
        "purchases": len(sales),
        "total_spent": round(sum(totals), 2),
        "average_ticket": round(sum(totals) / len(totals), 2) if totals else 0,
        "sales": [{"id": s.id, "total": s.total, "created_at": s.created_at} for s in sales[:50]],
    }
