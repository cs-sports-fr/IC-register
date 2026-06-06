from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends

from prisma.models import GeneralConfig
from prisma.types import GeneralConfigWhereUniqueInput
from pydantic import BaseModel

from infra.prisma import getPrisma  # type: ignore
from routes.auth.utils import check_super_admin, check_token  # type: ignore

config_router = APIRouter(
    prefix="/config",
    tags=["configurations"],
    dependencies=[Depends(check_token)],
)
prisma = getPrisma()


class ConfigResponse(BaseModel):
    isRegistrationOpen: bool = False
    isPaymentOpen: bool = False
    expectedRegistrationDate: Optional[datetime] = None


class GeneralConfigUpdate(BaseModel):
    isRegistrationOpen: bool
    isPaymentOpen: bool
    expectedRegistrationDate: Optional[datetime] = None


@config_router.get("", response_model=ConfigResponse)
async def get_config():
    config = await prisma.generalconfig.find_first()
    if config is None:
        return ConfigResponse()
    return ConfigResponse(
        isRegistrationOpen=config.registration_open,
        isPaymentOpen=False,
        expectedRegistrationDate=None,
    )


@config_router.put(
    "", response_model=GeneralConfig, dependencies=[Depends(check_super_admin)]
)
async def update_config(config: GeneralConfigUpdate):
    # Récupérer la configuration existante (celle renvoyée par get_config)
    existing_config = await prisma.generalconfig.find_first()

    if existing_config is None:
        # Si aucune configuration n'existe encore, on la crée
        updated_config = await prisma.generalconfig.create(
            data=dict(
                editionYear=config.editionYear,
                isRegistrationOpen=config.isRegistrationOpen,
                isPaymentOpen=config.isPaymentOpen,
                expectedRegistrationDate=config.expectedRegistrationDate,
            ),
        )
    else:
        # Sinon on met à jour la configuration existante, quelle que soit sa valeur d'id
        updated_config = await prisma.generalconfig.update(
            where=GeneralConfigWhereUniqueInput(id=existing_config.id),
            data=dict(
                editionYear=config.editionYear,
                isRegistrationOpen=config.isRegistrationOpen,
                isPaymentOpen=config.isPaymentOpen,
                expectedRegistrationDate=config.expectedRegistrationDate,
            ),
        )

    return updated_config
