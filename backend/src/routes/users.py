# add a update user status route

from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException

from prisma.models import User
from prisma.enums import EnumUserStatus
from prisma.types import (
    _UserWhereUnique_id_Input,
    UserInclude,
    UserUpdateInput,
    SportUpdateOneWithoutRelationsInput,
    SportWhereUniqueInput,
    UserWhereInput,
)
from pydantic import BaseModel

from infra.prisma import getPrisma  # type: ignore
from routes.auth.utils import check_super_admin, check_token, check_user, get_password_hash, verify_password  # type: ignore


class UserUpdateInfo(BaseModel):

    old_password: str | None
    password: str | None


users_router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(check_token)],
)
prisma = getPrisma()


@users_router.put(
    "/{user_id}/status",
    response_model=User,
    dependencies=[Depends(check_super_admin)],
)
async def update_user_status(
    user_id: int, new_status: EnumUserStatus, sportId: int | None = None
):
    if new_status == EnumUserStatus.AdminStatus:
        if sportId is None:
            raise HTTPException(
                status_code=400, detail="sportId is required for AdminStatus"
            )

        user = await prisma.user.update(
            where=_UserWhereUnique_id_Input(id=user_id),
            data=UserUpdateInput(
                status=new_status,
                sportAdmin=SportUpdateOneWithoutRelationsInput(
                    connect=SportWhereUniqueInput(id=sportId)
                ),
            ),
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
    else:
        user = await prisma.user.update(
            where=_UserWhereUnique_id_Input(id=user_id),
            data=UserUpdateInput(
                status=new_status,
                sportAdmin=SportUpdateOneWithoutRelationsInput(disconnect=True),
            ),
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
    return user


@users_router.get(
    "",
    response_model=List[User],
    dependencies=[Depends(check_super_admin)],
)
async def get_all_users(skip: int = 0, take: int = 10, search=""):
    users = await prisma.user.find_many(
        skip=skip,
        take=take,
        include=UserInclude(school=True, sportAdmin=True),
        where={
            "OR": [
                {"email": {"contains": search}},
                {"firstname": {"contains": search}},
                {"lastname": {"contains": search}},
                {"mobile": {"contains": search}},
            ]
        },
    )
    return users


@users_router.put("/{user_id}/password", response_model=User)
async def update_user_password(
    user_id: int,
    old_password: str,
    new_password: str,
    username: str = Depends(check_token),
):
    user = await prisma.user.find_unique(where=UserWhereInput(email=username))
    if user is None:
        raise HTTPException(
            status_code=400, detail="Cannot find the current user id"
        )
    is_super_admin = user.status == EnumUserStatus.SuperAdminStatus

    if user.id != user_id and not is_super_admin:
        raise HTTPException(
            status_code=400, detail="You cannot update this user"
        )

    if not verify_password(old_password, user.password):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    user = await prisma.user.update(
        where=_UserWhereUnique_id_Input(id=user_id),
        data=UserUpdateInput(
            password=get_password_hash(new_password),
        ),
    )
    return user


@users_router.put("/{user_id}", response_model=User)
async def update_user_info(
    user_id: int,
    email: str,
    firstname: str,
    lastname: str,
    mobile: str,
    username: str = Depends(check_token),
):
    user = await prisma.user.find_unique(where=UserWhereInput(email=username))
    if user is None:
        raise HTTPException(
            status_code=400, detail="Cannot find the current user id"
        )
    is_super_admin = user.status == EnumUserStatus.SuperAdminStatus

    if user.id != user_id and not is_super_admin:
        raise HTTPException(
            status_code=400, detail="You cannot update this user"
        )

    user = await prisma.user.update(
        where=_UserWhereUnique_id_Input(id=user_id),
        data=UserUpdateInput(
            email=email,
            firstname=firstname,
            lastname=lastname,
            mobile=mobile,
        ),
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@users_router.get(
    "/count",
    response_model=dict[str, int],
    dependencies=[Depends(check_super_admin)],
)
async def count_users():
    nb_users = await prisma.user.count()
    return {"count": nb_users}


@users_router.get("/me", response_model=User)
async def get_me(user: Annotated[User, Depends(check_user)]):
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_with_school = await prisma.user.find_unique(
        where={"id": user.id},
        include={"school": True}, 
    )
    
    if not user_with_school:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_with_school