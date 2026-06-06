from typing import Annotated, List
from fastapi import APIRouter, Depends

from prisma.models import Pack, User
from prisma.types import PackCreateInput, PackWhereUniqueInput
from infra.prisma import getPrisma  # type: ignore
from routes.auth.utils import check_super_admin, check_token, check_user  # type: ignore

packs_router = APIRouter(
    prefix="/packs",
    tags=["packs"],
    dependencies=[Depends(check_token)],
)
prisma = getPrisma()


@packs_router.get("", response_model=List[Pack])
async def get_all_packs(user: Annotated[User, Depends(check_user)]):
    packs = await prisma.pack.find_many()
    return packs


@packs_router.post(
    "/", response_model=Pack, dependencies=[Depends(check_super_admin)]
)
async def create_pack(name: str, price_in_cents: int):
    pack = await prisma.pack.create(
        data=PackCreateInput(name=name, price_in_cents=price_in_cents)
    )
    return pack


@packs_router.put(
    "/{pack_id}", response_model=Pack, dependencies=[Depends(check_super_admin)]
)
async def update_pack(pack_id: int, name: str, price_in_cents: int):
    pack = await prisma.pack.update(
        where=PackWhereUniqueInput(id=pack_id),
        data=PackCreateInput(name=name, price_in_cents=price_in_cents),
    )
    return pack


@packs_router.delete("/{pack_id}", dependencies=[Depends(check_super_admin)])
async def delete_pack(pack_id: int):
    await prisma.pack.delete(where=PackWhereUniqueInput(id=pack_id))
