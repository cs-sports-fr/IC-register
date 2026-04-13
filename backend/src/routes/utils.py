from datetime import datetime
from typing import Annotated, Tuple
from fastapi import HTTPException, Depends
from prisma.models import Team, User, Participant

from prisma.types import (
    TeamWhereInput,
    TeamInclude,
    TeamUpdateInput,
    ParticipantCreateInput,
    FindManyParticipantArgsFromTeam,
    ProductCreateManyNestedWithoutRelationsInput,
    ParticipantIncludeFromParticipantRecursive1,
    _ProductWhereUnique_id_Input,
    ParticipantWhereInput,
    ParticipantUpdateInput,
)
from prisma.enums import Gender, EnumUserStatus, mailClient, ClassementTennis, ArmeEscrime
from pydantic import BaseModel

from infra.utils import get_html_template_file, fill_template  # type: ignore
from infra.prisma import getPrisma  # type: ignore
from routes.auth.utils import check_user  # type: ignore
from infra.aws.ses import EmailClient  # type: ignore
from infra.mailgun.mailgun import MailgunClient

prisma = getPrisma()

mailgun_client = MailgunClient()
email_client = EmailClient()


async def send_welcome_email(
    email: str, firstname: str
) -> None:
    general_config = await prisma.generalconfig.find_first()
    html_template = get_html_template_file("mail_welcome.html")
    txt_template = get_html_template_file("mail_welcome.txt")
    content = {
        "FIRSTNAME": firstname,
        
    }
    html_content = fill_template(html_template, content)
    txt_content = fill_template(txt_template, content)

    if general_config.canSendEmails == True:
        if general_config.mailClient == mailClient.SES:

            try:
                email_client.send_email(
                    to_address=email,
                    subject="[IC 2026] Création de compte",
                    body_html=html_content,
                    body_text=txt_content,
                )
                await prisma.participant.update(
                    where=ParticipantWhereInput(email=email),
                    
                )
            except Exception:
                pass
        else:
            try:
                mailgun_client.send_email(
                    from_email="toss-register@cs-sports.fr",
                    to_email=email,
                    subject="[IC 2026] Création de compte",
                    text=txt_content,
                    html=html_content,
                )
                await prisma.participant.update(
                    where=ParticipantWhereInput(email=email),
                 
                )
            except Exception:
                pass
