from fastapi import APIRouter, Depends, HTTPException
from prisma.models import User


from prisma.models import Payment
from prisma.types import (
    PaymentCreateInput,
    PaymentInclude,
    TeamArgsFromPayment,
    TeamIncludeFromTeamRecursive1,
    PaymentWhereUniqueInput,
    PaymentUpdateInput,
    UserArgsFromPayment,
)
from prisma.enums import PaymentStatus

from routes.payment.utils import (  # type: ignore
    check_lydia_payment_state,
    generate_hmac,
    update_payment_after_confirmation,
)

from routes.teams.utils import get_team_if_allowed  # type: ignore
from routes.teams.caution_links import (  # type: ignore
    SPORT_CAUTION_LINKS,
    DEFAULT_CAUTION_LINK,
)

from infra.prisma import getPrisma  # type: ignore
from routes.auth.utils import check_user, check_admin  # type: ignore

payment_router = APIRouter(prefix="/payment", tags=["payment"])
prisma = getPrisma()


@payment_router.post("/confirm")
async def confirm_payment(payment_id: int, hash: str):
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[PAYMENT] Confirm callback - payment_id={payment_id}")
    
    if not hash == generate_hmac(payment_id):
        logger.error(f"[PAYMENT] Invalid hash for payment_id={payment_id}")
        try:
            await prisma.payment.update(
                where=PaymentWhereUniqueInput(id=payment_id),
                data=PaymentUpdateInput(paymentStatus=PaymentStatus.Forged),
            )
        except Exception:
            raise HTTPException(status_code=403)
        raise HTTPException(status_code=403)

    payment = await prisma.payment.find_unique(
        where=PaymentWhereUniqueInput(id=payment_id),
    )
    if payment is None:
        raise HTTPException(
            status_code=404,
            detail="Payment not found",
        )
    if payment.paymentStatus != PaymentStatus.Pending:
        raise HTTPException(
            status_code=404,
            detail=f"Payment not pending (current status: {payment.paymentStatus})",
        )
    
    await update_payment_after_confirmation(payment)
    logger.info(f"[PAYMENT] Payment confirmed - payment_id={payment_id}")
    return {"status": "ok"}


@payment_router.post("/cancel")
async def cancel_payment(payment_id: int, hash: str):

    if not hash == generate_hmac(payment_id):
        try:
            await prisma.payment.update(
                where=PaymentWhereUniqueInput(id=payment_id),
                data=PaymentUpdateInput(paymentStatus=PaymentStatus.Forged),
            )
        except Exception:
            raise HTTPException(status_code=403)
        raise HTTPException(status_code=403)

    await prisma.payment.update(
        where=PaymentWhereUniqueInput(id=payment_id),
        data=PaymentUpdateInput(paymentStatus=PaymentStatus.Canceled),
    )
    return {"status": "ok"}


@payment_router.post("/expire")
async def expire_payment(payment_id: int, hash: str):

    if not hash == generate_hmac(payment_id):
        try:
            await prisma.payment.update(
                where=PaymentWhereUniqueInput(id=payment_id),
                data=PaymentUpdateInput(paymentStatus=PaymentStatus.Forged),
            )
        except Exception:
            raise HTTPException(status_code=403)
        raise HTTPException(status_code=403)

    await prisma.payment.update(
        where=PaymentWhereUniqueInput(id=payment_id),
        data=PaymentUpdateInput(paymentStatus=PaymentStatus.Canceled),
    )
    return {"status": "ok"}


@payment_router.post("/request")
async def request_payment(team_id: int, user: User = Depends(check_user)):
    existing_team = await get_team_if_allowed(team_id, user)
    amountLeftToPayInCents = (
        existing_team.amountToPayInCents - existing_team.amountPaidInCents
    )
    general_config = await prisma.generalconfig.find_first()
    if general_config is None:
        raise HTTPException(status_code=500, detail="General config not found")

    if not general_config.isPaymentOpen:
        raise HTTPException(status_code=400, detail="Payment is still closed")
    if amountLeftToPayInCents <= 0:
        raise HTTPException(
            status_code=400,
            detail="No payment needed",
        )

    # Redirige maintenant vers le lien de caution par sport
    sport_id = existing_team.sportId
    sport_link = SPORT_CAUTION_LINKS.get(sport_id, DEFAULT_CAUTION_LINK)

    return sport_link


@payment_router.get(
    "/check-state/{payment_id}", dependencies=[Depends(check_admin)]
)
async def check_payment_state(payment_id: int):
    """Vérifie l'état d'un paiement auprès de Lydia et met à jour si nécessaire"""
    import logging
    logger = logging.getLogger(__name__)
    
    payment = await prisma.payment.find_unique(
        where=PaymentWhereUniqueInput(id=payment_id),
        include=PaymentInclude(
            team=True,
            user=UserArgsFromPayment()
        ),
    )
    if payment is None:
        raise HTTPException(
            status_code=404,
            detail="Payment not found",
        )

    result = {
        "payment_id": payment_id,
        "current_status": payment.paymentStatus,
        "amount": payment.amountInCents / 100,
        "team_id": payment.teamId,
    }

    if payment.paymentStatus == PaymentStatus.Pending:
        try:
            payment_status = await check_lydia_payment_state(payment, payment.user)
            
            if payment_status == PaymentStatus.Paid:
                await update_payment_after_confirmation(payment)
                result["status"] = "Paid"
                result["message"] = "Payment confirmed successfully"
            else:
                await prisma.payment.update(
                    where=PaymentWhereUniqueInput(id=payment.id),
                    data=PaymentUpdateInput(paymentStatus=payment_status),
                )
                result["status"] = payment_status
                result["message"] = f"Payment status updated to {payment_status}"
        except Exception as e:
            logger.error(f"[PAYMENT] Error checking payment state: {e}")
            result["error"] = str(e)
            result["message"] = f"Error checking payment state: {str(e)}"
    else:
        result["message"] = f"Payment is already {payment.paymentStatus}"

    return result
