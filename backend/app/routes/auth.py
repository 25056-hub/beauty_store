from time import monotonic

import bcrypt
from fastapi import APIRouter,HTTPException,status,Depends
from sqlalchemy.orm import joinedload
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.models.user import UserRole
from app.schemas.user import AdminUserResponse,UserRegister,TokenResponse,UserLogin,UserResponse,UserUpdate,UserPasswordUpdate,UserRoleUpdate
from app.utils.auth_helper import create_token,get_admin_user,get_current_user,oauth2_scheme,revoke_token

router = APIRouter(prefix="/api/auth",tags=["Auth"])
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_ATTEMPTS = 5
_auth_attempts: dict[tuple[str, str], list[float]] = {}


def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "phone": user.phone,
        "address": user.address,
        "created_at": user.created_at,
    }


def _check_rate_limit(action: str, identifier: str) -> None:
    now = monotonic()
    key = (action, identifier.lower())
    attempts = [
        attempt
        for attempt in _auth_attempts.get(key, [])
        if now - attempt < RATE_LIMIT_WINDOW_SECONDS
    ]

    if len(attempts) >= RATE_LIMIT_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Try again later"
        )

    attempts.append(now)
    _auth_attempts[key] = attempts


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False

@router.post("/register",response_model=TokenResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    _check_rate_limit("register", user_data.email)

    existing = db.query(User).filter(User.email == user_data.email).first()

    if existing :
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Email Used")
    
    password_hash = hash_password(user_data.password)

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
    _check_rate_limit("login", user_data.email)

    existing = db.query(User).filter(User.email == user_data.email).first()
    if not existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Invalid email or password")
    if not verify_password(user_data.password, existing.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Invalid email or password")
    token = create_token(existing.id)
    return TokenResponse(access_token=token)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return _serialize_user(current_user)

@router.put("/me", response_model=UserResponse)
def update_me(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if "name" in user_data.model_fields_set and user_data.name is not None:
        current_user.name = user_data.name
    if "phone" in user_data.model_fields_set:
        current_user.phone = user_data.phone
    if "address" in user_data.model_fields_set:
        current_user.address = user_data.address

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return _serialize_user(current_user)

@router.put("/me/password")
def update_my_password(
    password_data: UserPasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    current_user.password_hash = hash_password(password_data.new_password)

    db.add(current_user)
    db.commit()

    return {"message": "Password updated successfully"}

@router.get("/admin/users", response_model=list[AdminUserResponse])
def get_admin_users(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    users = (
        db.query(User)
        .options(joinedload(User.orders))
        .order_by(User.created_at.desc())
        .all()
    )

    return [
        {
            **_serialize_user(user),
            "orders_count": len(user.orders),
        }
        for user in users
    ]

@router.put("/admin/users/{user_id}/role", response_model=AdminUserResponse)
def update_admin_user_role(
    user_id: int,
    role_data: UserRoleUpdate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.id == admin_user.id and role_data.role != UserRole.admin.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin role"
        )

    user.role = UserRole(role_data.role)
    db.commit()
    db.refresh(user)

    return {
        **_serialize_user(user),
        "orders_count": len(user.orders),
    }

@router.post("/logout")
def logout(
    token: str = Depends(oauth2_scheme),
    current_user : User = Depends(get_current_user)
):
    revoke_token(token)
    return {"message" : "Logged out successfully"}
