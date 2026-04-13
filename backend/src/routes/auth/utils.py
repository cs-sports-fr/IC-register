import os
import random
import string

from datetime import datetime, timedelta
from secrets import token_hex
from typing import Annotated


from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt  # type: ignore
from prisma.enums import EnumUserStatus, mailClient
from passlib.context import CryptContext  # type: ignore

from prisma.models import User
from prisma.types import UserWhereInput, UserInclude
from dotenv import load_dotenv

from infra.aws.ses import EmailClient  # type: ignore
from infra.prisma import getPrisma  # type: ignore
from infra.utils import get_html_template_file, fill_template  # type: ignore
from infra.mailgun.mailgun import MailgunClient

auth_router = APIRouter(tags=["auth"])

prisma = getPrisma()

if os.getenv("MODE", "dev") == "dev":
    load_dotenv("../.env")


SECRET_KEY = os.getenv("JWT_SECRET_KEY", "default")
ACCESS_TOKEN_EXPIRE_MINUTES = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30)

ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

email_client = EmailClient()
mailgun_client = MailgunClient()


def init_auth(app):
    global SECRET_KEY
    SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    if SECRET_KEY is None:
        # Generate a random key at runtime as a last resort.
        SECRET_KEY = token_hex(32)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def check_token(token: Annotated[str, Depends(oauth2_scheme)]) -> str:
    """
    Make a route require authentication. Return the username of the user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "status": status.HTTP_401_UNAUTHORIZED,
            "message": "Could not validate credentials",
        },
        headers={},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload["username"]
        if username is None:
            raise credentials_exception
        return username
    except JWTError:
        raise credentials_exception
    except KeyError:
        raise credentials_exception


async def check_super_admin(
    username: Annotated[str, Depends(check_token)]
) -> None:
    """
    Make a route require admin authentication.
    """
    current_user = await prisma.user.find_unique(
        where=UserWhereInput(email=username)
    )
    if current_user.status != EnumUserStatus.SuperAdminStatus:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": status.HTTP_403_FORBIDDEN,
                "message": "Super Admin privilege required",
            },
            headers={},
        )


async def check_admin(username: Annotated[str, Depends(check_token)]) -> None:
    """
    Make a route require admin authentication.
    """
    current_user = await prisma.user.find_unique(
        where=UserWhereInput(email=username)
    )
    print("current_user.status", current_user.status)
    if current_user.status not in [
        EnumUserStatus.AdminStatus,
        EnumUserStatus.SuperAdminStatus,
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": status.HTTP_403_FORBIDDEN,
                "message": "Admin privilege required",
            },
            headers={},
        )


async def check_user(username: Annotated[str, Depends(check_token)]) -> User:
    current_user = await prisma.user.find_unique(
        where=UserWhereInput(email=username),
        include=UserInclude(school=True),
    )

    if current_user is None:
        raise HTTPException(
            status_code=400, detail="Cannot find the current user id"
        )
    return current_user


async def send_reset_password_email(
    email: str, firstname: str, new_password: str, url: str
) -> None:
    general_config = await prisma.generalconfig.find_first()
    html_template = get_html_template_file("reset_password.html")
    txt_template = get_html_template_file("reset_password.txt")
    content = {
        "EMAIL": email,
        "FIRSTNAME": firstname,
        "PASSWORD": new_password,
        "URL": url,
    }
    html_content = fill_template(html_template, content)
    txt_content = fill_template(txt_template, content)
    try:
        if general_config.canSendEmails == True:
            if general_config.mailClient == mailClient.SES:
                email_client.send_email(
                    to_address=email,
                    subject="[IC 2026] Réinitialisez votre mot de passe",
                    body_html=html_content,
                    body_text=txt_content,
                )
            else:
                mailgun_client.send_email(
                    from_email="toss-register@cs-sports.fr",
                    to_email=email,
                    subject="[IC 2026] Réinitialisez votre mot de passe",
                    text=txt_content,
                    html=html_content,
                )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error while sending the reset password email : {e}",
        )


def generate_password(length=12):
    characters = string.ascii_letters + string.digits
    password = "".join(random.choice(characters) for _ in range(length))
    return password
