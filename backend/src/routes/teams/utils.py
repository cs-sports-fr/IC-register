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
    StringFilter,
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


class ParticipantInput(BaseModel):
    gender: Gender
    firstname: str
    lastname: str
    mobile: str
    email: str
    dateOfBirth: datetime
    isCaptain: bool
    licenceID: str
    packId: int
    isVegan: bool
    hasAllergies: bool
    allergies: str | None = None
    productsIds: list[int]
    weight: float | None = None
    mailHebergeur: str | None = None
    classementTennis: ClassementTennis | None = None
    classementTT: float | None = None
    armeVoeu1: ArmeEscrime | None = None
    armeVoeu2: ArmeEscrime | None = None
    armeVoeu3: ArmeEscrime | None = None
    swimming50mEventId: int | None = None
    swimming100mEventId: int | None = None


async def get_team_if_allowed(
    team_id: int, user: Annotated[User, Depends(check_user)]
) -> Team:
    if user.status == EnumUserStatus.SuperAdminStatus:
        existing_team = await prisma.team.find_first(
            where=TeamWhereInput(id=team_id),
            include=TeamInclude(
                participants=FindManyParticipantArgsFromTeam(
                    include=ParticipantIncludeFromParticipantRecursive1(
                        products=True,
                        pack=True,
                    )
                ),
                sport=True,
            ),
        )
        if existing_team is None:
            raise HTTPException(
                status_code=400,
                detail="This team does not exist",
            )
            
        return existing_team
    
    elif user.status == EnumUserStatus.RespoDelegStatus and user.schoolId is not None:
        existing_team = await prisma.team.find_first(
            where=TeamWhereInput(id=team_id, schoolId=user.schoolId),
            include=TeamInclude(
                participants=FindManyParticipantArgsFromTeam(
                    include=ParticipantIncludeFromParticipantRecursive1(
                        products=True,
                        pack=True,
                    )
                ),
                sport=True,
            ),
        )
        if existing_team is None:
            raise HTTPException(
                status_code=400,
                detail="This user is not a respodélég of this team",
            )
        if user.schoolId != existing_team.schoolId:
            raise HTTPException(
                status_code=403,
                detail="This user is not a respodélég of this team",
            )
        return existing_team

    elif user.status == EnumUserStatus.AdminStatus:
        existing_team = await prisma.team.find_first(
            where=TeamWhereInput(id=team_id, sportId=user.sportAdminId),
            include=TeamInclude(
                participants=FindManyParticipantArgsFromTeam(
                    include=ParticipantIncludeFromParticipantRecursive1(
                        products=True,
                        pack=True,
                    )
                ),
                sport=True,
            ),
        )
        if existing_team is None:
            raise HTTPException(
                status_code=400,
                detail="This user is not an admin of this team",
            )
        if user.sportAdminId != existing_team.sportId:
            raise HTTPException(
                status_code=403,
                detail="This user is not an admin of this sport",
            )
        return existing_team

    else:
        existing_team = await prisma.team.find_first(
            where=TeamWhereInput(id=team_id, teamAdminUserId=user.id),
            include=TeamInclude(
                participants=FindManyParticipantArgsFromTeam(
                    include=ParticipantIncludeFromParticipantRecursive1(
                        products=True,
                        pack=True,
                    )
                ),
                sport=True,
            ),
        )
        if existing_team is None:
            raise HTTPException(
                status_code=403,
                detail="This user is not an admin of this team",
            )
    return existing_team


CHEER_SPORT_ID = 13


async def add_participant_to_team(
    team_id: int,
    school_id: int,
    charte_password: str,
    new_participant: ParticipantInput,
    sport_id: int,
) -> Participant:

    # Vérifie si l'email est déjà utilisé dans une autre équipe
    existing_with_email = await prisma.participant.find_first(
        where=ParticipantWhereInput(
            email=StringFilter(equals=new_participant.email, mode="insensitive")
        )
    )
    if existing_with_email:
        if sport_id != CHEER_SPORT_ID:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"L'email {new_participant.email} est déjà utilisé dans une autre équipe. "
                    "La double inscription n'est autorisée que pour le Cheerleading."
                ),
            )

    product_connections = [
        _ProductWhereUnique_id_Input(id=id_)
        for id_ in new_participant.productsIds
    ]
    
    requires_rez_validation = new_participant.packId in [1, 6]
    logement_rez_ok = not requires_rez_validation

    participant = await prisma.participant.create(
        data=ParticipantCreateInput(
            packId=new_participant.packId,
            licenceID=new_participant.licenceID,
            isCaptain=new_participant.isCaptain,
            gender=new_participant.gender,
            firstname=new_participant.firstname,
            lastname=new_participant.lastname,
            mobile=new_participant.mobile,
            email=new_participant.email,
            dateOfBirth=new_participant.dateOfBirth,
            charteIsValidated=False,
            chartePassword=charte_password,
            teamId=team_id,
            logementRezOk= logement_rez_ok,
            schoolId=school_id,
            isVegan=new_participant.isVegan,
            hasAllergies=new_participant.hasAllergies,
            allergies=new_participant.allergies,
            products=ProductCreateManyNestedWithoutRelationsInput(
                connect=product_connections
            ),
            weight=new_participant.weight,
            mailHebergeur=new_participant.mailHebergeur,
            classementTennis=new_participant.classementTennis,
            classementTT=new_participant.classementTT,
            armeVoeu1=new_participant.armeVoeu1,
            armeVoeu2=new_participant.armeVoeu2,
            armeVoeu3=new_participant.armeVoeu3,
            swimming50mEventId=new_participant.swimming50mEventId,
            swimming100mEventId=new_participant.swimming100mEventId,
        ),
    )
    
    # NOTE: On ne crée PAS les SwimmingResult ici.
    # Ils seront créés automatiquement dans toss_results lors du chargement de la page
    # de gestion des épreuves, en lisant les champs swimming50mEventId et swimming100mEventId
    
    return participant


async def check_and_update_team_amount_to_pay_then_get_team(
    team_id: int, team: Team | None = None
) -> Tuple[Team, int]:
    if team is None:
        team = await prisma.team.find_first(
            where=TeamWhereInput(id=team_id),
            include=TeamInclude(
                participants=FindManyParticipantArgsFromTeam(
                    include=ParticipantIncludeFromParticipantRecursive1(
                        pack=True, products=True
                    )
                )
            ),
        )

    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")

    amount_to_pay_in_cents = 0

    if team.participants is None:
        return team, amount_to_pay_in_cents

    for participant in team.participants:
        if participant.pack is not None:
            if team.schoolId == 34:
                amount_to_pay_in_cents += participant.pack.priceInCents - 4500
                
            elif team.schoolId ==2 or team.schoolId == 93 or team.schoolId== 97 or team.schoolId == 43 or team.schoolId == 10 or team.schoolId == 59 or team.schoolId == 118:
                amount_to_pay_in_cents += participant.pack.priceInCents - 1000
      
    
                
            else:
                amount_to_pay_in_cents += participant.pack.priceInCents

        if team.sportId == 19:
            amount_to_pay_in_cents += 2000
            
        if team.sportId == 14:
            amount_to_pay_in_cents += 1500
         
        if team.sportId == 34:
            amount_to_pay_in_cents -= 1000

        if participant.products is None:
            break

        for product in participant.products:
            amount_to_pay_in_cents += product.priceInCents

    if team.amountToPayInCents != amount_to_pay_in_cents:
        team = await prisma.team.update(
            data=TeamUpdateInput(
                amountToPayInCents=amount_to_pay_in_cents,
            ),
            where=TeamWhereInput(id=team_id),
            include=TeamInclude(participants=True),
        )
        if team is None:
            raise HTTPException(
                status_code=500,
                detail="Error while updating team amount to pay",
            )

    return team, amount_to_pay_in_cents


async def send_charte_email(
    email: str, firstname: str, charte_password: str, url: str
) -> None:
    general_config = await prisma.generalconfig.find_first()
    html_template = get_html_template_file("charte_email.html")
    txt_template = get_html_template_file("charte_email.txt")
    content = {
        "FIRSTNAME": firstname,
        "PASSWORD": charte_password,
        "URL": url,
    }
    html_content = fill_template(html_template, content)
    txt_content = fill_template(txt_template, content)

    if general_config.canSendEmails == True:
        if general_config.mailClient == mailClient.SES:

            try:
                email_client.send_email(
                    to_address=email,
                    subject="[TOSS 2026] Charte participant",
                    body_html=html_content,
                    body_text=txt_content,
                )
                await prisma.participant.update(
                    where=ParticipantWhereInput(email=email),
                    data=ParticipantUpdateInput(charteEmailSent=True),
                )
            except Exception:
                pass
        else:
            try:
                mailgun_client.send_email(
                    from_email="toss-register@cs-sports.fr",
                    to_email=email,
                    subject="[TOSS 2026] Charte participant",
                    text=txt_content,
                    html=html_content,
                )
                await prisma.participant.update(
                    where=ParticipantWhereInput(email=email),
                    data=ParticipantUpdateInput(charteEmailSent=True),
                )
            except Exception:
                pass





async def send_mail_inscription_participant_email(
    email: str, firstname: str
) -> None:
    general_config = await prisma.generalconfig.find_first()
    html_template = get_html_template_file("mail_inscription_participant.html")
    txt_template = get_html_template_file("mail_inscription_participant.txt")
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
                    subject="[TOSS 2026] Inscription TOSS",
                    body_html=html_content,
                    body_text=txt_content,

                )
            except Exception:
                pass
        else:
            try:
                mailgun_client.send_email(
                    from_email="toss-register@cs-sports.fr",
                    to_email=email,
                    subject="[TOSS 2026] Inscription TOSS",
                    html=html_content,
                )
            except Exception:
                pass


async def send_host_rez_email(
    email: str, firstname: str, lastname: str
) -> None:
    general_config = await prisma.generalconfig.find_first()
    html_template = get_html_template_file("mail_rez_hebergeur.html")
    txt_template = get_html_template_file("mail_rez_hebergeur.txt")
    content = {
        "FIRSTNAME": firstname,
        "LASTNAME": lastname,
    }
    html_content = fill_template(html_template, content)
    txt_content = fill_template(txt_template, content)

    if general_config.canSendEmails == True:
        if general_config.mailClient == mailClient.SES:

            try:
                email_client.send_email(
                    to_address=email,
                    subject="[TOSS 2026] Accord d'hebergement",
                    body_html=html_content,
                    body_text=txt_content,
                )
            except Exception:
                pass
        else:
            try:
                mailgun_client.send_email(
                    from_email="toss-register@cs-sports.fr",
                    to_email=email,
                    subject="[TOSS 2026] Accord d'hebergement",
                    text=txt_content,
                    html=html_content,
                )
            except Exception:
                pass
            

async def send_participant_rez_email(
    email: str, firstname: str
) -> None:
    general_config = await prisma.generalconfig.find_first()
    html_template = get_html_template_file("mail_rez_participant.html")
    txt_template = get_html_template_file("mail_rez_participant.txt")
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
                    subject="[TOSS 2026] Inscription logement en résidence",
                    body_html=html_content,
                    body_text=txt_content,
                )
            except Exception:
                pass
        else:
            try:
                mailgun_client.send_email(
                    from_email="toss-register@cs-sports.fr",
                    to_email=email,
                    subject="[TOSS 2026] Inscription logement en résidence",
                    text=txt_content,
                    html=html_content,
                )
            except Exception:
                pass

async def send_mail_inscription_equipe(
    email: str, firstname: str, name: str, equipe: str,
) -> None:
    general_config = await prisma.generalconfig.find_first()
    html_template = get_html_template_file("mail_inscription_equipe.html")
    txt_template = get_html_template_file("mail_inscription_equipe.txt")
    content = {
        "FIRSTNAME": firstname,
        "SPORTNAME": name,
        "TEAMNAME": equipe,
        
    }
    html_content = fill_template(html_template, content)
    txt_content = fill_template(txt_template, content)

    if general_config.canSendEmails == True:
        if general_config.mailClient == mailClient.SES:

            try:
                email_client.send_email(
                    to_address=email,
                    subject="[TOSS 2026] Inscription Equipe",
                    body_html=html_content,
                    body_text=txt_content,

                )
                
            except Exception:
                pass
        else:
            try:
                mailgun_client.send_email(
                    from_email="toss-register@cs-sports.fr",
                    to_email=email,
                    subject="[TOSS 2026] Passage en liste d'attente",
                    html=html_content,
                )
            except Exception:
                pass
            
            
async def send_mail_passage_liste_attente(
    email: str, firstname: str
) -> None:
    general_config = await prisma.generalconfig.find_first()
    html_template = get_html_template_file("mail_passage_liste_attente.html")
    txt_template = get_html_template_file("mail_passage_liste_attente.txt")
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
                    subject="[TOSS 2026] Passage en liste d'attente",
                    body_html=html_content,
                    body_text=txt_content,

                )
                
            except Exception:
                pass
        else:
            try:
                mailgun_client.send_email(
                    from_email="toss-register@cs-sports.fr",
                    to_email=email,
                    subject="[TOSS 2026] Passage en liste d'attente",
                    html=html_content,
                )
            except Exception:
                pass
            
            

async def send_mail_selectionne(
    email: str, firstname: str
) -> None:
    general_config = await prisma.generalconfig.find_first()
    html_template = get_html_template_file("mail_selectionne.html")
    txt_template = get_html_template_file("mail_selectionne.txt")
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
                    subject="[TOSS 2026] Equipe Selectionnée",
                    body_html=html_content,
                    body_text=txt_content,

                )
                
            except Exception:
                pass
        else:
            try:
                mailgun_client.send_email(
                    from_email="toss-register@cs-sports.fr",
                    to_email=email,
                    subject="[TOSS 2026] Equipe Selectionnée",
                    html=html_content,
                )
            except Exception:
                pass
            
            

            
async def send_mail_inscription_finalisee(
    email: str, firstname: str
) -> None:
    general_config = await prisma.generalconfig.find_first()
    html_template = get_html_template_file("mail_inscription_finalisee.html")
    txt_template = get_html_template_file("mail_inscription_finalisee.txt")
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
                    subject="[TOSS 2026] Insciption Equipe Finalisée",
                    body_html=html_content,
                    body_text=txt_content,

                )
                
            except Exception:
                pass
        else:
            try:
                mailgun_client.send_email(
                    from_email="toss-register@cs-sports.fr",
                    to_email=email,
                    subject="[TOSS 2026] Insciption Equipe Finalisée",
                    html=html_content,
                )
            except Exception:
                pass
            
            
            
async def send_participant_selected_email(
    email: str, firstname: str, sport_link: str, sport_name: str, team_name: str
) -> None:
    """
    Send email notification to a team participant when their team is selected for the principal list.
    Includes a sport-specific link for caution payment.
    """
    general_config = await prisma.generalconfig.find_first()
    html_template = get_html_template_file("mail_selectionne_caution.html")  # Use the caution template
    txt_template = get_html_template_file("mail_selectionne_caution.txt")    # Text version
    
    content = {
        "FIRSTNAME": firstname,
        "SPORT_NAME": sport_name,
        "TEAM_NAME": team_name,
        "CAUTION_LINK": sport_link  # This will replace {{CAUTION_LINK}} in the template
    }
    
    html_content = fill_template(html_template, content)
    txt_content = fill_template(txt_template, content)

    if general_config.canSendEmails == True:
        if general_config.mailClient == mailClient.SES:
            try:
                email_client.send_email(
                    to_address=email,
                    subject=f"[TOSS 2026] Votre équipe {team_name} est sélectionnée pour le {sport_name}",
                    body_html=html_content,
                    body_text=txt_content,
                )
            except Exception as e:
                print(f"Failed to send email via SES: {e}")
        else:
            try:
                mailgun_client.send_email(
                    from_email="toss-register@cs-sports.fr",
                    to_email=email,
                    subject=f"[TOSS 2026] Votre équipe {team_name} est sélectionnée pour le {sport_name}",
                    html=html_content,
                    text=txt_content
                )
            except Exception as e:
                print(f"Failed to send email via Mailgun: {e}")
                
                
                

            
            
async def send_participant_com_email(
    email: str, firstname: str, sportId: int
) -> None:


    general_config = await prisma.generalconfig.find_first()
    try:
        html_template = get_html_template_file(f"mail_com_1/com_{sportId}.html")
    except FileNotFoundError:
        html_template = get_html_template_file("mail_com_1/com.html")
    try:
        txt_template = get_html_template_file(f"mail_com_1/com_{sportId}.txt")
    except FileNotFoundError:
        txt_template = get_html_template_file("mail_com_1/com.txt")
    
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
                    subject=f"[TOSS 2026] Le TOSS c'est bientot !",
                    body_html=html_content,
                    body_text=txt_content,
                )
            except Exception as e:
                print(f"Failed to send email via SES: {e}")
        else:
            try:
                mailgun_client.send_email(
                    from_email="toss-register@cs-sports.fr",
                    to_email=email,
                    subject=f"[TOSS 2026] Le TOSS c'est bientot !",
                    html=html_content,
                    text=txt_content
                )
            except Exception as e:
                print(f"Failed to send email via Mailgun: {e}")
                
                
                
            
            
async def send_participant_com_email2(
    email: str, firstname: str, sportId: int
) -> None:


    general_config = await prisma.generalconfig.find_first()
    html_template = get_html_template_file(f"mail_com_2/com.html")
    txt_template = get_html_template_file(f"mail_com_2/com.txt")
    
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
                    subject=f"[TOSS 2026] Questionnaire de satisfaction",
                    body_html=html_content,
                    body_text=txt_content,
                )
            except Exception as e:
                print(f"Failed to send email via SES: {e}")
        else:
            try:
                mailgun_client.send_email(
                    from_email="toss-register@cs-sports.fr",
                    to_email=email,
                    subject=f"[TOSS 2026]  Questionnaire de satisfaction",
                    html=html_content,
                    text=txt_content
                )
            except Exception as e:
                print(f"Failed to send email via Mailgun: {e}")