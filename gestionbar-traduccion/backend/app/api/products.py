from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models import Category, InventoryMovement, Product, User
from ..schemas import CategoryIn, CategoryOut, ProductIn, ProductOut, StockAdjustIn
from .deps import audit, get_current_user, require_roles

router = APIRouter(tags=["Productos e inventario"])


def product_out(p: Product) -> ProductOut:
    return ProductOut(id=p.id, sku=p.sku, name=p.name, category_id=p.category_id,
                      category=p.category.name, price=p.price, stock=p.stock,
                      min_stock=p.min_stock, active=p.active)


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.scalars(select(Category).order_by(Category.name)).all()


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(payload: CategoryIn, db: Session = Depends(get_db),
                    user: User = Depends(require_roles("gerente", "almacen"))):
    if db.scalar(select(Category).where(Category.name == payload.name)):
        raise HTTPException(409, "La categoría ya existe")
    cat = Category(name=payload.name)
    db.add(cat)
    db.flush()
    audit(db, user, "crear_categoria", "category", cat.id, cat.name)
    db.commit()
    return cat


@router.get("/products", response_model=list[ProductOut])
def list_products(q: str | None = None, category_id: int | None = None, low_stock: bool = False,
                  db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    stmt = select(Product).where(Product.active.is_(True)).order_by(Product.name)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if low_stock:
        stmt = stmt.where(Product.stock <= Product.min_stock)
    return [product_out(p) for p in db.scalars(stmt).all()]


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(payload: ProductIn, db: Session = Depends(get_db),
                   user: User = Depends(require_roles("gerente", "almacen"))):
    if not db.get(Category, payload.category_id):
        raise HTTPException(404, "Categoría no encontrada")
    product = Product(**payload.model_dump())
    db.add(product)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Ya existe un producto con ese código")
    if product.stock:
        db.add(InventoryMovement(product_id=product.id, kind="entrada", quantity=product.stock,
                                 reference="existencias iniciales", user_id=user.id))
    audit(db, user, "crear_producto", "product", product.id, product.name)
    db.commit()
    return product_out(product)


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductIn, db: Session = Depends(get_db),
                   user: User = Depends(require_roles("gerente", "almacen"))):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Producto no encontrado")
    if not db.get(Category, payload.category_id):
        raise HTTPException(404, "Categoría no encontrada")
    data = payload.model_dump(exclude={"stock"})  # el stock solo cambia por movimientos
    for k, v in data.items():
        setattr(product, k, v)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Ya existe un producto con ese código")
    audit(db, user, "editar_producto", "product", product.id, product.name)
    db.commit()
    return product_out(product)


@router.delete("/products/{product_id}", status_code=204)
def deactivate_product(product_id: int, db: Session = Depends(get_db),
                       user: User = Depends(require_roles("gerente"))):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Producto no encontrado")
    product.active = False
    audit(db, user, "desactivar_producto", "product", product.id, product.name)
    db.commit()


@router.get("/inventory/movements")
def list_movements(product_id: int | None = None, limit: int = 100, db: Session = Depends(get_db),
                   _: User = Depends(require_roles("gerente", "almacen", "analista"))):
    stmt = select(InventoryMovement).order_by(InventoryMovement.id.desc()).limit(min(limit, 500))
    if product_id:
        stmt = stmt.where(InventoryMovement.product_id == product_id)
    return [{"id": m.id, "product": m.product.name, "kind": m.kind, "quantity": m.quantity,
             "reference": m.reference, "created_at": m.created_at} for m in db.scalars(stmt).all()]


@router.post("/inventory/adjust", response_model=ProductOut)
def adjust_stock(payload: StockAdjustIn, db: Session = Depends(get_db),
                 user: User = Depends(require_roles("almacen", "gerente"))):
    product = db.get(Product, payload.product_id)
    if not product:
        raise HTTPException(404, "Producto no encontrado")
    if payload.kind == "entrada" and payload.quantity <= 0:
        raise HTTPException(422, "Una entrada debe ser mayor que 0")
    if payload.quantity == 0:
        raise HTTPException(422, "La cantidad no puede ser 0")
    new_stock = product.stock + payload.quantity
    if new_stock < 0:
        raise HTTPException(400, "El ajuste dejaría las existencias en negativo")
    product.stock = new_stock
    db.add(InventoryMovement(product_id=product.id, kind=payload.kind, quantity=payload.quantity,
                             reference=payload.reference, user_id=user.id))
    audit(db, user, "ajuste_inventario", "product", product.id,
          f"{payload.kind} {payload.quantity:+d} → existencias {new_stock}")
    db.commit()
    return product_out(product)
