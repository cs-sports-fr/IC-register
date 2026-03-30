from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException

from prisma.models import Pack, User
from prisma.enums import EnumUserStatus
from prisma.types import (
    PackCreateInput,
    PackWhereUniqueInput,
    PackWhereInput,
    SchoolWhereInput,
    UserListRelationFilter,
    UserWhereInput,
)
from infra.prisma import getPrisma  # type: ignore
from routes.auth.utils import check_super_admin, check_token, check_user, check_admin  # type: ignore

packs_router = APIRouter(
    prefix="/packs",
    tags=["packs"],
    dependencies=[Depends(check_token)],
)
prisma = getPrisma()


@packs_router.get("", response_model=List[Pack])
async def get_all_packs(user: Annotated[User, Depends(check_user)]):
    if (
        user.status == EnumUserStatus.SuperAdminStatus
        or user.status == EnumUserStatus.AdminStatus
    ):
        packs = await prisma.pack.find_many()
    else:
        user_school = user.school
        if user_school is None:
            raise HTTPException(
                status_code=400, detail="Cannot find the current user school"
            )
        if user_school.isInIDF is True:
            packs = await prisma.pack.find_many(
                where=PackWhereInput(isAllowedInIDF=True)
            )
        else:
            packs = await prisma.pack.find_many()
    return packs


@packs_router.post(
    "/", response_model=Pack, dependencies=[Depends(check_super_admin)]
)
async def create_pack(name: str, price_in_cents: int):

    pack = await prisma.pack.create(
        data=PackCreateInput(name=name, priceInCents=price_in_cents)
    )
    return pack


@packs_router.put(
    "/{pack_id}", response_model=Pack, dependencies=[Depends(check_super_admin)]
)
async def update_pack(pack_id: int, name: str, price_in_cents: int):
    pack = await prisma.pack.update(
        where=PackWhereUniqueInput(id=pack_id),
        data=PackCreateInput(name=name, priceInCents=price_in_cents),
    )
    return pack


@packs_router.delete("/{pack_id}", dependencies=[Depends(check_super_admin)])
async def delete_pack(pack_id: int):
    await prisma.pack.delete(where=PackWhereUniqueInput(id=pack_id))



##Determiner quel pack  inclus  quel repas

@packs_router.get("/breakfast", response_model=List[Pack], dependencies=[Depends(check_admin)])
async def get_breakfast_packs():
    packs = await prisma.pack.find_many(where=PackWhereInput(isBreakfastIncluded=True))
    return packs


@packs_router.get("/lunch", response_model=List[Pack], dependencies=[Depends(check_admin)])
async def get_lunch_packs():
    packs = await prisma.pack.find_many(where=PackWhereInput(isLunchIncluded=True))
    return packs


@packs_router.get("/dinner", response_model=List[Pack], dependencies=[Depends(check_admin)])
async def get_dinner_packs():
    packs = await prisma.pack.find_many(where=PackWhereInput(isDinnerIncluded=True))
    return packs
