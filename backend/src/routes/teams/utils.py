from datetime import datetime
from typing import Annotated, Tuple
from fastapi import HTTPException, Depends
from prisma.models import Team, User, Participant

from prisma.types import (
    TeamWhereInput,
    TeamInclude,
    TeamUpdateInput,
    ParticipantCreateInput,
    ParticipantWhereInput,
    ParticipantUpdateInput,
)
from prisma.enums import EnumUserStatus
from pydantic import BaseModel

from infra.prisma import getPrisma  # type: ignore
from routes.auth.utils import check_user  # type: ignore

prisma = getPrisma()


class ParticipantInput(BaseModel):
    gender: str
    firstname: str
    lastname: str
    dateOfBirth: datetime
    packId: int | None = None
    allergies: str | None = None
    insurance: bool = False


async def get_team_if_allowed(
    team_id: int, user: Annotated[User, Depends(check_user)]
) -> Team:
    if user.status == EnumUserStatus.SuperAdminStatus:
        existing_team = await prisma.team.find_first(
            where=TeamWhereInput(id=team_id),
            include=TeamInclude(participants=True, sport=True),
        )
        if existing_team is None:
            raise HTTPException(
                status_code=400,
                detail="This team does not exist",
            )
        return existing_team

    elif user.status == EnumUserStatus.RespoDelegStatus and user.school_id is not None:
        existing_team = await prisma.team.find_first(
            where=TeamWhereInput(id=team_id, school_id=user.school_id),
            include=TeamInclude(participants=True, sport=True),
        )
        if existing_team is None:
            raise HTTPException(
                status_code=400,
                detail="This user is not a respodélég of this team",
            )
        if user.school_id != existing_team.school_id:
            raise HTTPException(
                status_code=403,
                detail="This user is not a respodélég of this team",
            )
        return existing_team

    elif user.status == EnumUserStatus.AdminStatus:
        existing_team = await prisma.team.find_first(
            where=TeamWhereInput(id=team_id),
            include=TeamInclude(participants=True, sport=True),
        )
        if existing_team is None:
            raise HTTPException(
                status_code=400,
                detail="This team does not exist",
            )
        return existing_team

    else:
        existing_team = await prisma.team.find_first(
            where=TeamWhereInput(id=team_id, leader_id=user.id),
            include=TeamInclude(participants=True, sport=True),
        )
        if existing_team is None:
            raise HTTPException(
                status_code=403,
                detail="This user is not an admin of this team",
            )
    return existing_team


async def add_participant_to_team(
    team_id: int,
    school_id: int,
    new_participant: ParticipantInput,
    sport_id: int,
) -> Participant:

    participant = await prisma.participant.create(
        data=ParticipantCreateInput(
            gender=new_participant.gender,
            firstname=new_participant.firstname,
            lastname=new_participant.lastname,
            birthdate=new_participant.dateOfBirth,
            team_id=team_id,
            sport_id=sport_id,
            pack_id=new_participant.packId,
            allergies=new_participant.allergies,
            insurance=new_participant.insurance,
        ),
    )

    return participant


async def check_and_update_team_amount_to_pay_then_get_team(
    team_id: int, team: Team | None = None
) -> Tuple[Team, int]:
    if team is None:
        team = await prisma.team.find_first(
            where=TeamWhereInput(id=team_id),
            include=TeamInclude(participants=True),
        )

    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")

    return team, 0


async def send_charte_email(
    email: str, firstname: str, charte_password: str, url: str
) -> None:
    pass


async def send_mail_inscription_participant_email(
    email: str, firstname: str
) -> None:
    pass


async def send_host_rez_email(
    email: str, firstname: str, lastname: str
) -> None:
    pass


async def send_participant_rez_email(
    email: str, firstname: str
) -> None:
    pass


async def send_mail_inscription_equipe(
    email: str, firstname: str, name: str, equipe: str,
) -> None:
    pass


async def send_mail_passage_liste_attente(
    email: str, firstname: str
) -> None:
    pass


async def send_mail_selectionne(
    email: str, firstname: str
) -> None:
    pass


async def send_mail_inscription_finalisee(
    email: str, firstname: str
) -> None:
    pass


async def send_participant_selected_email(
    email: str, firstname: str, sport_link: str, sport_name: str, team_name: str
) -> None:
    pass


async def send_participant_com_email(
    email: str, firstname: str, sportId: int
) -> None:
    pass


async def send_participant_com_email2(
    email: str, firstname: str, sportId: int
) -> None:
    pass
