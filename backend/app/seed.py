"""Datos semilla para demostración. Se ejecuta solo si la base está vacía."""
import random
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .core.config import settings
from .core.security import hash_password
from .models import (Category, Customer, InventoryMovement, Payment, Product, Sale, SaleDetail, User)

USERS = [
    ("Administrador", "admin@salesia.com", "admin123", "admin"),
    ("Gerente General", "gerente@salesia.com", "gerente123", "gerente"),
    ("Valeria Rojas", "vendedor@salesia.com", "vendedor123", "vendedor"),
    ("Diego Paredes", "diego@salesia.com", "vendedor123", "vendedor"),
    ("Camila Quispe", "camila@salesia.com", "vendedor123", "vendedor"),
    ("Analista de Datos", "analista@salesia.com", "analista123", "analista"),
    ("Encargado de Almacén", "almacen@salesia.com", "almacen123", "almacen"),
]

CATALOG = {
    "Tecnología": [("TEC-001", "Laptop Pro 14\"", 3200, 25), ("TEC-002", "Monitor 27\" 4K", 1250, 30),
                   ("TEC-003", "Teclado mecánico", 220, 60), ("TEC-004", "Mouse inalámbrico", 85, 120),
                   ("TEC-005", "Audífonos Bluetooth", 180, 80)],
    "Oficina": [("OFI-001", "Silla ergonómica", 640, 40), ("OFI-002", "Escritorio ajustable", 980, 20),
                ("OFI-003", "Resma de papel A4", 24, 400), ("OFI-004", "Set de bolígrafos", 12, 500)],
    "Hogar": [("HOG-001", "Licuadora 1.5L", 190, 70), ("HOG-002", "Hervidor eléctrico", 95, 90),
              ("HOG-003", "Juego de sábanas", 150, 60), ("HOG-004", "Lámpara LED de mesa", 75, 100)],
    "Papelería": [("PAP-001", "Cuaderno A4 cuadriculado", 9, 600), ("PAP-002", "Marcadores x12", 28, 300),
                  ("PAP-003", "Agenda 2026", 45, 150)],
}

CUSTOMERS = ["Comercial Andina SAC", "Inversiones Pacífico", "Ferretería El Roble", "Colegio San Marcos",
             "Estudio Contable Vega", "Clínica Santa Elena", "Panadería La Espiga", "Consultora Nexo",
             "Hotel Mirador", "Tecnoservicios Lima", "María Fernanda Ruiz", "Jorge Salazar",
             "Lucía Mendoza", "Carlos Huamán", "Ana Torres", "Restaurante Sabor Criollo",
             "Distribuidora Norte", "Agencia Creativa Sol", "Gimnasio Fuerza Viva", "Librería Pluma"]


def _seed_demo(db: Session) -> None:
    rng = random.Random(42)

    users = [User(name=n, email=e, password_hash=hash_password(p), role=r) for n, e, p, r in USERS]
    db.add_all(users)

    products: list[Product] = []
    for cat_name, items in CATALOG.items():
        cat = Category(name=cat_name)
        db.add(cat)
        db.flush()
        for sku, name, price, stock in items:
            p = Product(sku=sku, name=name, category_id=cat.id, price=price, stock=stock * 3,
                        min_stock=max(5, stock // 5))
            db.add(p)
            products.append(p)

    customers = []
    for i, name in enumerate(CUSTOMERS):
        c = Customer(name=name, document=f"{20100000000 + i * 137}" if i < 10 else f"{40000000 + i * 311}",
                     email=f"contacto{i}@ejemplo.pe", phone=f"9{rng.randint(10000000, 99999999)}", city="Lima")
        db.add(c)
        customers.append(c)
    db.flush()

    sellers = [u for u in users if u.role == "vendedor"]
    cheap = [p for p in products if p.price < 100]
    mid = [p for p in products if 100 <= p.price < 700]
    pricey = [p for p in products if p.price >= 700]
    now = datetime.utcnow()

    for _ in range(180):
        roll = rng.random()
        pool = cheap if roll < 0.55 else mid if roll < 0.9 else pricey  # ventas sesgadas: pocas muy grandes
        picked = rng.sample(pool, k=min(len(pool), rng.choice([1, 1, 2, 3])))
        sale = Sale(customer_id=rng.choice(customers).id, seller_id=rng.choice(sellers).id,
                    status="pagada", subtotal=0, discount=0, tax=0, total=0,
                    created_at=now - timedelta(days=rng.random() * 85, hours=rng.random() * 8))
        subtotal = 0.0
        for p in picked:
            qty = rng.choice([1, 1, 2, 3, 5]) if p.price < 100 else rng.choice([1, 1, 1, 2])
            qty = min(qty, p.stock)
            if qty <= 0:
                continue
            line = round(p.price * qty, 2)
            subtotal += line
            sale.details.append(SaleDetail(product_id=p.id, quantity=qty, unit_price=p.price, line_total=line))
            p.stock -= qty
            db.add(InventoryMovement(product_id=p.id, kind="salida", quantity=-qty, reference="venta",
                                     created_at=sale.created_at))
        if not sale.details:
            continue
        discount = round(subtotal * rng.choice([0, 0, 0, 0.05, 0.1]), 2)
        base = subtotal - discount
        tax = round(base * settings.TAX_RATE, 2)
        sale.subtotal, sale.discount, sale.tax = round(subtotal, 2), discount, tax
        sale.total = round(base + tax, 2)
        sale.payments.append(Payment(method=rng.choice(["efectivo", "tarjeta", "transferencia", "yape"]),
                                     amount=sale.total))
        db.add(sale)

    # Un par de productos con stock bajo para que el insight tenga evidencia
    for p in products[:2]:
        p.stock = min(p.stock, p.min_stock - 1)
    db.commit()


# Cuenta del propietario. Es administrador: el rol admin ya incluye todos los permisos de gerente.
OWNER = {"name": "Joaquín", "email": "joaquinoh@salesia.com", "password": "animacion123"}


def ensure_owner(db: Session) -> None:
    """Crea la cuenta del propietario si no existe (también en bases que ya tenían datos)."""
    user = db.scalar(select(User).where(User.email == OWNER["email"]))
    if user is None:
        db.add(User(name=OWNER["name"], email=OWNER["email"],
                    password_hash=hash_password(OWNER["password"]), role="admin"))
        db.commit()
    elif user.role != "admin" or not user.active:
        user.role, user.active = "admin", True
        db.commit()


def seed(db: Session) -> None:
    if not db.scalar(select(User.id).limit(1)):
        _seed_demo(db)
    ensure_owner(db)