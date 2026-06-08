import os
from pydantic import BaseModel
from typing import Annotated, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from prisma.models import Team, User
from prisma.types import (
    TeamCreateInput,
    TeamUpdateInput,
    TeamWhereInput,
    TeamInclude,
    ParticipantWhereInput,
)


from enums import TeamStatus, EnumUserStatus
from .utils import (
    ParticipantInput,
    add_participant_to_team,
    check_and_update_team_amount_to_pay_then_get_team,
    get_team_if_allowed,
    send_charte_email,
    send_host_rez_email,
    send_participant_rez_email,
    send_mail_inscription_participant_email,
    send_mail_inscription_finalisee,
    send_mail_passage_liste_attente,
    send_mail_selectionne,
    send_mail_inscription_equipe,
    send_participant_selected_email,
)
from .caution_links import SPORT_CAUTION_LINKS, DEFAULT_CAUTION_LINK

from infra.prisma import getPrisma  # type: ignore
from routes.auth.utils import check_super_admin, check_user, check_admin, generate_password  # type: ignore

teams_router = APIRouter(
    prefix="/teams",
    tags=["teams"],
)
prisma = getPrisma()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


@teams_router.post(
    "/",
    response_model=Team,
)
async def create_team(
    name: str,
    sportId: int,
    participants: List[ParticipantInput],
    user: Annotated[User, Depends(check_user)],
    level: str = "",
):
    general_config = await prisma.generalconfig.find_first()
    if general_config is None:
        raise HTTPException(status_code=500, detail="General config not found")

    if not general_config.registration_open:
        raise HTTPException(
            status_code=400, detail="Registration is still closed"
        )

    existing_team = await prisma.team.find_first(
        where=TeamWhereInput(name=name)
    )
    if existing_team:
        raise HTTPException(
            status_code=400, detail="A team with this name already exists"
        )

    team = await prisma.team.create(
        data=TeamCreateInput(
            name=name,
            sport_id=sportId,
            status=TeamStatus.Incomplete,
            leader_id=user.id,
            school_id=user.school_id,
        )
    )

    for new_participant in participants:
        await add_participant_to_team(
            team_id=team.id,
            school_id=team.school_id,
            new_participant=new_participant,
            sport_id=sportId,
        )

    team, _ = await check_and_update_team_amount_to_pay_then_get_team(
        team_id=team.id
    )
    if team is None or team.participants is None or len(team.participants) == 0:
        try:
            await prisma.team.delete(where=TeamWhereInput(id=team.id))
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail="Error while creating team: no participant added",
        )
    return team


@teams_router.put("/{team_id}", response_model=Team)
async def update_team(
    team_id: int,
    name: str,
    user: Annotated[User, Depends(check_user)],
):
    existing_team = await get_team_if_allowed(team_id, user)

    team = await prisma.team.update(
        data=TeamUpdateInput(name=name),
        where=TeamWhereInput(id=existing_team.id),
    )

    return team

@teams_router.put(
    "/{team_id}/status",
    response_model=Team,
    dependencies=[Depends(check_admin)],
)
async def update_team_status(team_id: int, status: TeamStatus):
    existing_team = await prisma.team.find_unique(
        where=TeamWhereInput(id=team_id),
        include={"participants": True, "sport": True}  # Include participants and sport
    )
    
    if not existing_team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    team = await prisma.team.update(
        data=TeamUpdateInput(status=status),
        where=TeamWhereInput(id=team_id),
    )
    
    # Get sport-specific link
    sport_id = existing_team.sportId
    sport_name = existing_team.sport.sport if existing_team.sport else "your sport"
    sport_link = SPORT_CAUTION_LINKS.get(sport_id, DEFAULT_CAUTION_LINK)
    
    email = None
    firstname = None
    if existing_team.teamAdminUserId:
        admin_user = await prisma.user.find_unique(
            where={"id": existing_team.teamAdminUserId}
        )
        if admin_user:
            email = admin_user.email
            firstname = admin_user.firstname
    
    # Send email based on the new status
    try:
        if email:
            if status == TeamStatus.Waiting:
                await send_mail_passage_liste_attente(
                    email, 
                    firstname,
                )
            elif status == TeamStatus.PrincipalList:
                # Send to team admin
                await send_mail_selectionne(
                    email,
                    firstname,
                )
                
               # Send to all team participants
                if existing_team.participants:
                    # Get the team's school information
                    school = None
                    if existing_team.schoolId:
                        school = await prisma.school.find_unique(
                            where={"id": existing_team.schoolId}
                        )
                    
                    # Check if the team's school is a delegation
                    is_delegation_school = school and school.isDeleg
                    
                    # Only send emails if the school is not a delegation
                    if not is_delegation_school:
                        for participant in existing_team.participants:
                            if participant.isCaptain:
                                continue  # Skip captain as they are already notified as admin
                                
                            try:
                                await send_participant_selected_email(
                                    participant.email,
                                    participant.firstname,
                                    sport_link,
                                    sport_name,
                                    existing_team.name  # Also include team name
                                )
                            except Exception as e:
                                print(f"Failed to send email to participant {participant.id}: {e}")
            elif status == TeamStatus.Validated:
                await send_mail_inscription_finalisee(
                    email,
                    firstname,
                )
    except Exception as e:
        print(f"Failed to send status email: {e}")
    
    return team



@teams_router.put(
    "/{team_id}/amount-paid",
    response_model=Team,
    dependencies=[Depends(check_super_admin)],
)
async def update_team_amount_paid(team_id: int, amount_paid_in_cents: int):
    team = await prisma.team.update(
        data=TeamUpdateInput(amountPaidInCents=amount_paid_in_cents),
        where=TeamWhereInput(id=team_id),
    )

    return team

@teams_router.get("", response_model=List[Team])
async def get_teams(user: Annotated[User, Depends(check_user)]):
    if user.status == EnumUserStatus.SuperAdminStatus:
        teams = await prisma.team.find_many(
            include=TeamInclude(
                participants=True,
                sport=True,
            )
        )
        return teams

    elif (user.status == EnumUserStatus.RespoDelegStatus
    and user.school_id is not None):
        teams = await prisma.team.find_many(
            where=TeamWhereInput(school_id=user.school_id),
            include=TeamInclude(
                participants=True,
                sport=True,
            )
        )
        return teams

    elif (
        user.status == EnumUserStatus.AdminStatus
        and user.school_id is not None
    ):
        teams = await prisma.team.find_many(
            where=TeamWhereInput(
                school_id=user.school_id
            ),
            include=TeamInclude(
                participants=True,
                sport=True,
            ),
        )
        return teams

    teams = await prisma.team.find_many(
        where=TeamWhereInput(leader_id=user.id),
        include=TeamInclude(
            participants=True,
            sport=True,
        ),
    )
    return teams



@teams_router.delete("/{team_id}/admin", dependencies=[Depends(check_admin)])
async def delete_team_by_admin(team_id: int):
    # First check if the team exists
    existing_team = await prisma.team.find_unique(
        where=TeamWhereInput(id=team_id),
        include=TeamInclude(participants=True)
    )

    if not existing_team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Delete all participants associated with the team
    if existing_team.participants:
        for participant in existing_team.participants:
            await prisma.participant.delete(
                where=ParticipantWhereInput(id=participant.id)
            )
    
    # Delete the team itself
    deleted_team = await prisma.team.delete(
        where=TeamWhereInput(id=team_id)
    )
    
    return {
        "message": f"Team '{deleted_team.name}' and all its participants have been deleted successfully",
        "team_id": team_id,
        "team_name": deleted_team.name,
        "deleted_participants_count": len(existing_team.participants) if existing_team.participants else 0
    }






##Equipes pour TOSS Services: Permet de filter par status et par sport
@teams_router.get("/toss_services/filter", response_model=List[Team])
async def get_teams_by_status_and_sport(
    user: Annotated[User, Depends(check_admin)],  # Only admins can access this endpoint
    status: Optional[str] = None,  # Change from TeamStatus to str
    sport_id: Optional[int] = None,
    logement_rez_ok: Optional[bool] = None,  # Filter for logementRezOk
    caution_ok: Optional[bool] = None,       # New filter for cautionOK
):
    where_conditions = {}
    
    # Add status filter if provided
    if status:
        try:
            # Try to convert string to enum value
            team_status = TeamStatus[status]
            where_conditions["status"] = team_status
        except KeyError:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid status: {status}. Valid options are: {', '.join([s.name for s in TeamStatus])}"
            )
    
    # Add sport filter if provided
    if sport_id:
        where_conditions["sport_id"] = sport_id
    
    where_input = TeamWhereInput(**where_conditions)
    
    # Only include participants if status is "AwaitingAuthorization" or if logement_rez_ok or caution_ok is provided
    include_participants = False
    if (status and status.lower() == "awaitingauthorization") or (logement_rez_ok is not None) or (caution_ok is not None):
        include_participants = True
    
    teams = await prisma.team.find_many(
        where=where_input,
        include=TeamInclude(
            sport=True,
            school=True,
            participants=include_participants,
        ),
    )
    
    # If either logement_rez_ok or caution_ok is provided and participants are included, filter teams accordingly
    if (logement_rez_ok is not None or caution_ok is not None) and include_participants:
        filtered_teams = []
        for team in teams:
            if team.participants:
                valid = True
                # Check logementRezOk filter if provided
                if logement_rez_ok is not None:
                    valid = valid and any(participant.logementRezOk == logement_rez_ok for participant in team.participants)
                # For caution_ok, only consider teams that are Validated
                if caution_ok is not None:
                    valid = valid and (team.status == TeamStatus.Validated) and any(participant.cautionOK == caution_ok for participant in team.participants)
                if valid:
                    filtered_teams.append(team)
        teams = filtered_teams
    
    return teams


@teams_router.get("/{team_id}", response_model=Team)
async def get_team(team_id: int, user: Annotated[User, Depends(check_user)]):

    return await get_team_if_allowed(team_id, user)

"""
@teams_router.delete("/{team_id}")
async def delete_team(team_id: int, user: Annotated[User, Depends(check_user)]):
    existing_team = await get_team_if_allowed(team_id, user)

    if existing_team.participants is not None:
        for participant in existing_team.participants:
            await prisma.participant.delete(
                where=ParticipantWhereInput(id=participant.id)
            )

    await prisma.team.delete(
        where=TeamWhereInput(id=existing_team.id),
        include=TeamInclude(participants=True),
    )

"""
### Pour avoir les premières équipes de chaque sport ###


@teams_router.get("/knockout/teams/{sport_id}")
async def get_top_teams(sport_id: int):
    pools = await prisma.pool.find_many(
        where={"sportId": sport_id},
        include={"teams": True}
    )
    top_teams = []
    for pool in pools:
        # Sort teams by tournament points, descending
        sorted_teams = sorted(pool.teams, key=lambda t: t.tournamentPoints, reverse=True)
        # Take top 2 teams from each pool
        top_teams.extend(sorted_teams[:2])
    return top_teams

class TeamSelectionUpdate(BaseModel):
    isSelectedforKnockoutStage: bool

@teams_router.put("/{team_id}/select-for-sunday")
async def update_team_selection_for_sunday(team_id: int, selection: TeamSelectionUpdate):
    # Update the team selection status
    team = await prisma.team.update(
        where={"id": team_id},
        data={"isSelectedforKnockoutStage": selection.isSelectedforKnockoutStage}
    )
    return {
        "message": f"Team {team.name} selection updated for Sunday",
        "team": team
    }
    
class IsMorningUpdate(BaseModel):
    isMorning: bool

@teams_router.put("/pools/{pool_id}/isMorning", response_model=dict)
async def update_teams_in_pool_morning(
    pool_id: int,
    selection: IsMorningUpdate
):
    # Fetch the pool with its associated teams
    pool = await prisma.pool.find_unique(
        where={"id": pool_id},
    )
    
    await prisma.pool.update(
            where={"id": pool_id},
            data={"isMorning": selection.isMorning}
        )
    
    if not pool:
        raise HTTPException(status_code=404, detail="No teams found for this pool")

    # Update all teams in the pool
    updated_count = 0
    
    return {
        "message": f"Updated {updated_count} teams in pool {pool_id} with isMorning={selection.isMorning}",
        "updated_teams": updated_count,
    }



class PoolPlaceUpdate(BaseModel):
    place_id: int

@teams_router.put("/pools/{pool_id}/place", response_model=dict)
async def update_pool_place(
    pool_id: int,
    update: PoolPlaceUpdate
):
    # Fetch the pool
    pool = await prisma.pool.find_unique(
        where={"id": pool_id}
    )
    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")

    # Update the PlaceId of the pool
    updated_pool = await prisma.pool.update(
        where={"id": pool_id},
        data={"PlaceId": update.place_id}
    )

    return {
        "message": f"Updated pool {pool_id} with PlaceId={update.place_id}",
        "pool": updated_pool,
    }

class TournamentPointsUpdate(BaseModel):
    tournamentPoints: int

@teams_router.put("/{team_id}/tournamentPoints")
async def update_team_tournament_points(team_id: int, update: TournamentPointsUpdate):
    """
    Update the tournament points of a specific team.
    """
    if update.tournamentPoints < 0:
        raise HTTPException(status_code=400, detail="Points cannot be negative.")

    try:
        # Log the incoming data for debugging
        print(f"Updating team_id {team_id} with points {update.tournamentPoints}")
        
        # Update the team's tournament points
        team = await prisma.team.update(
            where={"id": team_id},
            data={"tournamentPoints": update.tournamentPoints}
        )
        return {
            "message": f"Team {team.name} tournament points updated successfully.",
            "team": team
        }
    except Exception as error:
        print(f"Error updating team points for team_id {team_id}: {error}")
        raise HTTPException(status_code=500, detail="Failed to update team points.")
