from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal["admin", "gerente", "vendedor", "analista", "almacen"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth / usuarios ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserOut(ORM):
    id: int
    name: str
    email: str
    role: str
    active: bool


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6)
    role: Role


class ProfileIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class PasswordChangeIn(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Clientes ----------
class CustomerIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    document: str | None = Field(default=None, max_length=30)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)
    city: str | None = Field(default=None, max_length=80)


class CustomerOut(ORM):
    id: int
    name: str
    document: str | None
    email: str | None
    phone: str | None
    city: str | None
    active: bool


# ---------- Productos ----------
class CategoryIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)


class CategoryOut(ORM):
    id: int
    name: str


class ProductIn(BaseModel):
    sku: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=2, max_length=160)
    category_id: int
    price: float = Field(gt=0)
    stock: int = Field(default=0, ge=0)
    min_stock: int = Field(default=5, ge=0)


class ProductOut(BaseModel):
    id: int
    sku: str
    name: str
    category_id: int
    category: str
    price: float
    stock: int
    min_stock: int
    active: bool


# ---------- Ventas ----------
class SaleItemIn(BaseModel):
    product_id: int
    quantity: int = Field(gt=0, le=10000)


class SaleCreate(BaseModel):
    customer_id: int
    items: list[SaleItemIn] = Field(min_length=1)
    discount_pct: float = Field(default=0, ge=0, le=100)
    payment_method: Literal["efectivo", "tarjeta", "transferencia", "yape"] = "efectivo"


# ---------- Inventario ----------
class StockAdjustIn(BaseModel):
    product_id: int
    kind: Literal["entrada", "ajuste"]
    quantity: int
    reference: str | None = Field(default=None, max_length=80)


# ---------- Estadística ----------
class ValuesIn(BaseModel):
    values: list[float] = Field(min_length=1, max_length=100000)
    title: str | None = Field(default=None, max_length=200)


class RandomVarIn(ValuesIn):
    threshold: float | None = None


class SimpleProbIn(BaseModel):
    favorable: int
    total: int


class BayesIn(BaseModel):
    p_a: float
    p_b_given_a: float
    p_b_given_not_a: float | None = None
    p_b: float | None = None
    title: str | None = Field(default=None, max_length=200)


class AnalysisOut(ORM):
    id: int
    kind: str
    title: str
    input_data: dict
    result: dict
    created_at: datetime


class InsightOut(ORM):
    id: int
    rule: str
    severity: str
    title: str
    message: str
    evidence: dict
    created_at: datetime
