from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import decode_token
from ..models import AuditLog, User

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/form-login")


def get_current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    err = HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida o expirada",
                        headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = decode_token(token)
        user = db.get(User, int(payload["sub"]))
    except Exception:
        raise err
    if not user or not user.active:
        raise err
    return user


def require_roles(*roles: str):
    """Permite el acceso solo a los roles indicados (el admin siempre puede)."""
    allowed = set(roles) | {"admin"}

    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para esta acción")
        return user

    return checker


def audit(db: Session, user: User | None, action: str, entity: str,
          entity_id: int | None = None, detail: str | None = None) -> None:
    db.add(AuditLog(user_id=user.id if user else None, action=action, entity=entity,
                    entity_id=entity_id, detail=detail))
