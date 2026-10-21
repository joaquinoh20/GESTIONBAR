from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import create_access_token, hash_password, verify_password
from ..models import AuditLog, User
from ..schemas import LoginIn, PasswordChangeIn, ProfileIn, TokenOut, UserCreate, UserOut
from .deps import audit, get_current_user, require_roles

router = APIRouter(tags=["Auth y usuarios"])


def _authenticate(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if not user or not user.active or not verify_password(password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos")
    return user


@router.post("/auth/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = _authenticate(db, payload.email, payload.password)
    audit(db, user, "login", "user", user.id)
    db.commit()
    return TokenOut(access_token=create_access_token(user.id, user.role), user=UserOut.model_validate(user))


@router.post("/auth/form-login", include_in_schema=False)
def form_login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login por formulario, solo para el botón Authorize de Swagger."""
    user = _authenticate(db, form.username, form.password)
    return {"access_token": create_access_token(user.id, user.role), "token_type": "bearer"}


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.put("/auth/me", response_model=UserOut)
def update_profile(payload: ProfileIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    user.name = payload.name.strip()
    audit(db, user, "actualizar_perfil", "user", user.id, user.name)
    db.commit()
    return user


@router.post("/auth/change-password", status_code=204)
def change_password(payload: PasswordChangeIn, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    # 400 (no 401): un 401 haría que el frontend cierre la sesión.
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(400, "La contraseña actual no es correcta")
    if payload.new_password == payload.current_password:
        raise HTTPException(400, "La nueva contraseña debe ser distinta de la actual")
    user.password_hash = hash_password(payload.new_password)
    audit(db, user, "cambiar_contrasena", "user", user.id)
    db.commit()


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_roles("gerente"))):
    return db.scalars(select(User).order_by(User.id)).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db),
                admin: User = Depends(require_roles("gerente"))):
    # El gerente solo crea cuentas operativas; administrador y gerente los crea el administrador.
    if admin.role != "admin" and payload.role in ("admin", "gerente"):
        raise HTTPException(403, "Solo el administrador puede crear cuentas de administrador o gerente")
    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Ya existe un usuario con ese correo")
    user = User(name=payload.name, email=email, role=payload.role,
                password_hash=hash_password(payload.password))
    db.add(user)
    db.flush()
    audit(db, admin, "crear_usuario", "user", user.id, f"{email} ({payload.role})")
    db.commit()
    return user


@router.get("/audit")
def audit_log(limit: int = 100, db: Session = Depends(get_db), _: User = Depends(require_roles("gerente"))):
    rows = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(min(limit, 500))).all()
    return [{"id": r.id, "user": r.user.name if r.user else None, "action": r.action,
             "entity": r.entity, "entity_id": r.entity_id, "detail": r.detail,
             "created_at": r.created_at} for r in rows]
