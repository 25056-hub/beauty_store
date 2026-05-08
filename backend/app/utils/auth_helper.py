from jose import JWTError,jwt
from datetime import datetime,timedelta,timezone
import os
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends,HTTPException,status
from app.database import get_db
from sqlalchemy.orm import Session
from app.models import User
from app.models.user import UserRole

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
ALGORITHM = os.getenv("JWT_ALGORITHM")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def create_token(user_id : int) -> str :
    payload = {
        "sub" : str(user_id),
        "exp" : datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)
    }
    return jwt.encode(payload,SECRET_KEY,algorithm=[ALGORITHM])

def decode_token(token : str = Depends(oauth2_scheme)) -> int:
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