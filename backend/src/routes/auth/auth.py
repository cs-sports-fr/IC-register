import os
from dataclasses import dataclass
from datetime import timedelta
from typing import Annotated, Set

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from prisma.types import UserWhereInput, UserUpdateInput

from .utils import (  # type: ignore
    check_token,
    create_access_token,
    verify_password,
    get_password_hash,
    send_reset_password_email,
    generate_password,
)


from infra.prisma import getPrisma  # type: ignore

auth_router = APIRouter(tags=["auth"])

prisma = getPrisma()


@dataclass
class Credentials:
    username: str = ""
    password: str = ""


class Token(BaseModel):
    access_token: str
    token_type: str


validStates: Set[str] = set()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


@auth_router.post("/login", response_model=Token)
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    username = form_data.username
    password = form_data.password

    current_user = await prisma.user.find_unique(
        where=UserWhereInput(email=username)
    )

    if not verify_password(password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "status": status.HTTP_401_UNAUTHORIZED,
                "message": "Incorrect username or password",
            },
        )

    token = create_access_token(
        data={
            "username": username,
            "permission": current_user.status,
            "id": current_user.id,
            "sport": current_user.sportAdminId,
        },
        expires_delta=timedelta(days=4),
    )
    return Token(access_token=token, token_type="bearer")


@auth_router.get("/username")
def username(username: Annotated[str, Depends(check_token)]) -> str:
    return username


@auth_router.get("/verify-auth")
def verify_auth(requiresAuth: Annotated[None, Depends(check_token)]) -> bool:
    """
    Return success if the user is well authenticated. Returns with a 401 status
    if not.
    """
    return True


@auth_router.post("/password-reset-request")
async def password_reset(email: str):
    user = await prisma.user.find_unique(where=UserWhereInput(email=email))
    if user is None:
        raise HTTPException(
            status_code=400, detail="Cannot find the requested user"
        )

    new_password = generate_password()

    url = f"{FRONTEND_URL}/profile"
    await send_reset_password_email(
        user.email, user.firstname, new_password, url
    )

    await prisma.user.update(
        where=UserWhereInput(email=email),
        data=UserUpdateInput(
            password=get_password_hash(new_password),
        ),
    )
