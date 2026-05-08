from fastapi import APIRouter,HTTPException,status,Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas.user import UserRegister,TokenResponse,UserLogin
from passlib.context import CryptContext
from app.utils.auth_helper import create_token,get_current_user

router = APIRouter(prefix="/auth",tags=["Auth"])
pwd_context = CryptContext(schemes=["bcrypt"])

@router.post("/register",response_model=TokenResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):

    existing = db.query(User).filter(User.email == user_data.email).first()

    if existing :
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Email Used")
    
    password_hash = pwd_context.hash(user_data.password)

    user = User(
        name = user_data.name,
        email = user_data.email,
        password_hash = password_hash,
        phone = user_data.phone,
        address=user_data.address
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user.id)
    return TokenResponse(access_token=token)

@router.post("/login",response_model=TokenResponse)
def login(user_data : UserLogin , db : Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if not existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Email Not Found")
    if not pwd_context.verify(user_data.password, existing.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Wrong Password")
    token = create_token(existing.id)
    return TokenResponse(access_token=token)

@router.post("/logout")
def logout(current_user : User = Depends(get_current_user)):
    return {"message" : "Logged out successfully"}