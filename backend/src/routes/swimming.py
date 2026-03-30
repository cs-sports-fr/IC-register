from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from infra.prisma import getPrisma
from routes.auth.utils import check_admin, check_token
# Note: Les enums SwimmingEventType, SwimmingEventDistance, SwimmingStroke seront disponibles après la migration
# from prisma.enums import SwimmingEventType, SwimmingEventDistance, SwimmingStroke
from datetime import datetime

swimming_router = APIRouter(
    prefix="/swimming",
    tags=["swimming"],
    dependencies=[Depends(check_token)],
)
prisma = getPrisma()

# ==================== FONCTION DE CALCUL DES POINTS ====================

def calculate_points(time_seconds: float, reference_time: Optional[float]) -> Optional[float]:
    """
    Calcule les points selon la formule: 1000 * (temps_reference / temps)^3
    Si temps = 0 ou temps_reference n'est pas défini, retourne 0
    """
    if not reference_time or reference_time <= 0:
        return 0.0
    if time_seconds <= 0:
        return 0.0
    try:
        return 1000.0 * ((reference_time / time_seconds) ** 3)
    except (ZeroDivisionError, ValueError, TypeError):
        return 0.0

# ==================== DÉFINITION DU PROGRAMME ====================

SWIMMING_PROGRAM = [
    {"name": "Relais 4 x 50m Nage-Libre", "type": "Relais4x50mNageLibre", "distance": "DistanceRelais", "stroke": "NageLibre", "isRelay": True, "order": 1},
    {"name": "100m Papillon", "type": "Epreuve100mPapillon", "distance": "Distance100m", "stroke": "Papillon", "isRelay": False, "order": 2},
    {"name": "100m Dos", "type": "Epreuve100mDos", "distance": "Distance100m", "stroke": "Dos", "isRelay": False, "order": 3},
    {"name": "100m Brasse", "type": "Epreuve100mBrasse", "distance": "Distance100m", "stroke": "Brasse", "isRelay": False, "order": 4},
    {"name": "100m Nage-Libre", "type": "Epreuve100mNageLibre", "distance": "Distance100m", "stroke": "NageLibre", "isRelay": False, "order": 5},
    {"name": "50m Papillon", "type": "Epreuve50mPapillon", "distance": "Distance50m", "stroke": "Papillon", "isRelay": False, "order": 6},
    {"name": "50m Dos", "type": "Epreuve50mDos", "distance": "Distance50m", "stroke": "Dos", "isRelay": False, "order": 7},
    {"name": "50m Brasse", "type": "Epreuve50mBrasse", "distance": "Distance50m", "stroke": "Brasse", "isRelay": False, "order": 8},
    {"name": "50m Nage-Libre", "type": "Epreuve50mNageLibre", "distance": "Distance50m", "stroke": "NageLibre", "isRelay": False, "order": 9},
    {"name": "Relais 4 x 50m 4 Nages", "type": "Relais4x50m4Nages", "distance": "DistanceRelais", "stroke": "QuatreNages", "isRelay": True, "order": 10},
]


@swimming_router.post("/generate-events/{sport_id}", dependencies=[Depends(check_admin)])
async def generate_swimming_events(sport_id: int):
    """
    Génère toutes les épreuves du programme de natation pour un sport.
    """
    sport = await prisma.sport.find_unique(where={"id": sport_id})
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")
    
    # Vérifier que c'est bien la natation
    sport_name_lower = sport.sport.lower()
    if "natation" not in sport_name_lower:
        raise HTTPException(
            status_code=400,
            detail="Ce mode est uniquement disponible pour la natation."
        )
    
    # Supprimer les anciennes épreuves
    existing_events = await prisma.swimmingevent.find_many(where={"sportId": sport_id})
    for event in existing_events:
        # Supprimer les résultats associés
        await prisma.swimmingresult.delete_many(where={"eventId": event.id})
        await prisma.swimmingrelayresult.delete_many(where={"eventId": event.id})
        # Supprimer l'épreuve
        await prisma.swimmingevent.delete(where={"id": event.id})
    
    # Récupérer toutes les équipes validées pour les relais
    teams = await prisma.team.find_many(
        where={
            "sportId": sport_id,
            "status": {"in": ["Validated", "PrincipalList"]}
        }
    )
    
    # Créer toutes les épreuves du programme
    created_events = []
    relay_events = []
    
    for event_data in SWIMMING_PROGRAM:
        event_data_dict = {
            "eventType": event_data["type"],  # Utilise les valeurs de l'enum comme string
            "distance": event_data["distance"],
            "name": event_data["name"],
            "order": event_data["order"],
            "sportId": sport_id,
            "isRelay": event_data["isRelay"],
        }
        # Ajouter stroke seulement s'il est défini
        if "stroke" in event_data and event_data["stroke"]:
            event_data_dict["stroke"] = event_data["stroke"]
        
        event = await prisma.swimmingevent.create(data=event_data_dict)
        created_events.append(event)
        
        # Si c'est un relais, assigner automatiquement toutes les équipes
        if event_data["isRelay"]:
            relay_events.append(event)
    
    # Assigner toutes les équipes aux épreuves de relais
    relay_results_created = 0
    for event in relay_events:
        for team in teams:
            await prisma.swimmingrelayresult.create(
                data={
                    "eventId": event.id,
                    "teamId": team.id,
                    "timeSeconds": 0.0,  # Pas de temps initialement
                }
            )
            relay_results_created += 1
    
    return {
        "status": "Épreuves générées avec succès",
        "events_created": len(created_events),
        "relay_assignments_created": relay_results_created,
        "events": [{"id": e.id, "name": e.name, "order": e.order, "isRelay": e.isRelay} for e in created_events]
    }


@swimming_router.get("/events/{sport_id}")
async def get_swimming_events(sport_id: int):
    """
    Récupère toutes les épreuves de natation pour un sport.
    """
    try:
        events = await prisma.swimmingevent.find_many(
            where={"sportId": sport_id},
            order={"order": "asc"},
            include={
                "results": {
                    "include": {
                        "participant": {
                            "include": {"school": True}
                        },
                        "team": {
                            "include": {"school": True}
                        }
                    }
                },
                "relayResults": {
                    "include": {
                        "team": {
                            "include": {"school": True}
                        }
                    }
                },
                "sport": True
            }
        )
        
        return {"events": events}
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        error_str = str(e).lower()
        error_type = type(e).__name__
        
        # Log l'erreur complète pour debug
        print(f"Error in get_swimming_events: {error_type} - {str(e)}")
        
        # Détection précise : les tables n'existent pas seulement si on a une erreur PostgreSQL spécifique
        # Erreurs PostgreSQL typiques : "relation", "does not exist", "SwimmingEvent" (avec majuscules)
        is_table_missing = (
            ("relation" in error_str and "does not exist" in error_str) or
            ("swimmingevent" in error_str and ("does not exist" in error_str or "relation" in error_str)) or
            ("swimmingresult" in error_str and ("does not exist" in error_str or "relation" in error_str)) or
            ("swimmingrelayresult" in error_str and ("does not exist" in error_str or "relation" in error_str))
        )
        
        if is_table_missing:
            raise HTTPException(
                status_code=500,
                detail=f"Les tables de natation n'existent pas encore. Erreur: {str(e)}. Veuillez exécuter: npx prisma migrate dev --name add_swimming_models"
            )
        # Afficher l'erreur complète pour debug
        raise HTTPException(
            status_code=500, 
            detail=f"Erreur lors de la récupération des épreuves ({error_type}): {str(e)}"
        )


# ==================== ENREGISTREMENT DES RÉSULTATS ====================

class IndividualResultCreate(BaseModel):
    event_id: int
    participant_id: int
    time_seconds: Optional[float] = None  # Optionnel pour permettre l'assignation sans temps
    points: Optional[float] = None  # Points optionnels


class RelayResultCreate(BaseModel):
    event_id: int
    team_id: int
    time_seconds: float
    points: Optional[float] = None  # Points optionnels


@swimming_router.post("/result/individual", dependencies=[Depends(check_admin)])
async def create_individual_result(result_data: IndividualResultCreate):
    """
    Assigner un participant à une épreuve ou enregistrer/mettre à jour son temps.
    Si time_seconds n'est pas fourni ou est 0, crée juste l'assignation.
    """
    # Vérifier que l'épreuve existe et n'est pas un relais
    try:
        event = await prisma.swimmingevent.find_unique(
            where={"id": result_data.event_id},
            include={"sport": True}
        )
        if not event:
            # Essayer de trouver toutes les épreuves pour debug
            all_events = await prisma.swimmingevent.find_many()
            event_ids = [e.id for e in all_events]
            raise HTTPException(
                status_code=404, 
                detail=f"Épreuve non trouvée. ID recherché: {result_data.event_id}. IDs disponibles: {event_ids}"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la recherche de l'épreuve: {str(e)}")
    
    if event.isRelay:
        raise HTTPException(status_code=400, detail="Cette épreuve est un relais. Utilisez /result/relay.")
    
    # Vérifier que le participant existe et appartient à une équipe
    participant = await prisma.participant.find_unique(
        where={"id": result_data.participant_id},
        include={"team": True}
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participant non trouvé.")
    
    if not participant.teamId:
        raise HTTPException(status_code=400, detail="Le participant doit appartenir à une équipe.")
    
    # Vérifier si un résultat existe déjà pour ce participant dans cette épreuve
    existing_result = await prisma.swimmingresult.find_first(
        where={
            "eventId": result_data.event_id,
            "participantId": result_data.participant_id
        }
    )
    
    # Récupérer le temps de référence selon le genre du participant
    reference_time = None
    if participant.gender == "M":
        reference_time = event.referenceTimeMen
    elif participant.gender == "F":
        reference_time = event.referenceTimeWomen
    
    if existing_result:
        # Mettre à jour le résultat existant
        update_data = {}
        if result_data.time_seconds is not None and result_data.time_seconds > 0:
            update_data["timeSeconds"] = result_data.time_seconds
            update_data["rank"] = None  # Réinitialiser le classement
            # Calculer automatiquement les points si pas fournis manuellement
            if result_data.points is None:
                update_data["points"] = calculate_points(result_data.time_seconds, reference_time)
            else:
                update_data["points"] = result_data.points
        elif result_data.time_seconds == 0:
            # Si time_seconds est 0, supprimer le temps (remettre à 0.0)
            update_data["timeSeconds"] = 0.0
            update_data["points"] = 0.0
            update_data["rank"] = None
        else:
            # Si time_seconds n'est pas fourni, garder l'existant mais mettre à jour les points si fournis
            if result_data.points is not None:
                update_data["points"] = result_data.points
        
        if update_data:
            result = await prisma.swimmingresult.update(
                where={"id": existing_result.id},
                data=update_data
            )
            return {"status": "Résultat mis à jour", "result": result}
        else:
            return {"status": "Aucune modification", "result": existing_result}
    else:
        # Créer un nouveau résultat (avec ou sans temps)
        time_seconds = result_data.time_seconds if result_data.time_seconds is not None and result_data.time_seconds > 0 else 0.0
        create_data = {
            "eventId": result_data.event_id,
            "participantId": result_data.participant_id,
            "teamId": participant.teamId,
            "timeSeconds": time_seconds,
        }
        
        # Calculer automatiquement les points si un temps est fourni
        if time_seconds > 0:
            if result_data.points is None:
                create_data["points"] = calculate_points(time_seconds, reference_time)
            else:
                create_data["points"] = result_data.points
        elif result_data.points is not None:
            create_data["points"] = result_data.points
        
        result = await prisma.swimmingresult.create(data=create_data)
        return {"status": "Participant assigné" if time_seconds == 0 else "Résultat enregistré", "result": result}


@swimming_router.post("/result/relay", dependencies=[Depends(check_admin)])
async def create_relay_result(result_data: RelayResultCreate):
    """
    Enregistre le temps d'une équipe dans un relais.
    """
    # Vérifier que l'épreuve existe et est un relais
    event = await prisma.swimmingevent.find_unique(
        where={"id": result_data.event_id},
        include={"sport": True}
    )
    if not event:
        raise HTTPException(status_code=404, detail="Épreuve non trouvée.")
    
    if not event.isRelay:
        raise HTTPException(status_code=400, detail="Cette épreuve n'est pas un relais. Utilisez /result/individual.")
    
    # Vérifier que l'équipe existe
    team = await prisma.team.find_unique(where={"id": result_data.team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Équipe non trouvée.")
    
    # Vérifier si un résultat existe déjà pour cette équipe dans cette épreuve
    existing_result = await prisma.swimmingrelayresult.find_first(
        where={
            "eventId": result_data.event_id,
            "teamId": result_data.team_id
        }
    )
    
    # Récupérer le temps de référence pour les relais
    reference_time = event.referenceTimeRelay
    
    if existing_result:
        # Mettre à jour le résultat existant
        update_data = {
            "rank": None,  # Réinitialiser le classement
        }
        if result_data.time_seconds is not None and result_data.time_seconds > 0:
            update_data["timeSeconds"] = result_data.time_seconds
            # Calculer automatiquement les points si pas fournis manuellement
            if result_data.points is None:
                update_data["points"] = calculate_points(result_data.time_seconds, reference_time)
            else:
                update_data["points"] = result_data.points
        else:
            # Si time_seconds est None ou 0, supprimer le temps (remettre à 0.0)
            update_data["timeSeconds"] = 0.0
            update_data["points"] = 0.0
        
        # Mettre à jour les points si fournis manuellement (sans temps)
        if result_data.points is not None and (result_data.time_seconds is None or result_data.time_seconds == 0):
            update_data["points"] = result_data.points
        
        result = await prisma.swimmingrelayresult.update(
            where={"id": existing_result.id},
            data=update_data
        )
        return {"status": "Résultat de relais mis à jour", "result": result}
    else:
        # Créer un nouveau résultat (normalement ne devrait pas arriver car assigné automatiquement)
        time_seconds = result_data.time_seconds if result_data.time_seconds is not None and result_data.time_seconds > 0 else 0.0
        create_data = {
            "eventId": result_data.event_id,
            "teamId": result_data.team_id,
            "timeSeconds": time_seconds,
        }
        
        # Calculer automatiquement les points si un temps est fourni
        if time_seconds > 0:
            if result_data.points is None:
                create_data["points"] = calculate_points(time_seconds, reference_time)
            else:
                create_data["points"] = result_data.points
        elif result_data.points is not None:
            create_data["points"] = result_data.points
        
        result = await prisma.swimmingrelayresult.create(data=create_data)
        return {"status": "Résultat de relais enregistré", "result": result}


@swimming_router.delete("/result/{result_id}", dependencies=[Depends(check_admin)])
async def delete_result(result_id: int):
    """
    Supprime un résultat individuel.
    """
    try:
        result = await prisma.swimmingresult.find_unique(where={"id": result_id})
        if not result:
            raise HTTPException(status_code=404, detail="Résultat non trouvé.")
        
        await prisma.swimmingresult.delete(where={"id": result_id})
        return {"status": "Résultat supprimé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")


@swimming_router.delete("/relay-result/{result_id}", dependencies=[Depends(check_admin)])
async def delete_relay_result(result_id: int):
    """
    Supprime un résultat de relais.
    """
    try:
        result = await prisma.swimmingrelayresult.find_unique(where={"id": result_id})
        if not result:
            raise HTTPException(status_code=404, detail="Résultat non trouvé.")
        
        await prisma.swimmingrelayresult.delete(where={"id": result_id})
        return {"status": "Résultat de relais supprimé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")


@swimming_router.delete("/clear-assignments/{sport_id}", dependencies=[Depends(check_admin)])
async def clear_all_assignments(sport_id: int):
    """
    Supprime toutes les assignations de participants aux épreuves individuelles.
    Supprime également tous les temps et scores associés.
    """
    try:
        # Récupérer toutes les épreuves individuelles
        events = await prisma.swimmingevent.find_many(
            where={
                "sportId": sport_id,
                "isRelay": False
            }
        )
        
        deleted_count = 0
        for event in events:
            # Supprimer TOUS les résultats individuels (avec ou sans temps)
            deleted = await prisma.swimmingresult.delete_many(
                where={
                    "eventId": event.id
                }
            )
            deleted_count += deleted
        
        return {
            "status": "Assignations réinitialisées",
            "deleted_count": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la réinitialisation: {str(e)}")


@swimming_router.put("/result/{result_id}/clear-time", dependencies=[Depends(check_admin)])
async def clear_time(result_id: int):
    """
    Supprime le temps d'un résultat individuel (met timeSeconds à 0.0).
    """
    try:
        result = await prisma.swimmingresult.find_unique(where={"id": result_id})
        if not result:
            raise HTTPException(status_code=404, detail="Résultat non trouvé.")
        
        await prisma.swimmingresult.update(
            where={"id": result_id},
            data={
                "timeSeconds": 0.0,
                "points": None,
                "rank": None
            }
        )
        return {"status": "Temps supprimé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@swimming_router.put("/relay-result/{result_id}/clear-time", dependencies=[Depends(check_admin)])
async def clear_relay_time(result_id: int):
    """
    Supprime le temps d'un résultat de relais (met timeSeconds à 0.0).
    """
    try:
        result = await prisma.swimmingrelayresult.find_unique(where={"id": result_id})
        if not result:
            raise HTTPException(status_code=404, detail="Résultat non trouvé.")
        
        await prisma.swimmingrelayresult.update(
            where={"id": result_id},
            data={
                "timeSeconds": 0.0,
                "points": None,
                "rank": None
            }
        )
        return {"status": "Temps de relais supprimé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


# ==================== CALCUL DES POINTS ET CLASSEMENTS ====================

class ReferenceTimeUpdate(BaseModel):
    reference_time_men: Optional[float] = None
    reference_time_women: Optional[float] = None
    reference_time_relay: Optional[float] = None

class PointsCalculationRequest(BaseModel):
    formula: str  # La formule sera fournie plus tard par l'utilisateur


@swimming_router.put("/event/{event_id}/reference-times", dependencies=[Depends(check_admin)])
async def update_reference_times(
    event_id: int,
    data: ReferenceTimeUpdate
):
    """
    Met à jour les temps de référence pour une épreuve.
    """
    event = await prisma.swimmingevent.find_unique(where={"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Épreuve non trouvée.")
    
    # Préparer les données de mise à jour
    update_data = {}
    if data.reference_time_men is not None:
        update_data["referenceTimeMen"] = data.reference_time_men
    if data.reference_time_women is not None:
        update_data["referenceTimeWomen"] = data.reference_time_women
    if data.reference_time_relay is not None:
        update_data["referenceTimeRelay"] = data.reference_time_relay
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Au moins un temps de référence doit être fourni.")
    
    # Mettre à jour l'épreuve
    updated_event = await prisma.swimmingevent.update(
        where={"id": event_id},
        data=update_data
    )
    
    # Recalculer les points pour tous les résultats existants de cette épreuve
    if event.isRelay:
        relay_results = await prisma.swimmingrelayresult.find_many(
            where={"eventId": event_id}
        )
        for result in relay_results:
            if result.timeSeconds > 0:
                new_points = calculate_points(result.timeSeconds, updated_event.referenceTimeRelay)
                await prisma.swimmingrelayresult.update(
                    where={"id": result.id},
                    data={"points": new_points, "rank": None}  # Réinitialiser le rang
                )
    else:
        results = await prisma.swimmingresult.find_many(
            where={"eventId": event_id},
            include={"participant": True}
        )
        for result in results:
            if result.timeSeconds > 0 and result.participant:
                ref_time = None
                if result.participant.gender == "M":
                    ref_time = updated_event.referenceTimeMen
                elif result.participant.gender == "F":
                    ref_time = updated_event.referenceTimeWomen
                
                if ref_time:
                    new_points = calculate_points(result.timeSeconds, ref_time)
                    await prisma.swimmingresult.update(
                        where={"id": result.id},
                        data={"points": new_points, "rank": None}  # Réinitialiser le rang
                    )
    
    return {
        "status": "Temps de référence mis à jour",
        "event": updated_event
    }


@swimming_router.post("/calculate-points/{sport_id}", dependencies=[Depends(check_admin)])
async def calculate_points_route(sport_id: int, request: PointsCalculationRequest):
    """
    Calcule les points pour toutes les épreuves selon la formule fournie.
    Pour l'instant, cette fonction est un placeholder - la formule sera implémentée plus tard.
    """
    # TODO: Implémenter le calcul des points selon la formule
    # Pour l'instant, on retourne juste un message
    return {
        "status": "Calcul des points à implémenter",
        "formula": request.formula,
        "message": "La formule de calcul des points sera implémentée une fois que vous l'aurez fournie."
    }


@swimming_router.post("/calculate-rankings/{sport_id}", dependencies=[Depends(check_admin)])
async def calculate_rankings(sport_id: int):
    """
    Calcule les classements pour toutes les épreuves.
    Pour les temps: classement croissant (meilleur temps = 1er)
    Ne prend en compte que les résultats avec un temps > 0
    """
    # Récupérer toutes les épreuves
    events = await prisma.swimmingevent.find_many(
        where={"sportId": sport_id},
        include={"results": True, "relayResults": True}
    )
    
    rankings_updated = 0
    
    for event in events:
        # Classement des résultats individuels
        if event.results:
            # Filtrer les résultats avec un temps valide (> 0)
            results_with_time = [r for r in event.results if r.timeSeconds and r.timeSeconds > 0]
            # Trier par temps croissant (meilleur temps = 1er)
            sorted_results = sorted(results_with_time, key=lambda r: r.timeSeconds)
            for rank, result in enumerate(sorted_results, start=1):
                await prisma.swimmingresult.update(
                    where={"id": result.id},
                    data={"rank": rank}
                )
                rankings_updated += 1
        
        # Classement des relais
        if event.relayResults:
            # Filtrer les résultats avec un temps valide (> 0)
            relays_with_time = [r for r in event.relayResults if r.timeSeconds and r.timeSeconds > 0]
            # Trier par temps croissant (meilleur temps = 1er)
            sorted_relays = sorted(relays_with_time, key=lambda r: r.timeSeconds)
            for rank, result in enumerate(sorted_relays, start=1):
                await prisma.swimmingrelayresult.update(
                    where={"id": result.id},
                    data={"rank": rank}
                )
                rankings_updated += 1
    
    return {
        "status": "Classements calculés",
        "rankings_updated": rankings_updated
    }


# ==================== OBTENIR LES CLASSEMENTS ====================

@swimming_router.get("/rankings/individual/{sport_id}")
async def get_individual_rankings(
    sport_id: int,
    gender: Optional[str] = None,  # "M" ou "F" pour filtrer par genre
    event_id: Optional[int] = None  # Pour filtrer par épreuve
):
    """
    Retourne les classements individuels.
    Si gender est fourni, filtre par genre (M ou F).
    Si event_id est fourni, filtre par épreuve.
    """
    # Récupérer d'abord les épreuves du sport
    events = await prisma.swimmingevent.find_many(
        where={
            "sportId": sport_id,
            "isRelay": False
        }
    )
    event_ids = [e.id for e in events]
    
    where_clause = {
        "eventId": {"in": event_ids}
    }
    
    if event_id:
        where_clause["eventId"] = event_id
    
    results = await prisma.swimmingresult.find_many(
        where=where_clause,
        include={
            "participant": {
                "include": {"school": True}
            },
            "team": {
                "include": {"school": True}
            },
            "event": True
        }
    )
    
    # Filtrer par genre si demandé
    if gender:
        results = [r for r in results if r.participant and r.participant.gender == gender]
    
    # Trier d'abord par ordre d'épreuve, puis par rang
    results.sort(key=lambda r: (r.event.order if r.event else 999, r.rank or 999))
    
    # Grouper par épreuve et calculer les points totaux par participant
    participant_totals = {}  # {participant_id: {"participant": ..., "total_points": ..., "results": [...]}}
    
    for result in results:
        if not result.participant:
            continue
        participant_id = result.participantId
        if participant_id not in participant_totals:
            participant_totals[participant_id] = {
                "participant": result.participant,
                "total_points": result.points or 0,
                "results": [result]
            }
        else:
            participant_totals[participant_id]["total_points"] += (result.points or 0)
            participant_totals[participant_id]["results"].append(result)
    
    # Trier par points totaux décroissants
    rankings = sorted(
        participant_totals.values(),
        key=lambda x: x["total_points"],
        reverse=True
    )
    
    # Ajouter le rang
    for rank, data in enumerate(rankings, start=1):
        data["rank"] = rank
    
    return {
        "rankings": rankings,
        "gender": gender or "Tous",
        "total_participants": len(rankings)
    }


@swimming_router.get("/rankings/teams/{sport_id}")
async def get_team_rankings(sport_id: int):
    """
    Retourne le classement par équipe.
    Somme les points de tous les participants de l'équipe (individuels + relais).
    Les points des relais sont aussi inclus dans le calcul.
    """
    # Récupérer d'abord les IDs des épreuves individuelles
    individual_events = await prisma.swimmingevent.find_many(
        where={
            "sportId": sport_id,
            "isRelay": False
        }
    )
    individual_event_ids = [e.id for e in individual_events]
    
    # Récupérer tous les résultats individuels
    individual_results = await prisma.swimmingresult.find_many(
        where={
            "eventId": {"in": individual_event_ids}
        },
        include={"team": True}
    )
    
    # Récupérer d'abord les IDs des épreuves de relais
    relay_events = await prisma.swimmingevent.find_many(
        where={
            "sportId": sport_id,
            "isRelay": True
        }
    )
    relay_event_ids = [e.id for e in relay_events]
    
    # Récupérer tous les résultats de relais
    relay_results = await prisma.swimmingrelayresult.find_many(
        where={
            "eventId": {"in": relay_event_ids}
        },
        include={"team": True}
    )
    
    # Calculer les points totaux par équipe
    team_totals = {}
    
    # Ajouter les points des résultats individuels
    for result in individual_results:
        team_id = result.teamId
        if team_id not in team_totals:
            team_totals[team_id] = {
                "team": result.team,
                "total_points": result.points or 0,
                "individual_results": [result],
                "relay_results": []
            }
        else:
            team_totals[team_id]["total_points"] += (result.points or 0)
            team_totals[team_id]["individual_results"].append(result)
    
    # Ajouter les points des relais
    for result in relay_results:
        team_id = result.teamId
        if team_id not in team_totals:
            team_totals[team_id] = {
                "team": result.team,
                "total_points": result.points or 0,
                "individual_results": [],
                "relay_results": [result]
            }
        else:
            team_totals[team_id]["total_points"] += (result.points or 0)
            team_totals[team_id]["relay_results"].append(result)
    
    # Trier par points totaux décroissants
    rankings = sorted(
        team_totals.values(),
        key=lambda x: x["total_points"],
        reverse=True
    )
    
    # Ajouter le rang
    for rank, data in enumerate(rankings, start=1):
        data["rank"] = rank
    
    return {
        "rankings": rankings,
        "total_teams": len(rankings)
    }

