from typing import List
from fastapi import APIRouter, Depends
from prisma.models import Product

from prisma.types import ProductCreateInput, ProductWhereUniqueInput

from infra.prisma import getPrisma  # type: ignore
from routes.auth.utils import check_super_admin, check_token  # type: ignore

products_router = APIRouter(
    prefix="/products", tags=["products"], dependencies=[Depends(check_token)]
)
prisma = getPrisma()


@products_router.get("", response_model=List[Product])
async def get_all_products():
    products = await prisma.product.find_many()
    return products


@products_router.post(
    "/", response_model=Product, dependencies=[Depends(check_super_admin)]
)
async def create_product(name: str, price_in_cents: int, picture_link: str):

    product = await prisma.product.create(
        data=ProductCreateInput(
            name=name, priceInCents=price_in_cents, pictureLink=picture_link
        )
    )
    return product


@products_router.put(
    "/{product_id}",
    response_model=Product,
    dependencies=[Depends(check_super_admin)],
)
async def update_product(
    product_id: int, name: str, price_in_cents: int, picture_link: str
):
    product = await prisma.product.update(
        where=ProductWhereUniqueInput(id=product_id),
        data=ProductCreateInput(
            name=name, priceInCents=price_in_cents, pictureLink=picture_link
        ),
    )
    return product


@products_router.delete(
    "/{product_id}", dependencies=[Depends(check_super_admin)]
)
async def delete_product(product_id: int):
    await prisma.product.delete(where=ProductWhereUniqueInput(id=product_id))
