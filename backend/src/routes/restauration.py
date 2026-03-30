# Routes pour la gestion automatique de la restauration
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from prisma.models import Team, Place, Sport
from prisma.enums import PhaseType
from infra.prisma import getPrisma
from routes.auth.utils import check_token, check_admin

restauration_router = APIRouter(
    prefix="/restauration",
    tags=["restauration"],
    dependencies=[Depends(check_token)],
)

prisma = getPrisma()


async def is_team_finalist(team_id: int) -> bool:
    """
    Vérifie si une équipe est finaliste (participe à un match de phase Final ou SemiFinal).
    """
    matches = await prisma.match.find_many(
        where={
            "OR": [
                {"teamOneId": team_id},
                {"teamTwoId": team_id}
            ],
            "phase": {"in": ["Final", "SemiFinal"]}
        }
    )
    
    return len(matches) > 0


class LunchSuggestion(BaseModel):
    """Suggestion d'horaire de déjeuner pour un sport"""
    sport_id: int
    sport_name: str
    suggested_time: str  # Format HH:MM
    place_id: Optional[int] = None
    place_name: Optional[str] = None
    teams_count: int
    participants_count: int


class AutoAssignLunchRequest(BaseModel):
    day: str


@restauration_router.get("/sport/{sport_id}/lunch-suggestions", response_model=List[LunchSuggestion])
async def get_lunch_suggestions(
    sport_id: int, 
    day: Optional[str] = Query(None, regex="^(saturday|sunday)$")
):
    """
    Suggère des horaires de déjeuner pour un sport en fonction des conditions configurées dans le dashboard.
    Regroupe toutes les équipes du même sport.
    """
    # Récupérer le sport pour vérifier les conditions spécifiques
    sport = await prisma.sport.find_unique(where={"id": sport_id})
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")
    
    if not day:
        return []
    
    # Utiliser uniquement les valeurs configurées dans le dashboard
    if day == "saturday":
        if not sport.defaultLunchTimeSaturday or not sport.defaultLunchPlaceSaturdayId:
            return []
        suggested_time = sport.defaultLunchTimeSaturday
        place_id = sport.defaultLunchPlaceSaturdayId
    elif day == "sunday":
        # Pour le dimanche, on ne peut pas savoir si c'est pour les finalistes ou non sans contexte
        # On retourne les valeurs normales (non-finalistes) par défaut
        if not sport.defaultLunchTimeSunday or not sport.defaultLunchPlaceSundayId:
            return []
        suggested_time = sport.defaultLunchTimeSunday
        place_id = sport.defaultLunchPlaceSundayId
    else:
        return []
    
    # Vérifier que le lieu existe
    place = await prisma.place.find_unique(where={"id": place_id})
    if not place:
        return []
    
    # Compter les équipes et participants du sport
    teams = await prisma.team.find_many(
        where={"sportId": sport_id},
        include={"participants": True}
    )
    
    participants_count = sum(len(team.participants) for team in teams)
    
    return [LunchSuggestion(
        sport_id=sport_id,
        sport_name=sport.sport,
        suggested_time=suggested_time,
        place_id=place_id,
        place_name=place.name,
        teams_count=len(teams),
        participants_count=participants_count
    )]


@restauration_router.post("/sport/{sport_id}/auto-assign-lunch", dependencies=[Depends(check_admin)])
async def auto_assign_lunch(
    sport_id: int,
    request: AutoAssignLunchRequest
):
    """
    Assigne automatiquement les horaires de déjeuner à tous les participants d'un sport
    en utilisant uniquement les valeurs configurées dans le dashboard.
    """
    # Valider le jour
    if request.day not in ["saturday", "sunday"]:
        raise HTTPException(status_code=400, detail="Le jour doit être 'saturday' ou 'sunday'.")
    
    # Récupérer le sport pour vérifier les conditions spécifiques
    sport = await prisma.sport.find_unique(where={"id": sport_id})
    if not sport:
        raise HTTPException(status_code=404, detail="Sport non trouvé.")
    
    # Récupérer tous les participants du sport qui ont un pack incluant le déjeuner
    teams = await prisma.team.find_many(
        where={"sportId": sport_id},
        include={"participants": {"include": {"pack": True}}}
    )
    
    # Filtrer les participants qui ont un pack avec déjeuner inclus
    packs = await prisma.pack.find_many(where={"isLunchIncluded": True})
    eligible_pack_ids = [pack.id for pack in packs]
    
    if not eligible_pack_ids:
        raise HTTPException(
            status_code=404,
            detail="Aucun pack avec déjeuner inclus trouvé."
        )
    
    # Déterminer les champs à mettre à jour selon le jour
    if request.day == "saturday":
        place_field = "lieudejsamediId"
        time_field = "heuredejsamedi"
    else:  # sunday
        place_field = "lieudejdimancheId"
        time_field = "heuredejdimanche"
    
    # Mettre à jour tous les participants des équipes du sport
    updated_count = 0
    teams_with_missing_config = []
    
    for team in teams:
        # Pour le dimanche, vérifier si l'équipe est finaliste
        team_place_id = None
        team_time = None
        
        if request.day == "saturday":
            # Pour samedi, utiliser les valeurs configurées
            if not sport.defaultLunchTimeSaturday:
                teams_with_missing_config.append(f"{team.name} (horaire samedi manquant)")
                continue
            if not sport.defaultLunchPlaceSaturdayId:
                teams_with_missing_config.append(f"{team.name} (lieu samedi manquant)")
                continue
            team_time = sport.defaultLunchTimeSaturday
            team_place_id = sport.defaultLunchPlaceSaturdayId
        else:  # sunday
            is_finalist = await is_team_finalist(team.id)
            if is_finalist:
                # Utiliser les conditions pour les finalistes
                if not sport.defaultLunchTimeSundayFinalist:
                    teams_with_missing_config.append(f"{team.name} (horaire dimanche finaliste manquant)")
                    continue
                if not sport.defaultLunchPlaceSundayFinalistId:
                    teams_with_missing_config.append(f"{team.name} (lieu dimanche finaliste manquant)")
                    continue
                team_time = sport.defaultLunchTimeSundayFinalist
                team_place_id = sport.defaultLunchPlaceSundayFinalistId
            else:
                # Utiliser les conditions normales
                if not sport.defaultLunchTimeSunday:
                    teams_with_missing_config.append(f"{team.name} (horaire dimanche manquant)")
                    continue
                if not sport.defaultLunchPlaceSundayId:
                    teams_with_missing_config.append(f"{team.name} (lieu dimanche manquant)")
                    continue
                team_time = sport.defaultLunchTimeSunday
                team_place_id = sport.defaultLunchPlaceSundayId
        
        # Vérifier que le lieu existe pour cette équipe
        team_place = await prisma.place.find_unique(where={"id": team_place_id})
        if not team_place:
            teams_with_missing_config.append(f"{team.name} (lieu ID {team_place_id} introuvable)")
            continue
        
        for participant in team.participants:
            # Vérifier que le participant a un pack éligible
            if participant.packId in eligible_pack_ids:
                await prisma.participant.update(
                    where={"id": participant.id},
                    data={
                        place_field: team_place_id,
                        time_field: team_time
                    }
                )
                updated_count += 1
    
    # Retourner un succès même si certaines équipes ont des configurations manquantes
    response = {
        "status": "success",
        "sport_id": sport_id,
        "sport_name": sport.sport,
        "day": request.day,
        "updated_participants": updated_count
    }
    
    if teams_with_missing_config:
        response["warning"] = f"Configuration manquante pour certaines équipes. Les équipes suivantes n'ont pas été mises à jour: {', '.join(teams_with_missing_config)}"
    
    return response


class AutoAssignBreakfastRequest(BaseModel):
    day: str

class AutoAssignDinnerRequest(BaseModel):
    time: Optional[str] = None
    place_id: Optional[int] = None


@restauration_router.post("/team/{team_id}/auto-assign-breakfast", dependencies=[Depends(check_admin)])
async def auto_assign_breakfast(
    team_id: int,
    request: AutoAssignBreakfastRequest
):
    """
    Assigne automatiquement les horaires de petit-déjeuner à tous les participants d'une équipe
    en utilisant uniquement les valeurs configurées dans le dashboard.
    """
    if request.day not in ["saturday", "sunday"]:
        raise HTTPException(status_code=400, detail="Le jour doit être 'saturday' ou 'sunday'.")
    
    # Vérifier que l'équipe existe
    team = await prisma.team.find_unique(where={"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Équipe non trouvée.")
    
    # Récupérer le sport de l'équipe pour vérifier les conditions spécifiques
    sport = await prisma.sport.find_unique(where={"id": team.sportId})
    if not sport:
        raise HTTPException(status_code=404, detail="Sport non trouvé.")
    
    # Vérifier si l'équipe est finaliste (pour le dimanche)
    is_finalist = False
    if request.day == "sunday":
        is_finalist = await is_team_finalist(team_id)
    
    # Déterminer le lieu et l'horaire selon le jour et le statut finaliste
    final_place_id = None
    final_time = None
    
    if request.day == "saturday":
        if not sport.defaultBreakfastTimeSaturday or not sport.defaultBreakfastPlaceSaturdayId:
            return {
                "status": "success",
                "team_id": team_id,
                "team_name": team.name,
                "day": request.day,
                "updated_participants": 0,
                "message": "Horaire ou lieu de petit-déjeuner du samedi non configuré dans le dashboard. Aucune affectation effectuée."
            }
        final_time = sport.defaultBreakfastTimeSaturday
        final_place_id = sport.defaultBreakfastPlaceSaturdayId
    else:  # sunday
        if is_finalist:
            if not sport.defaultBreakfastTimeSundayFinalist or not sport.defaultBreakfastPlaceSundayFinalistId:
                return {
                    "status": "success",
                    "team_id": team_id,
                    "team_name": team.name,
                    "day": request.day,
                    "updated_participants": 0,
                    "message": "Horaire ou lieu de petit-déjeuner du dimanche (finalistes) non configuré dans le dashboard. Aucune affectation effectuée."
                }
            final_time = sport.defaultBreakfastTimeSundayFinalist
            final_place_id = sport.defaultBreakfastPlaceSundayFinalistId
        else:
            if not sport.defaultBreakfastTimeSunday or not sport.defaultBreakfastPlaceSundayId:
                return {
                    "status": "success",
                    "team_id": team_id,
                    "team_name": team.name,
                    "day": request.day,
                    "updated_participants": 0,
                    "message": "Horaire ou lieu de petit-déjeuner du dimanche non configuré dans le dashboard. Aucune affectation effectuée."
                }
            final_time = sport.defaultBreakfastTimeSunday
            final_place_id = sport.defaultBreakfastPlaceSundayId
    
    # Vérifier que le lieu existe
    place = await prisma.place.find_unique(where={"id": final_place_id})
    if not place:
        return {
            "status": "success",
            "team_id": team_id,
            "team_name": team.name,
            "day": request.day,
            "updated_participants": 0,
            "message": f"Lieu de restauration (ID: {final_place_id}) non trouvé. Aucune affectation effectuée."
        }
    
    # Récupérer les participants de l'équipe qui ont un pack incluant le petit-déjeuner
    packs = await prisma.pack.find_many(where={"isBreakfastIncluded": True})
    eligible_pack_ids = [pack.id for pack in packs]
    
    if not eligible_pack_ids:
        raise HTTPException(
            status_code=404,
            detail="Aucun pack avec petit-déjeuner inclus trouvé."
        )
    
    # Déterminer les champs à mettre à jour selon le jour
    if request.day == "saturday":
        place_field = "lieupetitdejsamediId"
        time_field = "heurepetitdejsamedi"
    else:  # sunday
        place_field = "lieupetitdejdimancheId"
        time_field = "heurepetitdejdimanche"
    
    # Mettre à jour tous les participants de l'équipe
    participants = await prisma.participant.find_many(
        where={
            "teamId": team_id,
            "packId": {"in": eligible_pack_ids}
        }
    )
    
    updated_count = 0
    for participant in participants:
        await prisma.participant.update(
            where={"id": participant.id},
            data={
                place_field: final_place_id,
                time_field: final_time
            }
        )
        updated_count += 1
    
    return {
        "status": "success",
        "team_id": team_id,
        "team_name": team.name,
        "day": request.day,
        "assigned_time": final_time,
        "place_id": final_place_id,
        "place_name": place.name,
        "updated_participants": updated_count
    }


@restauration_router.post("/school/{school_id}/assign-dinner", dependencies=[Depends(check_admin)])
async def assign_dinner(
    school_id: int,
    request: AutoAssignDinnerRequest,
    sport_id: Optional[int] = Query(None)
):
    """
    Assigne les horaires de dîner à tous les participants d'une école.
    Si time et place_id sont fournis, utilise ces valeurs.
    Sinon, utilise les valeurs configurées dans le dashboard.
    Si sport_id est fourni, filtre uniquement les participants du sport concerné.
    """
    # Vérifier que l'école existe
    school = await prisma.school.find_unique(where={"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="École non trouvée.")
    
    # Déterminer le temps et le lieu à utiliser
    if request.time and request.place_id:
        # Utiliser les valeurs fournies (assignation manuelle)
        final_time = request.time
        final_place_id = request.place_id
    else:
        # Utiliser les valeurs du dashboard (assignation automatique)
        if not school.defaultDinnerTime or not school.defaultDinnerPlaceId:
            return {
                "status": "success",
                "school_id": school_id,
                "school_name": school.name,
                "updated_participants": 0,
                "message": "Horaire ou lieu de dîner non configuré dans le dashboard pour cette école. Aucune affectation effectuée."
            }
        final_time = school.defaultDinnerTime
        final_place_id = school.defaultDinnerPlaceId
    
    # Vérifier que le lieu existe
    place = await prisma.place.find_unique(where={"id": final_place_id})
    if not place:
        return {
            "status": "success",
            "school_id": school_id,
            "school_name": school.name,
            "updated_participants": 0,
            "message": f"Lieu de restauration (ID: {final_place_id}) non trouvé. Aucune affectation effectuée."
        }
    
    # Récupérer les participants de l'école qui ont un pack incluant le dîner
    packs = await prisma.pack.find_many(where={"isDinnerIncluded": True})
    eligible_pack_ids = [pack.id for pack in packs]
    
    if not eligible_pack_ids:
        raise HTTPException(
            status_code=404,
            detail="Aucun pack avec dîner inclus trouvé."
        )
    
    # Construire la condition where pour les participants
    where_condition = {
        "schoolId": school_id,
        "packId": {"in": eligible_pack_ids}
    }
    
    # Si un sport_id est fourni, filtrer par sport
    if sport_id:
        teams = await prisma.team.find_many(where={"sportId": sport_id})
        team_ids = [team.id for team in teams]
        if not team_ids:
            return {
                "status": "success",
                "school_id": school_id,
                "school_name": school.name,
                "updated_participants": 0,
                "message": "Aucune équipe trouvée pour ce sport."
            }
        where_condition["teamId"] = {"in": team_ids}
    
    # Mettre à jour tous les participants de l'école (filtrés par sport si nécessaire)
    participants = await prisma.participant.find_many(where=where_condition)
    
    updated_count = 0
    for participant in participants:
        await prisma.participant.update(
            where={"id": participant.id},
            data={
                "lieudinersamediId": final_place_id,
                "heuredinersamedi": final_time
            }
        )
        updated_count += 1
    
    return {
        "status": "success",
        "school_id": school_id,
        "school_name": school.name,
        "assigned_time": final_time,
        "place_id": final_place_id,
        "place_name": place.name,
        "updated_participants": updated_count
    }


@restauration_router.post("/school/{school_id}/auto-assign-dinner", dependencies=[Depends(check_admin)])
async def auto_assign_dinner(
    school_id: int,
    request: AutoAssignDinnerRequest
):
    """
    Assigne automatiquement les horaires de dîner à tous les participants d'une école
    en utilisant uniquement les valeurs configurées dans le dashboard.
    (Endpoint de compatibilité - redirige vers assign-dinner)
    """
    return await assign_dinner(school_id, request, None)


@restauration_router.get("/pool/{pool_id}/assignments")
async def get_pool_assignments(
    pool_id: int,
    day: str = Query(..., regex="^(saturday|sunday)$"),
    meal_type: str = Query(..., regex="^(breakfast|lunch)$")
):
    """
    Récupère les affectations existantes pour une poule et un jour donné.
    Retourne les affectations par équipe.
    """
    pool = await prisma.pool.find_unique(
        where={"id": pool_id},
        include={"teams": {"include": {"participants": {"include": {"pack": True}}}}}
    )
    
    if not pool:
        raise HTTPException(status_code=404, detail="Poule non trouvée.")
    
    # Déterminer les champs selon le jour et le type de repas
    if meal_type == "breakfast":
        if day == "saturday":
            place_field = "lieupetitdejsamediId"
            time_field = "heurepetitdejsamedi"
        else:
            place_field = "lieupetitdejdimancheId"
            time_field = "heurepetitdejdimanche"
    else:  # lunch
        if day == "saturday":
            place_field = "lieudejsamediId"
            time_field = "heuredejsamedi"
        else:
            place_field = "lieudejdimancheId"
            time_field = "heuredejdimanche"
    
    # Récupérer les packs éligibles
    if meal_type == "breakfast":
        packs = await prisma.pack.find_many(where={"isBreakfastIncluded": True})
    else:
        packs = await prisma.pack.find_many(where={"isLunchIncluded": True})
    
    eligible_pack_ids = [pack.id for pack in packs]
    
    # Regrouper les affectations par équipe
    team_assignments = []
    for team in pool.teams:
        # Récupérer les participants de l'équipe avec les packs éligibles
        participants = [p for p in team.participants if p.packId in eligible_pack_ids]
        
        if not participants:
            continue
        
        # Vérifier les affectations (on prend la première valeur non-null trouvée)
        place_id = None
        time = None
        
        for participant in participants:
            if place_id is None:
                place_id = getattr(participant, place_field, None)
            if time is None:
                time = getattr(participant, time_field, None)
            if place_id and time:
                break
        
        if place_id or time:
            team_assignments.append({
                "team_id": team.id,
                "team_name": team.name,
                "place_id": place_id,
                "time": time,
                "participants_count": len(participants)
            })
    
    # Vérifier s'il y a une affectation commune à toute la poule
    common_place_id = None
    common_time = None
    
    if team_assignments:
        # Vérifier si toutes les équipes ont la même affectation
        first_assignment = team_assignments[0]
        all_same = all(
            ta["place_id"] == first_assignment["place_id"] and 
            ta["time"] == first_assignment["time"]
            for ta in team_assignments
        )
        
        if all_same:
            common_place_id = first_assignment["place_id"]
            common_time = first_assignment["time"]
    
    return {
        "pool_id": pool_id,
        "pool_name": pool.name,
        "day": day,
        "meal_type": meal_type,
        "common_assignment": {
            "place_id": common_place_id,
            "time": common_time
        } if common_place_id or common_time else None,
        "team_assignments": team_assignments
    }


@restauration_router.get("/places/available-times")
async def get_available_restaurant_times(
    place_id: int,
    day: str = Query(..., regex="^(saturday|sunday)$"),
    meal_type: str = Query(..., regex="^(breakfast|lunch|dinner)$")
):
    """
    Récupère les horaires disponibles pour un lieu de restauration donné.
    Pour l'instant, retourne des créneaux standards.
    TODO: Implémenter une logique plus complexe basée sur la capacité du lieu.
    """
    place = await prisma.place.find_unique(where={"id": place_id})
    if not place:
        raise HTTPException(status_code=404, detail="Lieu non trouvé.")
    
    # Créneaux standards (à adapter selon les besoins)
    if meal_type == "breakfast":
        time_slots = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30"]
    elif meal_type == "lunch":
        time_slots = ["11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00"]
    else:  # dinner
        time_slots = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"]
    
    return {
        "place_id": place_id,
        "place_name": place.name,
        "day": day,
        "meal_type": meal_type,
        "available_times": time_slots
    }


class SportRestaurantConditions(BaseModel):
    """Conditions de restauration pour un sport"""
    # Petit déjeuner
    defaultBreakfastTimeSaturday: Optional[str] = None
    defaultBreakfastPlaceSaturdayId: Optional[int] = None
    defaultBreakfastTimeSunday: Optional[str] = None
    defaultBreakfastPlaceSundayId: Optional[int] = None
    
    # Petit déjeuner finalistes dimanche
    defaultBreakfastTimeSundayFinalist: Optional[str] = None
    defaultBreakfastPlaceSundayFinalistId: Optional[int] = None
    
    # Déjeuner
    defaultLunchTimeSaturday: Optional[str] = None
    defaultLunchPlaceSaturdayId: Optional[int] = None
    defaultLunchTimeSunday: Optional[str] = None
    defaultLunchPlaceSundayId: Optional[int] = None
    
    # Déjeuner finalistes dimanche
    defaultLunchTimeSundayFinalist: Optional[str] = None
    defaultLunchPlaceSundayFinalistId: Optional[int] = None


class SchoolRestaurantConditions(BaseModel):
    """Conditions de restauration pour une école (dîners)"""
    defaultDinnerTime: Optional[str] = None
    defaultDinnerPlaceId: Optional[int] = None


@restauration_router.get("/sport/{sport_id}/restaurant-conditions", dependencies=[Depends(check_admin)])
async def get_sport_restaurant_conditions(sport_id: int):
    """
    Récupère les conditions de restauration configurées pour un sport.
    """
    sport = await prisma.sport.find_unique(
        where={"id": sport_id},
        include={
            "defaultBreakfastPlaceSaturday": True,
            "defaultBreakfastPlaceSunday": True,
            "defaultBreakfastPlaceSundayFinalist": True,
            "defaultLunchPlaceSaturday": True,
            "defaultLunchPlaceSunday": True,
            "defaultLunchPlaceSundayFinalist": True
        }
    )
    if not sport:
        raise HTTPException(status_code=404, detail="Sport non trouvé.")
    
    return {
        "sport_id": sport_id,
        "sport_name": sport.sport,
        "breakfast": {
            "saturday": {
                "time": sport.defaultBreakfastTimeSaturday,
                "place_id": sport.defaultBreakfastPlaceSaturdayId,
                "place_name": sport.defaultBreakfastPlaceSaturday.name if sport.defaultBreakfastPlaceSaturday else None
            },
            "sunday": {
                "time": sport.defaultBreakfastTimeSunday,
                "place_id": sport.defaultBreakfastPlaceSundayId,
                "place_name": sport.defaultBreakfastPlaceSunday.name if sport.defaultBreakfastPlaceSunday else None
            },
            "sunday_finalist": {
                "time": sport.defaultBreakfastTimeSundayFinalist,
                "place_id": sport.defaultBreakfastPlaceSundayFinalistId,
                "place_name": sport.defaultBreakfastPlaceSundayFinalist.name if sport.defaultBreakfastPlaceSundayFinalist else None
            }
        },
        "lunch": {
            "saturday": {
                "time": sport.defaultLunchTimeSaturday,
                "place_id": sport.defaultLunchPlaceSaturdayId,
                "place_name": sport.defaultLunchPlaceSaturday.name if sport.defaultLunchPlaceSaturday else None
            },
            "sunday": {
                "time": sport.defaultLunchTimeSunday,
                "place_id": sport.defaultLunchPlaceSundayId,
                "place_name": sport.defaultLunchPlaceSunday.name if sport.defaultLunchPlaceSunday else None
            },
            "sunday_finalist": {
                "time": sport.defaultLunchTimeSundayFinalist,
                "place_id": sport.defaultLunchPlaceSundayFinalistId,
                "place_name": sport.defaultLunchPlaceSundayFinalist.name if sport.defaultLunchPlaceSundayFinalist else None
            }
        }
    }


@restauration_router.put("/sport/{sport_id}/restaurant-conditions", dependencies=[Depends(check_admin)])
async def update_sport_restaurant_conditions(
    sport_id: int,
    conditions: SportRestaurantConditions
):
    """
    Met à jour les conditions de restauration pour un sport.
    """
    sport = await prisma.sport.find_unique(where={"id": sport_id})
    if not sport:
        raise HTTPException(status_code=404, detail="Sport non trouvé.")
    
    # Vérifier que les lieux existent si fournis et sont valides
    update_data = {}
    valid_breakfast_types = ["Restau", "RestaurationMidi", "VT"]
    valid_lunch_types = ["Restau", "RestaurationMidi", "VT"]
    
    # Traiter les lieux de petit-déjeuner samedi (peut être None pour réinitialiser)
    if conditions.defaultBreakfastPlaceSaturdayId is not None:
        place = await prisma.place.find_unique(where={"id": conditions.defaultBreakfastPlaceSaturdayId})
        if not place:
            raise HTTPException(status_code=400, detail="Lieu de petit-déjeuner samedi introuvable.")
        if place.Type not in valid_breakfast_types:
            raise HTTPException(status_code=400, detail="Lieu de petit-déjeuner samedi invalide (type incorrect).")
    update_data["defaultBreakfastPlaceSaturdayId"] = conditions.defaultBreakfastPlaceSaturdayId
    
    # Traiter les lieux de petit-déjeuner dimanche
    if conditions.defaultBreakfastPlaceSundayId is not None:
        place = await prisma.place.find_unique(where={"id": conditions.defaultBreakfastPlaceSundayId})
        if not place:
            raise HTTPException(status_code=400, detail="Lieu de petit-déjeuner dimanche introuvable.")
        if place.Type not in valid_breakfast_types:
            raise HTTPException(status_code=400, detail="Lieu de petit-déjeuner dimanche invalide (type incorrect).")
    update_data["defaultBreakfastPlaceSundayId"] = conditions.defaultBreakfastPlaceSundayId
    
    # Traiter les lieux de petit-déjeuner dimanche finalistes
    if conditions.defaultBreakfastPlaceSundayFinalistId is not None:
        place = await prisma.place.find_unique(where={"id": conditions.defaultBreakfastPlaceSundayFinalistId})
        if not place:
            raise HTTPException(status_code=400, detail="Lieu de petit-déjeuner dimanche finalistes introuvable.")
        if place.Type not in valid_breakfast_types:
            raise HTTPException(status_code=400, detail="Lieu de petit-déjeuner dimanche finalistes invalide (type incorrect).")
    update_data["defaultBreakfastPlaceSundayFinalistId"] = conditions.defaultBreakfastPlaceSundayFinalistId
    
    # Traiter les lieux de déjeuner samedi
    if conditions.defaultLunchPlaceSaturdayId is not None:
        place = await prisma.place.find_unique(where={"id": conditions.defaultLunchPlaceSaturdayId})
        if not place:
            raise HTTPException(status_code=400, detail="Lieu de déjeuner samedi introuvable.")
        if place.Type not in valid_lunch_types:
            raise HTTPException(status_code=400, detail="Lieu de déjeuner samedi invalide (type incorrect).")
    update_data["defaultLunchPlaceSaturdayId"] = conditions.defaultLunchPlaceSaturdayId
    
    # Traiter les lieux de déjeuner dimanche
    if conditions.defaultLunchPlaceSundayId is not None:
        place = await prisma.place.find_unique(where={"id": conditions.defaultLunchPlaceSundayId})
        if not place:
            raise HTTPException(status_code=400, detail="Lieu de déjeuner dimanche introuvable.")
        if place.Type not in valid_lunch_types:
            raise HTTPException(status_code=400, detail="Lieu de déjeuner dimanche invalide (type incorrect).")
    update_data["defaultLunchPlaceSundayId"] = conditions.defaultLunchPlaceSundayId
    
    # Traiter les lieux de déjeuner dimanche finalistes
    if conditions.defaultLunchPlaceSundayFinalistId is not None:
        place = await prisma.place.find_unique(where={"id": conditions.defaultLunchPlaceSundayFinalistId})
        if not place:
            raise HTTPException(status_code=400, detail="Lieu de déjeuner dimanche finalistes introuvable.")
        if place.Type not in valid_lunch_types:
            raise HTTPException(status_code=400, detail="Lieu de déjeuner dimanche finalistes invalide (type incorrect).")
    update_data["defaultLunchPlaceSundayFinalistId"] = conditions.defaultLunchPlaceSundayFinalistId
    
    # Ajouter tous les champs de temps (y compris None pour réinitialiser)
    update_data["defaultBreakfastTimeSaturday"] = conditions.defaultBreakfastTimeSaturday
    update_data["defaultBreakfastTimeSunday"] = conditions.defaultBreakfastTimeSunday
    update_data["defaultBreakfastTimeSundayFinalist"] = conditions.defaultBreakfastTimeSundayFinalist
    update_data["defaultLunchTimeSaturday"] = conditions.defaultLunchTimeSaturday
    update_data["defaultLunchTimeSunday"] = conditions.defaultLunchTimeSunday
    update_data["defaultLunchTimeSundayFinalist"] = conditions.defaultLunchTimeSundayFinalist
    
    # Mettre à jour le sport
    updated_sport = await prisma.sport.update(
        where={"id": sport_id},
        data=update_data
    )
    
    return {
        "status": "success",
        "sport_id": sport_id,
        "sport_name": updated_sport.sport,
        "conditions": {
            "breakfast": {
                "saturday": {
                    "time": updated_sport.defaultBreakfastTimeSaturday,
                    "place_id": updated_sport.defaultBreakfastPlaceSaturdayId
                },
                "sunday": {
                    "time": updated_sport.defaultBreakfastTimeSunday,
                    "place_id": updated_sport.defaultBreakfastPlaceSundayId
                },
                "sunday_finalist": {
                    "time": updated_sport.defaultBreakfastTimeSundayFinalist,
                    "place_id": updated_sport.defaultBreakfastPlaceSundayFinalistId
                }
            },
            "lunch": {
                "saturday": {
                    "time": updated_sport.defaultLunchTimeSaturday,
                    "place_id": updated_sport.defaultLunchPlaceSaturdayId
                },
                "sunday": {
                    "time": updated_sport.defaultLunchTimeSunday,
                    "place_id": updated_sport.defaultLunchPlaceSundayId
                },
                "sunday_finalist": {
                    "time": updated_sport.defaultLunchTimeSundayFinalist,
                    "place_id": updated_sport.defaultLunchPlaceSundayFinalistId
                }
            }
        }
    }


@restauration_router.get("/school/{school_id}/restaurant-conditions", dependencies=[Depends(check_admin)])
async def get_school_restaurant_conditions(school_id: int):
    """
    Récupère les conditions de restauration configurées pour une école (dîners).
    """
    school = await prisma.school.find_unique(
        where={"id": school_id},
        include={"defaultDinnerPlace": True}
    )
    if not school:
        raise HTTPException(status_code=404, detail="École non trouvée.")
    
    return {
        "school_id": school_id,
        "school_name": school.name,
        "dinner": {
            "time": school.defaultDinnerTime,
            "place_id": school.defaultDinnerPlaceId,
            "place_name": school.defaultDinnerPlace.name if school.defaultDinnerPlace else None
        }
    }


@restauration_router.put("/school/{school_id}/restaurant-conditions", dependencies=[Depends(check_admin)])
async def update_school_restaurant_conditions(
    school_id: int,
    conditions: SchoolRestaurantConditions
):
    """
    Met à jour les conditions de restauration pour une école (dîners).
    """
    school = await prisma.school.find_unique(where={"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="École non trouvée.")
    
    update_data = {}
    valid_dinner_types = ["Restau", "RestaurationSoir", "VT"]
    
    # Traiter le lieu de dîner (peut être None pour réinitialiser)
    if conditions.defaultDinnerPlaceId is not None:
        place = await prisma.place.find_unique(where={"id": conditions.defaultDinnerPlaceId})
        if not place:
            raise HTTPException(status_code=400, detail="Lieu de dîner introuvable.")
        if place.Type not in valid_dinner_types:
            raise HTTPException(status_code=400, detail="Lieu de dîner invalide (type incorrect).")
    update_data["defaultDinnerPlaceId"] = conditions.defaultDinnerPlaceId
    
    # Ajouter le temps (y compris None pour réinitialiser)
    update_data["defaultDinnerTime"] = conditions.defaultDinnerTime
    
    # Mettre à jour l'école
    updated_school = await prisma.school.update(
        where={"id": school_id},
        data=update_data
    )
    
    return {
        "status": "success",
        "school_id": school_id,
        "school_name": updated_school.name,
        "conditions": {
            "dinner": {
                "time": updated_school.defaultDinnerTime,
                "place_id": updated_school.defaultDinnerPlaceId
            }
        }
    }


@restauration_router.post("/reset-breakfast-assignments", dependencies=[Depends(check_admin)])
async def reset_breakfast_assignments():
    """
    Réinitialise toutes les affectations de petit-déjeuner (samedi et dimanche) pour tous les participants.
    """
    try:
        # Récupérer tous les participants qui ont un pack incluant le petit-déjeuner
        packs = await prisma.pack.find_many(where={"isBreakfastIncluded": True})
        eligible_pack_ids = [pack.id for pack in packs]
        
        if not eligible_pack_ids:
            raise HTTPException(
                status_code=404,
                detail="Aucun pack avec petit-déjeuner inclus trouvé."
            )
        
        # Mettre à null tous les champs de petit-déjeuner
        updated_count = await prisma.participant.update_many(
            where={"packId": {"in": eligible_pack_ids}},
            data={
                "lieupetitdejsamediId": None,
                "heurepetitdejsamedi": None,
                "lieupetitdejdimancheId": None,
                "heurepetitdejdimanche": None
            }
        )
        
        return {
            "status": "success",
            "message": "Toutes les affectations de petit-déjeuner ont été réinitialisées.",
            "updated_participants": updated_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la réinitialisation: {str(e)}"
        )


@restauration_router.post("/reset-lunch-assignments", dependencies=[Depends(check_admin)])
async def reset_lunch_assignments():
    """
    Réinitialise toutes les affectations de déjeuner (samedi et dimanche) pour tous les participants.
    """
    try:
        # Récupérer tous les participants qui ont un pack incluant le déjeuner
        packs = await prisma.pack.find_many(where={"isLunchIncluded": True})
        eligible_pack_ids = [pack.id for pack in packs]
        
        if not eligible_pack_ids:
            raise HTTPException(
                status_code=404,
                detail="Aucun pack avec déjeuner inclus trouvé."
            )
        
        # Mettre à null tous les champs de déjeuner
        updated_count = await prisma.participant.update_many(
            where={"packId": {"in": eligible_pack_ids}},
            data={
                "lieudejsamediId": None,
                "heuredejsamedi": None,
                "lieudejdimancheId": None,
                "heuredejdimanche": None
            }
        )
        
        return {
            "status": "success",
            "message": "Toutes les affectations de déjeuner ont été réinitialisées.",
            "updated_participants": updated_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la réinitialisation: {str(e)}"
        )


@restauration_router.post("/reset-dinner-assignments", dependencies=[Depends(check_admin)])
async def reset_dinner_assignments():
    """
    Réinitialise toutes les affectations de dîner (samedi) pour tous les participants.
    """
    try:
        # Récupérer tous les participants qui ont un pack incluant le dîner
        packs = await prisma.pack.find_many(where={"isDinnerIncluded": True})
        eligible_pack_ids = [pack.id for pack in packs]
        
        if not eligible_pack_ids:
            raise HTTPException(
                status_code=404,
                detail="Aucun pack avec dîner inclus trouvé."
            )
        
        # Mettre à null tous les champs de dîner
        updated_count = await prisma.participant.update_many(
            where={"packId": {"in": eligible_pack_ids}},
            data={
                "lieudinersamediId": None,
                "heuredinersamedi": None
            }
        )
        
        return {
            "status": "success",
            "message": "Toutes les affectations de dîner ont été réinitialisées.",
            "updated_participants": updated_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la réinitialisation: {str(e)}"
        )


@restauration_router.get("/schools/with-dinner-teams")
async def get_schools_with_dinner_teams(sport_id: Optional[int] = None):
    """
    Retourne les écoles qui ont au moins un participant avec un pack incluant le dîner,
    avec le nombre de participants concernés pour chaque école.
    Si sport_id est fourni, filtre uniquement les écoles du sport concerné.
    """
    try:
        # Récupérer tous les packs qui incluent le dîner
        packs = await prisma.pack.find_many(where={"isDinnerIncluded": True})
        eligible_pack_ids = [pack.id for pack in packs]
        
        if not eligible_pack_ids:
            return {"schools": []}
        
        # Construire la condition where pour les participants
        where_condition = {"packId": {"in": eligible_pack_ids}}
        
        # Si un sport_id est fourni, filtrer par sport
        if sport_id:
            # Récupérer les équipes du sport
            teams = await prisma.team.find_many(where={"sportId": sport_id})
            team_ids = [team.id for team in teams]
            if not team_ids:
                return {"schools": []}
            where_condition["teamId"] = {"in": team_ids}
        
        # Récupérer les participants avec des packs dîner, avec leurs équipes et écoles
        participants = await prisma.participant.find_many(
            where=where_condition,
            include={
                "team": {
                    "include": {
                        "school": True
                    }
                }
            }
        )
        
        # Compter les participants par école
        school_participants_count = {}
        school_data = {}
        
        for participant in participants:
            if participant.team and participant.team.school:
                school_id = participant.team.school.id
                
                if school_id not in school_participants_count:
                    school_participants_count[school_id] = 0
                    school_data[school_id] = participant.team.school
                
                school_participants_count[school_id] += 1
        
        # Construire la réponse avec les écoles et le nombre de participants
        result = []
        for school_id, participants_count in school_participants_count.items():
            school = school_data[school_id]
            result.append({
                "id": school.id,
                "name": school.name,
                "participants_count": participants_count
            })
        
        # Trier par nom d'école
        result.sort(key=lambda x: x["name"])
        
        return {"schools": result}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des écoles: {str(e)}"
        )

