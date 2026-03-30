import hashlib
import hmac
import os
import logging
from fastapi import HTTPException
from prisma.models import User
import json
import requests  # type: ignore

logger = logging.getLogger(__name__)

from prisma.models import Payment
from prisma.types import (
    PaymentWhereUniqueInput,
    PaymentUpdateInput,
    TeamWhereUniqueInput,
    TeamUpdateInput,
    _IntIncrementInput,
)
from prisma.enums import PaymentStatus

from infra.prisma import getPrisma  # type: ignore

prisma = getPrisma()

HMAC_SECRET_KEY = os.getenv("HMAC_SECRET_KEY")
LYDIA_API_URL = os.getenv("LYDIA_API_URL")
# Nettoyer le token au chargement pour enlever les guillemets si présents
LYDIA_VENDOR_TOKEN_RAW = os.getenv("LYDIA_VENDOR_TOKEN")
LYDIA_VENDOR_TOKEN = LYDIA_VENDOR_TOKEN_RAW.strip().strip('"').strip("'") if LYDIA_VENDOR_TOKEN_RAW else None
BACKEND_URL = os.getenv("BACKEND_URL")
FRONTEND_URL = os.getenv("FRONTEND_URL")


def generate_hmac(message):
    hmac_hash = hmac.new(
        bytes(HMAC_SECRET_KEY, encoding="utf8"),
        bytes(str(message), encoding="utf8"),
        hashlib.sha256,
    )

    hex_hash = hmac_hash.hexdigest()

    return hex_hash


async def request_lydia_payment_url(payment: Payment, user: User):
    hash = generate_hmac(payment.id)

    # Vérification du montant minimum (Lydia peut avoir des restrictions)
    if payment.amountInCents < 1:
        raise HTTPException(
            status_code=400,
            detail="Le montant minimum pour un paiement Lydia est de 0.01€ (1 centime).",
        )
    

    payement_message = f"[TOSS] {user.email}"
    if payment.team is not None:
        payement_message += f" pour equipe {payment.team.name}"
        if payment.team.school is not None:
            payement_message += f" de {payment.team.school.name}"

    success_url = f"{FRONTEND_URL}"
    if payment.team is not None:
        success_url += f"/team/{payment.team.id}"

    logger.info(f"Requesting Lydia payment - payment_id={payment.id}, amount={payment.amountInCents/100}€, user={user.email}")

    try:
        response: requests.Response = requests.post(
            f"{LYDIA_API_URL}/api/request/do.json",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "vendor_token": LYDIA_VENDOR_TOKEN,
            "amount": str(round(payment.amountInCents / 100, 2)),
            "currency": "EUR",
            "type": "email",  # "phone" TODO : check what we do
            "recipient": user.email,
            "message": payement_message,
            "confirm_url": f"{BACKEND_URL}/payment/confirm?payment_id={payment.id}&hash={hash}",
            "cancel_url": f"{BACKEND_URL}/payment/cancel?payment_id={payment.id}&hash={hash}",
            "expire_url": f"{BACKEND_URL}/payment/expire?payment_id={payment.id}&hash={hash}",
            "browser_success_url": success_url,
            "end_mobile_url": success_url,
            "display_confirmation":"no",
        },
        timeout=30,  # Timeout de 30 secondes
    )
    except requests.exceptions.Timeout:
        await prisma.payment.update(
            where=PaymentWhereUniqueInput(id=payment.id),
            data=PaymentUpdateInput(paymentStatus=PaymentStatus.Failed),
        )
        raise HTTPException(
            status_code=500,
            detail="Timeout while connecting to Lydia API. Please try again later.",
        )
    except requests.exceptions.ConnectionError as e:
        await prisma.payment.update(
            where=PaymentWhereUniqueInput(id=payment.id),
            data=PaymentUpdateInput(paymentStatus=PaymentStatus.Failed),
        )
        raise HTTPException(
            status_code=500,
            detail=f"Cannot connect to Lydia API. Check LYDIA_API_URL configuration. Error: {str(e)}",
        )
    except requests.exceptions.RequestException as e:
        await prisma.payment.update(
            where=PaymentWhereUniqueInput(id=payment.id),
            data=PaymentUpdateInput(paymentStatus=PaymentStatus.Failed),
        )
        raise HTTPException(
            status_code=500,
            detail=f"Error while requesting payment from Lydia API: {str(e)}",
        )

    if response.status_code != 200:
        error_text = response.text[:500] if response.text else "No response body"
        await prisma.payment.update(
            where=PaymentWhereUniqueInput(id=payment.id),
            data=PaymentUpdateInput(paymentStatus=PaymentStatus.Failed),
        )
        raise HTTPException(
            status_code=500,
            detail=f"Lydia API returned status {response.status_code}. Response: {error_text}",
        )

    try:
        json_result: dict = json.loads(response.text)
    except json.JSONDecodeError as e:
        await prisma.payment.update(
            where=PaymentWhereUniqueInput(id=payment.id),
            data=PaymentUpdateInput(paymentStatus=PaymentStatus.Failed),
        )
        raise HTTPException(
            status_code=500,
            detail=f"Invalid JSON response from Lydia API: {str(e)}. Response: {response.text[:200]}",
        )

    if json_result.get("error") != "0":
        error_code = json_result.get("error", "unknown")
        error_message = json_result.get("message", "Unknown error")
        
        logger.error(f"Lydia API error - Code: {error_code}, Message: {error_message}, Payment ID: {payment.id}")
        
        await prisma.payment.update(
            where=PaymentWhereUniqueInput(id=payment.id),
            data=PaymentUpdateInput(paymentStatus=PaymentStatus.Failed),
        )
        
        # Messages d'erreur spécifiques selon le code
        detail_message = f"Lydia API error: {error_code} - {error_message}"
        
        if "Token marchand invalide" in error_message or error_code == "1":
            detail_message += " | Vérifiez que LYDIA_VENDOR_TOKEN est correct et que le backend a été redémarré après modification du .env"
        elif error_code == "5":
            detail_message += " | Erreur de paiement côté client (carte refusée, fonds insuffisants, ou problème de sécurité). Pour un montant de test très faible (0.01€), vérifiez que votre compte Lydia accepte les micro-transactions. Essayez avec un montant plus élevé (ex: 1€) pour tester."
        elif error_code in ["2", "3", "4"]:
            detail_message += " | Problème de configuration ou de paramètres de la requête. Vérifiez les logs backend pour plus de détails."
        
        raise HTTPException(
            status_code=500,
            detail=detail_message,
        )
    request_id = json_result["request_id"]
    request_uuid = json_result["request_uuid"]
    mobile_url = json_result["mobile_url"]

    await prisma.payment.update(
        where=PaymentWhereUniqueInput(id=payment.id),
        data=PaymentUpdateInput(
            paymentStatus=PaymentStatus.Pending,
            requestId=request_id,
            requestUuid=request_uuid,
        ),
    )

    return mobile_url


async def check_lydia_payment_state(payment: Payment, user: User):

    response: requests.Response = requests.post(
        f"{LYDIA_API_URL}/api/request/state.json",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "vendor_token": LYDIA_VENDOR_TOKEN,
            "order_ref": payment.id,
            "request_uuid": payment.requestUuid,
            "request_id": payment.requestId,
        },
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail=f"Error while checking payment state",
        )

    json_result: dict = json.loads(response.text)

    match json_result["state"]:
        case "1":
            return PaymentStatus.Paid
        case "0":
            return PaymentStatus.Pending
        case default:
            return PaymentStatus.Canceled


async def update_payment_after_confirmation(payment: Payment):
    await prisma.payment.update(
        where=PaymentWhereUniqueInput(id=payment.id),
        data=PaymentUpdateInput(paymentStatus=PaymentStatus.Paid),
    )
    await prisma.team.update(
        where=TeamWhereUniqueInput(id=payment.teamId),
        data=TeamUpdateInput(
            amountPaidInCents=_IntIncrementInput(
                increment=payment.amountInCents
            )
        ),
    )
