from jose import JWTError,jwt
from datetime import datetime,timedelta,timezone
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends,HTTPException,status
from app.database import get_db
from sqlalchemy.orm import Session
from app.models import User
from app.models.user import UserRole
from config import settings

SECRET_KEY = settings.SECRET_KEY
EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
ALGORITHM = settings.ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
_revoked_tokens: dict[str, datetime] = {}


def _drop_expired_revoked_tokens() -> None:
    now = datetime.now(timezone.utc)
    expired = [token for token, expires_at in _revoked_tokens.items() if expires_at <= now]
    for token in expired:
        _revoked_tokens.pop(token, None)


def revoke_token(token: str) -> None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        expires_at = datetime.fromtimestamp(payload["exp"], timezone.utc)
    except (JWTError, KeyError, TypeError, ValueError):
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)

    _revoked_tokens[token] = expires_at


def is_token_revoked(token: str) -> bool:
    _drop_expired_revoked_tokens()
    return token in _revoked_tokens

def create_token(user_id : int) -> str :
    payload = {
        "sub" : str(user_id),
        "exp" : datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)
    }
    return jwt.encode(payload,SECRET_KEY,algorithm=ALGORITHM)

def decode_token(token : str = Depends(oauth2_scheme)) -> int:
    if is_token_revoked(token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Token revoked")

    try : 
        payload = jwt.decode(token,SECRET_KEY,algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Invalid Token")
        return int(user_id)

    except JWTError :
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail= "Invalid Token")
    
def get_current_user(
        user_id : int = Depends(decode_token),
        db : Session = Depends(get_db)
) -> User :
    user = db.query(User).filter(User.id==user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="User not found")
    return user

def get_admin_user(
        current_user : User = Depends(get_current_user)
    ) -> User :
    if current_user.role != UserRole.admin :
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="Just for Admin")
    return current_user 
