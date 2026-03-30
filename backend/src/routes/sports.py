from typing import List
from fastapi import APIRouter, Depends, Body
from prisma.models import Participant
from fastapi import Query
from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional
from prisma.models import Sport
from datetime import datetime

from prisma.types import (
    SportCreateInput,
    SportInclude,
    SportWhereUniqueInput,
    FindManyTeamArgsFromSport,
    TeamIncludeFromTeamRecursive1,
    FindManyParticipantArgs,
)

from infra.prisma import getPrisma  # type: ignore
from routes.auth.utils import check_super_admin, check_token, check_admin  # type: ignore

sports_router = APIRouter(
    prefix="/sports",
    tags=["sports"],
    dependencies=[Depends(check_token)],
)
prisma = getPrisma()


@sports_router.get("", response_model=List[Sport])
async def get_all_sports():
    packs = await prisma.sport.find_many()
    return packs

@sports_router.get("/availability-info")
async def get_sports_availability_info():
    """
    Retourne pour chaque sport le nombre d'équipes sélectionnées/inscrites et les places restantes.
    Accessible aux participants pour qu'ils puissent voir s'ils doivent se dépêcher.
    """
    sports = await prisma.sport.find_many(
        include={
            "teams": True
        }
    )
    
    result = []
    for sport in sports:
        # Compter les équipes en PrincipalList (sélectionnées) ET Validated (inscrites)
        selected_and_validated_count = len([t for t in sport.teams if t.status in ['PrincipalList', 'Validated']])
        
        # Pour les sports collectifs : nombre d'équipes sélectionnées/inscrites / nombre max d'équipes
        # Pour les sports individuels : nombre de places restantes (nbOfTeams - équipes sélectionnées/inscrites)
        if sport.isCollective:
            # Sport collectif : on affiche le nombre d'équipes sélectionnées/inscrites
            result.append({
                "sport_id": sport.id,
                "sport_name": sport.sport,
                "is_collective": True,
                "selected_teams": selected_and_validated_count,
                "max_teams": sport.nbOfTeams,
                "remaining_spots": sport.nbOfTeams - selected_and_validated_count if sport.nbOfTeams else None
            })
        else:
            # Sport individuel : on affiche les places restantes
            result.append({
                "sport_id": sport.id,
                "sport_name": sport.sport,
                "is_collective": False,
                "selected_teams": selected_and_validated_count,
                "max_teams": sport.nbOfTeams,
                "remaining_spots": sport.nbOfTeams - selected_and_validated_count if sport.nbOfTeams else None
            })
    
    return result

@sports_router.get(
    "/{sport_id}", response_model=Sport, dependencies=[Depends(check_admin)]
)
async def get_sport(sport_id: int):
    sport = await prisma.sport.find_unique(
        where=SportWhereUniqueInput(id=sport_id),
        include=SportInclude(
            teams=FindManyTeamArgsFromSport(
                include=TeamIncludeFromTeamRecursive1(
                    participants=True, school=True
                )
            ),
            pools=True 
        ),
    )
    return sport


@sports_router.get("/{sport_id}/pack-ratio", dependencies=[Depends(check_super_admin)])
async def get_pack_ratio(sport_id: int):
    # Fetch the sport with its teams, participants and pack information
    sport = await prisma.sport.find_unique(
        where={"id": sport_id},
        include={
            "teams": {
                "include": {
                    "participants": {
                        "include": {"pack": True}  # Ensure you include the pack object so you can access pack.id
                    }
                }
            }
        },
    )
    
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")
    
    count = 0
    for team in sport.teams or []:
        if team.status=='PrincipalList' or team.status=='Validated':
            for participant in team.participants or []:
                if participant.pack and participant.pack.id in [17]:
                    count += 1
    
    max_participants = sport.nbOfTeams * sport.nbPlayersMax if sport.nbOfTeams and sport.nbPlayersMax else 0
    
    ratio = count / max_participants if max_participants > 0 else None
    
    return {
        "ratio": ratio
    }
    
    
@sports_router.get("/team-status-count/all",dependencies=[Depends(check_super_admin)])
async def get_team_status_counts():
    # Fetch all sports including their teams
    sports = await prisma.sport.find_many(
        include={
            "teams": True
        }
    )
    
    result = []
    for sport in sports:
        status_counts = {}
        for team in sport.teams or []:
            status = team.status
            status_counts[status] = status_counts.get(status, 0) + 1
        
        result.append({
            "sport_id": sport.id,
            "sport": sport.sport,
            "team_status_counts": status_counts,
            "max_teams": sport.nbOfTeams if sport.nbOfTeams else 0,
        })
    
    return result

@sports_router.post(
    "/",
    response_model=Sport,
    dependencies=[Depends(check_super_admin)],
)
async def create_sport(
    sport: str,
    nb_of_teams: int,
    nb_players_min: int,
    nb_players_max: int,
    is_collective: bool,
):
    new_sport = await prisma.sport.create(
        data=SportCreateInput(
            sport=sport,
            nbOfTeams=nb_of_teams,
            nbPlayersMin=nb_players_min,
            nbPlayersMax=nb_players_max,
            isCollective=is_collective,
        )
    )
    return new_sport


@sports_router.put(
    "/{sport_id}",
    response_model=Sport,
    dependencies=[Depends(check_super_admin)],
)
async def update_sport(
    sport_id: int,
    sport: str,
    nb_of_teams: int,
    nb_players_min: int,
    nb_players_max: int,
    is_collective: bool,
):
    updated_sport = await prisma.sport.update(
        where=SportWhereUniqueInput(id=sport_id),
        data=SportCreateInput(
            sport=sport,
            nbOfTeams=nb_of_teams,
            nbPlayersMin=nb_players_min,
            nbPlayersMax=nb_players_max,
            isCollective=is_collective,
        ),
    )
    return updated_sport


@sports_router.delete("/{sport_id}", dependencies=[Depends(check_super_admin)])
async def delete_sport(sport_id: int):
    await prisma.sport.delete(where=SportWhereUniqueInput(id=sport_id))


@sports_router.get("/{sport_id}/convocation/{team_id}", dependencies=[Depends(check_admin)])
async def get_sport_convocation(sport_id: int, team_id: int):
    sport = await prisma.sport.find_unique(
        where={"id": sport_id},
        include={
            "teams": {
                "where": {"id": team_id},
                "include": {
                    "participants": {
                        "include": {"school": True,
                                "lieupetitdejsamedi": True,
                                "lieupetitdejdimanche": True,
                                "lieudejsamedi": True,
                                "lieudejdimanche": True,
                                "lieudinersamedi": True, 
                                "pack": True,                                 
                                    }
                    },
                    "pools": {
                        "include": {
                            "Place": True,
                        }
                    }
                }
            }
        },
    )
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")
    return sport


##TOSS-result



#Permet d'avor les poules et les équipes dans un sport sans charger les participants (plus rapide)

@sports_router.get("/{sport_id}/dashboard", response_model=Sport, dependencies=[Depends(check_admin)])
async def get_sports_dashboard(sport_id:int):
    sport = await prisma.sport.find_unique(
        where={"id": sport_id},        
        include={
            "placesSaturday": True,
            "placesSunday": True,
        }
    )
    return sport


#permet de tout charger (poules, équipes, match) dans un sport

@sports_router.get("/{sport_id}/pool_team_match_place", response_model=Sport, dependencies=[Depends(check_admin)])
async def get_sport_all(sport_id: int):
    sport = await prisma.sport.find_unique(
        where={"id": sport_id},
        include={
            "placesSaturday": True,
            "placesSunday": True,
            "pools": {
                "include": {
                    "Place": True,
                    "teams": {
                        "include": {
                            "school": True,
                        }
                    }
                },
                "orderBy": {"id": "asc"},
            },
            "matches": {  
                "include": {
                    "teamOne": {"include": {"school": True}},
                    "teamTwo": {"include": {"school": True}},
                    "place": True,
                }
            }
        },
    )
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")
    return sport



@sports_router.get("/{sport_id}/pools", response_model=Sport, dependencies=[Depends(check_admin)])
async def get_sport_pools(sport_id: int):
    # Fetch the sport with its pools ordered by id
    sport = await prisma.sport.find_unique(
        where={"id": sport_id},
        include={
            "placesSaturday": True,
            "placesSunday": True,
            "pools": {
                "include": {
                    "Place": True,
                    "teams": {
                        "include": {
                            "school": True,
                            "participants": True,
                        }
                    }
                },
                "orderBy": {"id": "asc"},  # Ensure pools are ordered by id in ascending order
            }
        },
    )

    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")

    return sport

#Permet d'avor les équipes dans un sport sans charger les participants (plus rapide)

@sports_router.get("/{sport_id}/teams", response_model=Sport, dependencies=[Depends(check_admin)])
async def get_sport_teams(sport_id: int, is_selected_for_knockout: bool = Query(None), include_participants: bool = Query(False)):
    # Si include_participants est True, on charge aussi les participants (pour les catégories de poids)
    teams_include = {
        "school": True,
    }
    
    if include_participants:
        teams_include["participants"] = True
    
    sport = await prisma.sport.find_unique(
        where={"id": sport_id},
        include={
            "teams": {
                "include": teams_include,
                # Filter teams by knockout stage selection if provided
                "where": {"isSelectedforKnockoutStage": is_selected_for_knockout} if is_selected_for_knockout is not None else {}
            }
        },
    )

    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")

    return sport


##Modificationd des propriétés des sports 

# Update schema for partial updates
class SportUpdate(BaseModel):
    sport: Optional[str] = None
    poolMatchLength: Optional[int] = None
    nonPoolMatchLength: Optional[int] = None  
    startTimeSunday: Optional[datetime] = None
    nbPlayersMin: Optional[int] = None
    nbPlayersMax: Optional[int] = None
    nbOfTeams: Optional[int] = None
    pointsperwin: Optional[int] = None
    pointsperdraw: Optional[int] = None
    pointsperdefeat: Optional[int] = None
    tiebreakerOrder: Optional[List[str]] = None


# Update route
@sports_router.put("/modif/{sport_id}",dependencies=[Depends(check_admin)])
async def update_sport(sport_id: int, updates: SportUpdate = Body(...)):
    # Ensure the sport exists
    sport = await prisma.sport.find_unique(where={"id": sport_id})
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")

    # Prepare update data
    update_data = updates.dict(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

    # Perform the update
    updated_sport = await prisma.sport.update(
        where={"id": sport_id},
        data=update_data,
    )
    return updated_sport


@sports_router.get("/{sport_id}/schools", dependencies=[Depends(check_admin)])
async def get_sport_schools(sport_id: int):
    """
    Récupère toutes les écoles qui participent à un sport (via leurs équipes).
    """
    sport = await prisma.sport.find_unique(
        where={"id": sport_id},
        include={
            "teams": {
                "include": {
                    "school": True
                }
            }
        }
    )
    
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")
    
    # Extraire les écoles uniques
    schools_dict = {}
    for team in sport.teams:
        if team.school:
            school_id = team.school.id
            if school_id not in schools_dict:
                schools_dict[school_id] = {
                    "id": team.school.id,
                    "name": team.school.name,
                    "isInIDF": team.school.isInIDF,
                    "isDeleg": team.school.isDeleg,
                }
    
    return {
        "sport_id": sport_id,
        "sport_name": sport.sport,
        "schools": list(schools_dict.values())
    }
