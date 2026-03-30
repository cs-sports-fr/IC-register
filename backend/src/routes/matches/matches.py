from fastapi import APIRouter, Depends
from typing import List
from prisma.models import Match, Pool, Team, Sport
from prisma.types import MatchCreateInput
from infra.prisma import getPrisma
from routes.auth.utils import check_admin, check_token
from routes.matches.utils import generate_round_robin_matches, schedule_matches, generate_knockout_bracket
from datetime import timedelta,datetime
from pydantic import BaseModel
from fastapi import Body
from typing import Optional
from fastapi import HTTPException
import random
import math
from prisma.enums import PhaseType
from enum import Enum
from fastapi import Query




matches_router = APIRouter(
    prefix="/matches",
    tags=["matches"],
    dependencies=[Depends(check_token)],
)
prisma = getPrisma()

@matches_router.get("/{sport_id}")
async def get_match_pools(
    sport_id: int,
):
    try:
        matches = await prisma.match.find_many(
            where={
                "sportId": sport_id,
            },
            include={
                "teamOne": {
                    "include": {
                        "school": True,
                        "pools": True,
                        "participants": True,
                    },
                },
                "teamTwo": {
                    "include": {
                        "school": True,
                        "pools": True,
                        "participants": True,
                    },
                },
                "place": True,  # Include the place of the match
            },
            order=[
                {"matchTime": "asc"},
                {"field": "asc"},
            ],
        )
        return matches
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@matches_router.get("/unique/{match_id}")
async def get_unique_match(match_id: int):
    match = await prisma.match.find_unique(
        where={"id": match_id},
        include={
            "teamOne": {
                "include": {
                    "school": True,
                    "pools": True,
                },
            },
            "teamTwo": {
                "include": {
                    "school": True,
                    "pools": True,
                },
            },
            "place": True,  
            "sport": True,  
        },
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")
    return match
    

@matches_router.post("/generate/{sport_id}", dependencies=[Depends(check_admin)])
async def generate_matches(sport_id: int):
    sport = await prisma.sport.find_unique(
        where={"id": sport_id},
        include={
            "pools": {
                "include": {
                    "teams": True,
                    "Place": True,
                }
            },
            "placesSaturday": True,
        }
    )

    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")

    pool_match_length = sport.poolMatchLength

    # Group pools by their assigned Place and by morning/afternoon
    place_id_to_pools_morning = {}
    place_id_to_pools_afternoon = {}

    for pool in sport.pools:
        if pool.PlaceId is not None and pool.teams:
            if pool.isMorning:
                place_id_to_pools_morning.setdefault(pool.PlaceId, []).append(pool)
            else:
                place_id_to_pools_afternoon.setdefault(pool.PlaceId, []).append(pool)

    all_scheduled_matches = []

    # Schedule morning matches
    for place in sport.placesSaturday:
        pools_for_place = place_id_to_pools_morning.get(place.id, [])
        if not pools_for_place:
            continue
        matches_for_pools = []
        for pool in pools_for_place:
            pool_matches = generate_round_robin_matches(pool.teams)
            matches_for_pools.append(pool_matches)
        scheduled_matches = schedule_matches(
            pools=matches_for_pools,
            number_of_fields=place.numberOfFields,
            match_length=pool_match_length,
            start_time=place.startTime, 
        )
        for match_info in scheduled_matches:
            match_info["placeId"] = place.id
        all_scheduled_matches.extend(scheduled_matches)

    # Schedule afternoon matches
    for place in sport.placesSaturday:
        pools_for_place = place_id_to_pools_afternoon.get(place.id, [])
        if not pools_for_place:
            continue
        matches_for_pools = []
        for pool in pools_for_place:
            pool_matches = generate_round_robin_matches(pool.teams)
            matches_for_pools.append(pool_matches)
        scheduled_matches = schedule_matches(
            pools=matches_for_pools,
            number_of_fields=place.numberOfFields,
            match_length=pool_match_length,
            start_time=place.startTimeAfternoon, 
        )
        for match_info in scheduled_matches:
            match_info["placeId"] = place.id
        all_scheduled_matches.extend(scheduled_matches)

    # Save scheduled matches to the database
    for match_info in all_scheduled_matches:
        match = match_info['match']
        match_time = match_info['time_slot']
        field = match_info['field']
        place_id = match_info['placeId']

        await prisma.match.create(
            data={
                "phase": "GroupStage",
                "teamOneId": match['team_one_id'],
                "teamTwoId": match['team_two_id'],
                "sportId": sport_id,
                "matchTime": match_time,
                "field": field,
                "isScheduled": True,
                "placeId": place_id,
            }
        )

    return {"status": "Matches generated successfully"}


# ==================== TOURNOIS PAR CATÉGORIE DE POIDS (BOXE/JUDO) ====================

@matches_router.post("/generate-weight-pools/{sport_id}", dependencies=[Depends(check_admin)])
async def generate_weight_pools(sport_id: int, max_per_pool: int = 4):
    """
    ÉTAPE 1: Crée des poules au sein de chaque catégorie de poids.
    - Supprime les anciennes poules/matchs de ce sport avant de régénérer
    - Si une catégorie a plus de max_per_pool participants → plusieurs poules (A, B, C...)
    - Matchs round-robin dans chaque poule
    - Classement: 3 pts victoire, 1 pt nul, 0 défaite
    """
    import math
    
    sport = await prisma.sport.find_unique(
        where={"id": sport_id},
        include={"placesSaturday": True, "placesSunday": True, "pools": True}
    )
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")
    
    # SUPPRIMER les anciens matchs et poules de ce sport (catégories de poids uniquement)
    # 1. Supprimer tous les matchs du sport
    await prisma.match.delete_many(where={"sportId": sport_id})
    
    # 2. Déconnecter les équipes des poules et supprimer les poules avec weightCategory
    for pool in sport.pools:
        if pool.weightCategory:
            # Déconnecter toutes les équipes de cette poule
            teams_in_pool = await prisma.team.find_many(
                where={"pools": {"some": {"id": pool.id}}}
            )
            for team in teams_in_pool:
                await prisma.team.update(
                    where={"id": team.id},
                    data={"pools": {"disconnect": [{"id": pool.id}]}}
                )
            # Supprimer la poule
            await prisma.pool.delete(where={"id": pool.id})
    
    # 3. Réinitialiser les stats des équipes
    await prisma.team.update_many(
        where={"sportId": sport_id},
        data={
            "tournamentPoints": 0,
            "goalsScored": 0,
            "goalsConceded": 0,
            "poolmatcheswon": 0,
            "poolmatcheslost": 0,
            "poolmatchesdraw": 0,
        }
    )
    
    # Récupérer équipes validées avec participants
    teams = await prisma.team.find_many(
        where={
            "sportId": sport_id,
            "status": {"in": ["Validated", "PrincipalList"]}
        },
        include={"participants": True}
    )
    
    if not teams:
        raise HTTPException(status_code=400, detail="Aucune équipe validée trouvée.")
    
    # Grouper par catégorie de poids
    teams_by_category = {}
    for team in teams:
        if team.participants:
            category = team.participants[0].weightCategory
            if category:
                teams_by_category.setdefault(category, []).append(team)
    
    if not teams_by_category:
        raise HTTPException(status_code=400, detail="Aucun participant avec catégorie de poids.")
    
    created_pools = []
    created_matches = 0
    
    default_place = sport.placesSaturday[0] if sport.placesSaturday else None
    pool_match_length = sport.poolMatchLength or 10
    pool_letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    
    for category, category_teams in teams_by_category.items():
        if len(category_teams) < 2:
            continue
        
        # Calculer le nombre de poules nécessaires
        num_pools = max(1, math.ceil(len(category_teams) / max_per_pool))
        
        # Répartir les équipes dans les poules (round-robin style)
        pools_teams = [[] for _ in range(num_pools)]
        for idx, team in enumerate(category_teams):
            pools_teams[idx % num_pools].append(team)
        
        # Créer chaque poule pour cette catégorie
        for pool_idx, pool_teams in enumerate(pools_teams):
            if len(pool_teams) < 2:
                continue
            
            pool_name = f"{category} - Poule {pool_letters[pool_idx]}" if num_pools > 1 else f"{category}"
            
            pool = await prisma.pool.create(data={
                "name": pool_name,
                "sportId": sport_id,
                "weightCategory": category,
                "isMorning": True,
                "PlaceId": default_place.id if default_place else None,
            })
            created_pools.append({
                "id": pool.id, 
                "name": pool_name, 
                "category": category, 
                "pool_letter": pool_letters[pool_idx] if num_pools > 1 else None,
                "teams": len(pool_teams)
            })
            
            # Assigner équipes à la poule
            for team in pool_teams:
                await prisma.team.update(
                    where={"id": team.id},
                    data={"pools": {"connect": [{"id": pool.id}]}}
                )
            
            # Générer matchs round-robin pour cette poule
            pool_matches = generate_round_robin_matches(pool_teams)
            start_time = default_place.startTime if default_place else sport.startTimeSaturday
            
            for idx, match_info in enumerate(pool_matches):
                await prisma.match.create(data={
                    "phase": "GroupStage",
                    "teamOneId": match_info['team_one_id'],
                    "teamTwoId": match_info['team_two_id'],
                    "sportId": sport_id,
                    "matchTime": start_time + timedelta(minutes=(created_matches + idx) * pool_match_length),
                    "field": 1,
                    "isScheduled": True,
                    "placeId": default_place.id if default_place else None,
                })
                created_matches += 1
    
    return {
        "status": "Poules créées avec succès",
        "pools_created": created_pools,
        "matches_created": created_matches,
        "max_per_pool": max_per_pool,
    }


@matches_router.post("/recalculate-pool-points/{sport_id}", dependencies=[Depends(check_admin)])
async def recalculate_pool_points(sport_id: int):
    """
    Recalcule les points de tous les matchs de poule pour un sport.
    Utile si les points n'ont pas été correctement comptabilisés.
    """
    # Récupérer le sport pour les points par match
    sport = await prisma.sport.find_unique(where={"id": sport_id})
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")
    
    points_per_win = sport.pointsperwin if sport.pointsperwin else 3
    points_per_defeat = sport.pointsperdefeat if sport.pointsperdefeat else 0
    points_per_draw = sport.pointsperdraw if sport.pointsperdraw else 1
    
    # Remettre à zéro les stats de toutes les équipes du sport
    await prisma.team.update_many(
        where={"sportId": sport_id},
        data={
            "tournamentPoints": 0,
            "goalsScored": 0,
            "goalsConceded": 0,
            "poolmatcheswon": 0,
            "poolmatcheslost": 0,
            "poolmatchesdraw": 0,
        }
    )
    
    # Récupérer tous les matchs de poule terminés
    pool_matches = await prisma.match.find_many(
        where={
            "sportId": sport_id,
            "phase": "GroupStage",
            "hasEnded": True,
        }
    )
    
    matches_processed = 0
    
    for match in pool_matches:
        if match.scoreTeamOne is None or match.scoreTeamTwo is None:
            continue
        if not match.teamOneId or not match.teamTwoId:
            continue
            
        # Déterminer le résultat
        if match.scoreTeamOne > match.scoreTeamTwo:
            # Team One gagne
            await prisma.team.update(
                where={"id": match.teamOneId},
                data={
                    "tournamentPoints": {"increment": points_per_win},
                    "poolmatcheswon": {"increment": 1},
                    "goalsScored": {"increment": match.scoreTeamOne},
                    "goalsConceded": {"increment": match.scoreTeamTwo},
                }
            )
            await prisma.team.update(
                where={"id": match.teamTwoId},
                data={
                    "tournamentPoints": {"increment": points_per_defeat},
                    "poolmatcheslost": {"increment": 1},
                    "goalsScored": {"increment": match.scoreTeamTwo},
                    "goalsConceded": {"increment": match.scoreTeamOne},
                }
            )
        elif match.scoreTeamTwo > match.scoreTeamOne:
            # Team Two gagne
            await prisma.team.update(
                where={"id": match.teamTwoId},
                data={
                    "tournamentPoints": {"increment": points_per_win},
                    "poolmatcheswon": {"increment": 1},
                    "goalsScored": {"increment": match.scoreTeamTwo},
                    "goalsConceded": {"increment": match.scoreTeamOne},
                }
            )
            await prisma.team.update(
                where={"id": match.teamOneId},
                data={
                    "tournamentPoints": {"increment": points_per_defeat},
                    "poolmatcheslost": {"increment": 1},
                    "goalsScored": {"increment": match.scoreTeamOne},
                    "goalsConceded": {"increment": match.scoreTeamTwo},
                }
            )
        else:
            # Égalité
            await prisma.team.update(
                where={"id": match.teamOneId},
                data={
                    "tournamentPoints": {"increment": points_per_draw},
                    "poolmatchesdraw": {"increment": 1},
                    "goalsScored": {"increment": match.scoreTeamOne},
                    "goalsConceded": {"increment": match.scoreTeamTwo},
                }
            )
            await prisma.team.update(
                where={"id": match.teamTwoId},
                data={
                    "tournamentPoints": {"increment": points_per_draw},
                    "poolmatchesdraw": {"increment": 1},
                    "goalsScored": {"increment": match.scoreTeamTwo},
                    "goalsConceded": {"increment": match.scoreTeamOne},
                }
            )
        
        matches_processed += 1
    
    return {
        "status": "Points recalculés",
        "matches_processed": matches_processed,
        "points_per_win": points_per_win,
        "points_per_draw": points_per_draw,
        "points_per_defeat": points_per_defeat,
    }


from pydantic import BaseModel
from typing import List as TypingList, Optional

class ManualQualifiedBody(BaseModel):
    manual_qualified_ids: Optional[TypingList[int]] = None  # Liste ordonnée des IDs si sélection manuelle

@matches_router.post("/generate-knockout-for-category/{sport_id}/{category}", dependencies=[Depends(check_admin)])
async def generate_knockout_for_category(
    sport_id: int, 
    category: str, 
    qualified_count: int = 2,
    body: Optional[ManualQualifiedBody] = None
):
    """
    Génère les phases finales pour UNE SEULE catégorie de poids.
    À utiliser quand les matchs de poule d'une catégorie sont terminés.
    
    Si manual_qualified_ids est fourni dans le body, ces équipes seront utilisées
    comme qualifiés (dans l'ordre fourni) au lieu du classement automatique.
    """
    from routes.pools import get_single_pool_ranking
    
    sport = await prisma.sport.find_unique(
        where={"id": sport_id},
        include={"placesSunday": True, "pools": True}
    )
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")
    
    # Trouver les poules de cette catégorie
    category_pools = [p for p in sport.pools if p.weightCategory == category]
    if not category_pools:
        raise HTTPException(status_code=400, detail=f"Aucune poule trouvée pour la catégorie {category}.")
    
    # Supprimer les matchs knockout existants pour cette catégorie (pour permettre la régénération)
    # Récupérer les IDs des équipes de cette catégorie
    category_team_ids = []
    for pool in category_pools:
        pool_with_teams = await prisma.pool.find_unique(
            where={"id": pool.id},
            include={"teams": True}
        )
        if pool_with_teams and pool_with_teams.teams:
            category_team_ids.extend([t.id for t in pool_with_teams.teams])
    
    if category_team_ids:
        # Supprimer tous les matchs knockout de cette catégorie
        # Étape 1: Supprimer les matchs avec teamOneId ou teamTwoId de cette catégorie
        await prisma.match.delete_many(
            where={
                "sportId": sport_id,
                "phase": {"not": "GroupStage"},
                "OR": [
                    {"teamOneId": {"in": category_team_ids}},
                    {"teamTwoId": {"in": category_team_ids}},
                ]
            }
        )
        
        # Étape 2: Supprimer les matchs orphelins (sources non résolues qui pointaient vers des matchs supprimés)
        # Ce sont les matchs knockout avec teamOneId=null ET teamTwoId=null ET des sources définies
        orphan_matches = await prisma.match.find_many(
            where={
                "sportId": sport_id,
                "phase": {"not": "GroupStage"},
                "teamOneId": None,
                "teamTwoId": None,
                "OR": [
                    {"teamOneSource": {"not": None}},
                    {"teamTwoSource": {"not": None}},
                ]
            }
        )
        
        # Vérifier si les sources référencent des matchs qui existent encore
        for match in orphan_matches:
            should_delete = False
            
            if match.teamOneSource and match.teamOneSource.startswith("winner:"):
                source_match_id = int(match.teamOneSource.split(":")[1])
                source_match = await prisma.match.find_unique(where={"id": source_match_id})
                if not source_match:
                    should_delete = True
            
            if match.teamTwoSource and match.teamTwoSource.startswith("winner:"):
                source_match_id = int(match.teamTwoSource.split(":")[1])
                source_match = await prisma.match.find_unique(where={"id": source_match_id})
                if not source_match:
                    should_delete = True
                    
            if match.teamOneSource and match.teamOneSource.startswith("loser:"):
                source_match_id = int(match.teamOneSource.split(":")[1])
                source_match = await prisma.match.find_unique(where={"id": source_match_id})
                if not source_match:
                    should_delete = True
                    
            if match.teamTwoSource and match.teamTwoSource.startswith("loser:"):
                source_match_id = int(match.teamTwoSource.split(":")[1])
                source_match = await prisma.match.find_unique(where={"id": source_match_id})
                if not source_match:
                    should_delete = True
            
            if should_delete:
                await prisma.match.delete(where={"id": match.id})
    
    # Récupérer les qualifiés - combiner sélection manuelle ET classement automatique
    all_qualified = []
    manual_ids = body.manual_qualified_ids if body and body.manual_qualified_ids else []
    
    # Pour chaque poule, utiliser soit la sélection manuelle, soit le classement auto
    for pool in category_pools:
        pool_with_teams = await prisma.pool.find_unique(
            where={"id": pool.id},
            include={"teams": True}
        )
        if not pool_with_teams:
            continue
            
        pool_team_ids = [t.id for t in pool_with_teams.teams] if pool_with_teams.teams else []
        
        # Vérifier si on a des sélections manuelles pour CETTE poule
        manual_for_this_pool = [tid for tid in manual_ids if tid in pool_team_ids]
        
        if len(manual_for_this_pool) >= 2:
            # Utiliser la sélection manuelle pour cette poule
            for idx, team_id in enumerate(manual_for_this_pool[:qualified_count]):
                team = await prisma.team.find_unique(where={"id": team_id})
                if team:
                    all_qualified.append({
                        "team": team,
                        "pool_name": pool.name,
                        "pool_rank": idx + 1,
                    })
        else:
            # Utiliser le classement automatique pour cette poule
            try:
                ranking = await get_single_pool_ranking(pool.id)
            except:
                continue
            
            ranked_teams = ranking.get("teams", [])
            
            for idx, team_data in enumerate(ranked_teams[:qualified_count]):
                team = await prisma.team.find_unique(where={"id": team_data["id"]})
                if team:
                    all_qualified.append({
                        "team": team,
                        "pool_name": pool.name,
                        "pool_rank": idx + 1,
                    })
    
    if len(all_qualified) < 2:
        raise HTTPException(status_code=400, detail="Pas assez de qualifiés pour générer les phases finales.")
    
    # Seeding pour éviter les rematches: équipes de même poule ne se rencontrent pas avant la finale
    by_pool = {}
    for q in all_qualified:
        pool_name = q["pool_name"]
        by_pool.setdefault(pool_name, []).append(q)
    
    pool_names = list(by_pool.keys())
    num_pools = len(pool_names)
    
    # Trier les équipes de chaque poule par rang
    for pool_name in by_pool:
        by_pool[pool_name] = sorted(by_pool[pool_name], key=lambda x: x["pool_rank"])
    
    qualified_ordered = []
    
    if num_pools == 1:
        # Une seule poule: ordre par rang
        qualified_ordered = by_pool[pool_names[0]]
    elif num_pools == 2:
        # 2 poules: croiser pour que 1A vs 2B et 1B vs 2A
        # Ordre du bracket: [1A, 2B, 1B, 2A] → Match1: 1A vs 2B, Match2: 1B vs 2A
        pool_a = by_pool[pool_names[0]]
        pool_b = by_pool[pool_names[1]]
        
        if len(pool_a) >= 1:
            qualified_ordered.append(pool_a[0])  # 1A
        if len(pool_b) >= 2:
            qualified_ordered.append(pool_b[1])  # 2B
        if len(pool_b) >= 1:
            qualified_ordered.append(pool_b[0])  # 1B
        if len(pool_a) >= 2:
            qualified_ordered.append(pool_a[1])  # 2A
    else:
        # 3+ poules: placer pour maximiser la distance entre équipes de même poule
        # Principe: moitié haute = 1ers + 2èmes d'autres poules, moitié basse = idem inversé
        firsts = [by_pool[p][0] for p in pool_names if len(by_pool[p]) >= 1]
        seconds = [by_pool[p][1] for p in pool_names if len(by_pool[p]) >= 2]
        
        # Mélanger 1ers avec 2èmes d'autres poules
        # Ex: 3 poules → [1A, 2B, 1C] en haut, [1B, 2C, 2A] en bas
        half = (len(firsts) + len(seconds)) // 2
        
        # Moitié haute: 1ers des poules impaires + 2èmes des poules paires
        top_half = []
        for i, p in enumerate(pool_names):
            if i % 2 == 0 and len(by_pool[p]) >= 1:
                top_half.append(by_pool[p][0])
            if i % 2 == 1 and len(by_pool[p]) >= 2:
                top_half.append(by_pool[p][1])
        
        # Moitié basse: 1ers des poules paires + 2èmes des poules impaires
        bottom_half = []
        for i, p in enumerate(pool_names):
            if i % 2 == 1 and len(by_pool[p]) >= 1:
                bottom_half.append(by_pool[p][0])
            if i % 2 == 0 and len(by_pool[p]) >= 2:
                bottom_half.append(by_pool[p][1])
        
        qualified_ordered = [{"team": q["team"], "pool_name": q["pool_name"], "pool_rank": q["pool_rank"]} 
                            for q in top_half + bottom_half]
    
    qualified_teams = [q["team"] for q in qualified_ordered]
    
    # Générer bracket knockout SANS seeding (on a déjà fait le seeding ci-dessus)
    bracket = generate_knockout_bracket(qualified_teams, category, seeded=False)
    
    default_place_id = sport.placesSunday[0].id if sport.placesSunday else None
    start_time = sport.startTimeSunday
    
    created_matches = []
    match_id_map = {}
    
    for match_info in bracket:
        team_one_source = None
        team_two_source = None
        
        if match_info.get('team_one_source'):
            src = match_info['team_one_source']
            if src.startswith('W') and int(src[1:]) in match_id_map:
                team_one_source = f"winner:{match_id_map[int(src[1:])]}"
            elif src.startswith('L') and int(src[1:]) in match_id_map:
                team_one_source = f"loser:{match_id_map[int(src[1:])]}"
        
        if match_info.get('team_two_source'):
            src = match_info['team_two_source']
            if src.startswith('W') and int(src[1:]) in match_id_map:
                team_two_source = f"winner:{match_id_map[int(src[1:])]}"
            elif src.startswith('L') and int(src[1:]) in match_id_map:
                team_two_source = f"loser:{match_id_map[int(src[1:])]}"
        
        new_match = await prisma.match.create(data={
            "phase": match_info['phase'],
            "teamOneId": match_info.get('team_one_id'),
            "teamTwoId": match_info.get('team_two_id'),
            "teamOneSource": team_one_source,
            "teamTwoSource": team_two_source,
            "sportId": sport_id,
            "matchTime": start_time + timedelta(minutes=match_info['match_number'] * 15),
            "field": 1,
            "isScheduled": True,
            "placeId": default_place_id,
        })
        match_id_map[match_info['match_number']] = new_match.id
        created_matches.append(new_match)
    
    return {
        "status": f"Phases finales générées pour {category}",
        "category": category,
        "qualified_count": len(all_qualified),
        "matches_created": len(created_matches),
    }


@matches_router.post("/generate-knockout-from-rankings/{sport_id}", dependencies=[Depends(check_admin)])
async def generate_knockout_from_rankings(sport_id: int, qualified_count: int = 2):
    """
    ÉTAPE 2: Génère les phases finales par catégorie.
    - Récupère les X premiers de chaque poule d'une catégorie
    - Combine tous les qualifiés de la catégorie pour faire un bracket knockout
    - Un seul gagnant par catégorie
    """
    from routes.pools import get_single_pool_ranking
    
    sport = await prisma.sport.find_unique(
        where={"id": sport_id},
        include={"placesSunday": True, "pools": True}
    )
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")
    
    # Filtrer poules avec catégorie de poids
    weight_pools = [p for p in sport.pools if p.weightCategory]
    if not weight_pools:
        raise HTTPException(status_code=400, detail="Aucune poule trouvée. Lancez d'abord 'generate-weight-pools'.")
    
    # Grouper les poules par catégorie (une catégorie peut avoir plusieurs poules A, B, C...)
    pools_by_category = {}
    for pool in weight_pools:
        pools_by_category.setdefault(pool.weightCategory, []).append(pool)
    
    created_matches = []
    default_place_id = sport.placesSunday[0].id if sport.placesSunday else None
    start_time = sport.startTimeSunday
    match_offset = 0
    
    # Pour chaque catégorie, combiner les qualifiés de toutes ses poules
    for category, category_pools in pools_by_category.items():
        all_qualified = []
        
        for pool in category_pools:
            try:
                ranking = await get_single_pool_ranking(pool.id)
            except:
                continue
            
            ranked_teams = ranking.get("teams", [])
            
            # Prendre les X premiers de cette poule
            for idx, team_data in enumerate(ranked_teams[:qualified_count]):
                team = await prisma.team.find_unique(where={"id": team_data["id"]})
                if team:
                    all_qualified.append({
                        "team": team,
                        "pool_name": pool.name,
                        "pool_rank": idx + 1,
                    })
        
        if len(all_qualified) < 2:
            continue
        
        # Trier pour le seeding du bracket
        # Grouper par rang dans la poule
        by_rank = {}
        for q in all_qualified:
            rank = q["pool_rank"]
            by_rank.setdefault(rank, []).append(q)
        
        # Construire la liste ordonnée
        qualified_ordered = []
        for rank in sorted(by_rank.keys()):
            qualified_ordered.extend(by_rank[rank])
        
        qualified_teams = [q["team"] for q in qualified_ordered]
        
        # Générer bracket knockout pour cette catégorie
        bracket = generate_knockout_bracket(qualified_teams, category, seeded=True)
        match_id_map = {}
        
        for match_info in bracket:
            team_one_source = None
            team_two_source = None
            
            if match_info.get('team_one_source'):
                src = match_info['team_one_source']
                if src.startswith('W') and int(src[1:]) in match_id_map:
                    team_one_source = f"winner:{match_id_map[int(src[1:])]}"
                elif src.startswith('L') and int(src[1:]) in match_id_map:
                    team_one_source = f"loser:{match_id_map[int(src[1:])]}"
            
            if match_info.get('team_two_source'):
                src = match_info['team_two_source']
                if src.startswith('W') and int(src[1:]) in match_id_map:
                    team_two_source = f"winner:{match_id_map[int(src[1:])]}"
                elif src.startswith('L') and int(src[1:]) in match_id_map:
                    team_two_source = f"loser:{match_id_map[int(src[1:])]}"
            
            new_match = await prisma.match.create(data={
                "phase": match_info['phase'],
                "teamOneId": match_info.get('team_one_id'),
                "teamTwoId": match_info.get('team_two_id'),
                "teamOneSource": team_one_source,
                "teamTwoSource": team_two_source,
                "sportId": sport_id,
                "matchTime": start_time + timedelta(minutes=(match_offset + match_info['match_number']) * 15),
                "field": 1,
                "isScheduled": True,
                "placeId": default_place_id,
            })
            match_id_map[match_info['match_number']] = new_match.id
            created_matches.append(new_match)
        
        match_offset += len(bracket)
    
    return {
        "status": "Phases finales générées",
        "categories_count": len(pools_by_category),
        "matches_created": len(created_matches),
        "qualified_per_pool": qualified_count,
    }


@matches_router.post("/generate-knockout-by-category/{sport_id}", dependencies=[Depends(check_admin)])
async def generate_knockout_by_category(sport_id: int):
    """
    [ALTERNATIF] Génère directement un knockout sans poules (élimination directe).
    Pour le format avec poules, utilisez generate-weight-pools puis generate-knockout-from-rankings.
    """
    # 1. Récupérer le sport
    sport = await prisma.sport.find_unique(
        where={"id": sport_id},
        include={
            "placesSunday": True,
        }
    )
    
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")
    
    # 2. Récupérer toutes les équipes validées du sport avec leurs participants
    teams = await prisma.team.find_many(
        where={
            "sportId": sport_id,
            "OR": [
                {"status": "Validated"},
                {"status": "PrincipalList"},
            ]
        },
        include={
            "participants": True,
        }
    )
    
    if not teams:
        raise HTTPException(status_code=400, detail="No validated teams found for this sport.")
    
    # 3. Grouper les équipes par catégorie de poids du participant
    # (Pour boxe/judo, 1 équipe = 1 participant)
    teams_by_category = {}
    
    for team in teams:
        if team.participants and len(team.participants) > 0:
            participant = team.participants[0]  # Premier participant de l'équipe
            weight_category = participant.weightCategory
            
            if weight_category:
                if weight_category not in teams_by_category:
                    teams_by_category[weight_category] = []
                teams_by_category[weight_category].append(team)
    
    if not teams_by_category:
        raise HTTPException(
            status_code=400, 
            detail="No teams with weight categories found. Make sure participants have weightCategory set."
        )
    
    # 4. Pour chaque catégorie, créer une Pool et générer le bracket
    created_pools = []
    created_matches = []
    
    # Récupérer le premier lieu disponible pour le dimanche (si disponible)
    default_place_id = sport.placesSunday[0].id if sport.placesSunday else None
    default_start_time = sport.startTimeSunday
    
    for category, category_teams in teams_by_category.items():
        if len(category_teams) < 2:
            # Pas assez d'équipes pour un tournoi
            continue
        
        # Créer une Pool pour cette catégorie
        pool = await prisma.pool.create(
            data={
                "name": f"Bracket {category}",
                "sportId": sport_id,
                "weightCategory": category,
                "isMorning": False,
                "PlaceId": default_place_id,
            }
        )
        created_pools.append(pool)
        
        # Assigner les équipes à cette pool
        for team in category_teams:
            await prisma.team.update(
                where={"id": team.id},
                data={
                    "pools": {"connect": [{"id": pool.id}]}
                }
            )
        
        # Générer le bracket d'élimination
        bracket_matches = generate_knockout_bracket(category_teams, category)
        
        # Créer les matchs en base de données
        match_id_mapping = {}  # Pour mapper match_number -> match.id en DB
        
        for match_info in bracket_matches:
            # Calculer le temps du match basé sur l'ordre
            match_time = default_start_time + timedelta(minutes=match_info['match_number'] * 15)
            
            # Adapter les sources pour le format existant (W1 -> winner:db_match_id)
            team_one_source = None
            team_two_source = None
            
            if match_info['team_one_source']:
                source = match_info['team_one_source']
                if source.startswith('W'):
                    ref_match_num = int(source[1:])
                    if ref_match_num in match_id_mapping:
                        team_one_source = f"winner:{match_id_mapping[ref_match_num]}"
                elif source.startswith('L'):
                    ref_match_num = int(source[1:])
                    if ref_match_num in match_id_mapping:
                        team_one_source = f"loser:{match_id_mapping[ref_match_num]}"
            
            if match_info['team_two_source']:
                source = match_info['team_two_source']
                if source.startswith('W'):
                    ref_match_num = int(source[1:])
                    if ref_match_num in match_id_mapping:
                        team_two_source = f"winner:{match_id_mapping[ref_match_num]}"
                elif source.startswith('L'):
                    ref_match_num = int(source[1:])
                    if ref_match_num in match_id_mapping:
                        team_two_source = f"loser:{match_id_mapping[ref_match_num]}"
            
            new_match = await prisma.match.create(
                data={
                    "phase": match_info['phase'],
                    "teamOneId": match_info['team_one_id'],
                    "teamTwoId": match_info['team_two_id'],
                    "teamOneSource": team_one_source,
                    "teamTwoSource": team_two_source,
                    "sportId": sport_id,
                    "matchTime": match_time,
                    "field": 1,
                    "isScheduled": True,
                    "placeId": default_place_id,
                }
            )
            
            # Mapper le numéro de match local vers l'ID en base
            match_id_mapping[match_info['match_number']] = new_match.id
            created_matches.append(new_match)
    
    return {
        "status": "Knockout brackets generated successfully",
        "categories_count": len(created_pools),
        "pools_created": [{"id": p.id, "name": p.name, "category": p.weightCategory} for p in created_pools],
        "matches_created": len(created_matches),
    }


class MatchUpdate(BaseModel):
    field: Optional[int] = None
    matchTime: Optional[datetime] = None



@matches_router.put("/{match_id}", dependencies=[Depends(check_admin)])
async def update_match(match_id: int, update_data: MatchUpdate = Body(...)):
    update_fields = {}
    if update_data.field is not None:
        update_fields["field"] = update_data.field
    if update_data.matchTime is not None:
        update_fields["matchTime"] = update_data.matchTime

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update.")

    updated_match = await prisma.match.update(
        where={"id": match_id},
        data=update_fields,
    )
    return updated_match

class MatchScoreUpdate(BaseModel):
    scoreTeamOne: int
    scoreTeamTwo: int
    winnerId: Optional[int] = None  # Optionally set the winner

@matches_router.put("/start/{match_id}")
async def start_match(match_id: int):
    match = await prisma.match.update(
        where={"id": match_id},
        data={"hasStarted": True}
    )
    return match

@matches_router.put("/end/{match_id}")
async def end_match(match_id: int):
    match = await prisma.match.update(
        where={"id": match_id},
        data={"hasEnded": True}
    )
    return match





class MatchScoreUpdate(BaseModel):
    scoreTeamOne: int
    scoreTeamTwo: int


@matches_router.put("/score/{match_id}")
async def update_match_score(match_id: int, score_data: MatchScoreUpdate):
    # Fetch the match details
    match = await prisma.match.find_unique(
        where={"id": match_id}
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Determine the match phase
    match_phase = match.phase  # Assuming 'phase' is a field in the match model
    
     # Fetch sport settings for points configuration
    sport_settings = await prisma.sport.find_unique(where={"id": match.sportId})
    if not sport_settings:
        raise ValueError("Sport settings not found for this match.")

    # Points configuration avec valeurs par défaut (3 pts victoire, 1 pt nul, 0 défaite)
    # On utilise les valeurs par défaut si les valeurs sont None OU 0
    points_per_win = sport_settings.pointsperwin if sport_settings.pointsperwin else 3
    points_per_defeat = sport_settings.pointsperdefeat if sport_settings.pointsperdefeat else 0
    points_per_draw = sport_settings.pointsperdraw if sport_settings.pointsperdraw else 1
    
    if match_phase == "GroupStage":
        # Existing logic for group stage matches

        # Fetch the previous scores and determine the previous winner
        previous_score_team_one = match.scoreTeamOne
        previous_score_team_two = match.scoreTeamTwo
        previous_winner_id = match.winnerId

        # Reverse previous match effects if the match was already scored
        if previous_score_team_one is not None and previous_score_team_two is not None:
            # Undo goals scored and conceded
            await prisma.team.update(
                where={"id": match.teamOneId},
                data={
                    "goalsScored": {"decrement": previous_score_team_one},
                    "goalsConceded": {"decrement": previous_score_team_two},
                },
            )
            await prisma.team.update(
                where={"id": match.teamTwoId},
                data={
                    "goalsScored": {"decrement": previous_score_team_two},
                    "goalsConceded": {"decrement": previous_score_team_one},
                },
            )

            # Undo tournament points and match stats
            if previous_score_team_one > previous_score_team_two:
                # Team One was the previous winner
                await prisma.team.update(
                    where={"id": match.teamOneId},
                    data={
                        "tournamentPoints": {"decrement": points_per_win},
                        "poolmatcheswon": {"decrement": 1},
                    },
                )
                await prisma.team.update(
                    where={"id": match.teamTwoId},
                    data={
                        "tournamentPoints": {"decrement": points_per_defeat},
                        "poolmatcheslost": {"decrement": 1},
                    },
                )
            elif previous_score_team_two > previous_score_team_one:
                # Team Two was the previous winner
                await prisma.team.update(
                    where={"id": match.teamTwoId},
                    data={
                        "tournamentPoints": {"decrement": points_per_win},
                        "poolmatcheswon": {"decrement": 1},
                    },
                )
                await prisma.team.update(
                    where={"id": match.teamOneId},
                    data={
                        "tournamentPoints": {"decrement": points_per_defeat},
                        "poolmatcheslost": {"decrement": 1},
                    },
                )
            else:
                # It was a draw
                await prisma.team.update(
                    where={"id": match.teamOneId},
                    data={
                        "tournamentPoints": {"decrement": points_per_draw},
                        "poolmatchesdraw": {"decrement": 1},
                    },
                )
                await prisma.team.update(
                    where={"id": match.teamTwoId},
                    data={
                        "tournamentPoints": {"decrement": points_per_draw},
                        "poolmatchesdraw": {"decrement": 1},
                    },
                )


        # Calculate the winner and assign points
        winner_id = None
        points_team_one = 0
        points_team_two = 0
        team_one_update = {}
        team_two_update = {}

        if score_data.scoreTeamOne > score_data.scoreTeamTwo:
            winner_id = match.teamOneId
            points_team_one = points_per_win
            points_team_two = points_per_defeat
            team_one_update = {"poolmatcheswon": {"increment": 1}}
            team_two_update = {"poolmatcheslost": {"increment": 1}}
        elif score_data.scoreTeamTwo > score_data.scoreTeamOne:
            winner_id = match.teamTwoId
            points_team_one = points_per_defeat
            points_team_two = points_per_win
            team_one_update = {"poolmatcheslost": {"increment": 1}}
            team_two_update = {"poolmatcheswon": {"increment": 1}}
        else:
            points_team_one = points_per_draw
            points_team_two = points_per_draw
            team_one_update = {"poolmatchesdraw": {"increment": 1}}
            team_two_update = {"poolmatchesdraw": {"increment": 1}}

        # Update match result
        await prisma.match.update(
            where={"id": match_id},
            data={
                "scoreTeamOne": score_data.scoreTeamOne,
                "scoreTeamTwo": score_data.scoreTeamTwo,
                "winnerId": winner_id,
                "hasEnded": True,
            },
        )

        # Update goals scored and conceded for both teams
        await prisma.team.update(
            where={"id": match.teamOneId},
            data={
                "goalsScored": {"increment": score_data.scoreTeamOne},
                "goalsConceded": {"increment": score_data.scoreTeamTwo},
                "tournamentPoints": {"increment": points_team_one},
                **team_one_update,
            },
        )
        await prisma.team.update(
            where={"id": match.teamTwoId},
            data={
                "goalsScored": {"increment": score_data.scoreTeamTwo},
                "goalsConceded": {"increment": score_data.scoreTeamOne},
                "tournamentPoints": {"increment": points_team_two},
                **team_two_update,
            },
        )
    
    else:
        # Determine the winner based on the scores
        if score_data.scoreTeamOne > score_data.scoreTeamTwo:
            winner_id = match.teamOneId
        elif score_data.scoreTeamTwo > score_data.scoreTeamOne:
            winner_id = match.teamTwoId
        else:
            # Handle draw scenarios in knockout (e.g., penalties)
            # Assuming `winnerId` must be set; you might need additional data to determine the winner
            raise HTTPException(status_code=400, detail="Knockout matches must have a clear winner")

        # Update match result without altering goals, points, or stats
        await prisma.match.update(
            where={"id": match_id},
            data={
                "scoreTeamOne": score_data.scoreTeamOne,
                "scoreTeamTwo": score_data.scoreTeamTwo,
                "winnerId": winner_id,
                "hasEnded": True,
            },
        )

    return {"status": "Score and match result updated successfully", "winnerId": winner_id}

@matches_router.get(
    "/group-stage/team/{team_id}",
    response_model=List[Match],
    dependencies=[Depends(check_admin)],
)
async def get_group_stage_matches_for_team(team_id: int):
    
    matches = await prisma.match.find_many(
        where={
            "phase": PhaseType.GroupStage,  # Use enum for phase if defined
            "OR": [
                {"teamOneId": team_id},
                {"teamTwoId": team_id}
            ]
        },
        include={
            "teamOne": {
                "include": {
                    "school": True,
                }
            },
            "teamTwo": {
                "include": {
                    "school": True,
                }
            }
        },
        order=[
            {"matchTime": "asc"},
            {"field": "asc"},
        ],
    )

    # If no matches found, check if the team exists
    if not matches:
        team = await prisma.team.find_unique(where={"id": team_id})
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        # Team exists but has no GroupStage matches
        return []

    return matches

@matches_router.get(
    "/knockout/team/{team_id}",
    response_model=List[Match],
    dependencies=[Depends(check_admin)],
)
async def get_group_stage_matches_for_team(team_id: int):
    # Fetch the sport associated with the team to get startTimeSunday
    team = await prisma.team.find_unique(
        where={"id": team_id},
        include={"sport": True},
    )

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    start_time_sunday = team.sport.startTimeSunday

    # Fetch matches where matchTime > startTimeSunday
    matches = await prisma.match.find_many(
        where={
            "matchTime": {"gte": start_time_sunday},
            "OR": [
                {"teamOneId": team_id},
                {"teamTwoId": team_id},
            ],
        },
        include={
            "teamOne": {
                "include": {"school": True},
            },
            "teamTwo": {
                "include": {"school": True},
            },
        },
        order=[
            {"matchTime": "asc"},
            {"field": "asc"},
        ],
    )

    return matches



@matches_router.get(
    "/all/team/{team_id}",
    response_model=List[Match],
    dependencies=[Depends(check_admin)],
)
async def get_group_stage_matches_for_team(team_id: int):
    team = await prisma.team.find_unique(
        where={"id": team_id},
    )

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    # Fetch matches where matchTime > startTimeSunday
    matches = await prisma.match.find_many(
        where={
            "OR": [
                {"teamOneId": team_id},
                {"teamTwoId": team_id},
            ],
        },
        include={
            "teamOne": {
                "include": {"school": True},
            },
            "teamTwo": {
                "include": {"school": True},
            },
        },
        order=[
            {"matchTime": "asc"},
            {"field": "asc"},
        ],
    )

    return matches




### Permet de créer un match à la main au cas ou le système de génération automatique ne fonctionne pas ###



class MatchCreate(BaseModel):
    phase: PhaseType
    teamOneId: Optional[int] 
    teamTwoId: Optional[int] 
    teamOneSource: Optional[str]
    teamTwoSource: Optional[str]
    field: int 
    matchTime: datetime
    sportId: int
    placeId: Optional[int]
    matchDuration: Optional[int] = None  # Durée personnalisée en minutes pour les phases finales
    numberOfPeriods: Optional[int] = None

    
@matches_router.post("/create", dependencies=[Depends(check_admin)], response_model=Match)
async def create_match(match: MatchCreate):
    # Validate that sport exists
    sport = await prisma.sport.find_unique(where={"id": match.sportId})
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found.")

    # Validate that teams exist if provided
    if match.teamOneId:
        team_one = await prisma.team.find_unique(where={"id": match.teamOneId})
        if not team_one:
            raise HTTPException(status_code=404, detail="Team One not found.")
    if match.teamTwoId:
        team_two = await prisma.team.find_unique(where={"id": match.teamTwoId})
        if not team_two:
            raise HTTPException(status_code=404, detail="Team Two not found.")

    # Create the match
    try:
        new_match = await prisma.match.create(
            data={
                "phase": match.phase,
                "teamOneId": match.teamOneId,
                "teamTwoId": match.teamTwoId,
                "field": match.field,
                "matchTime": match.matchTime,
                "sportId": match.sportId,
                "isScheduled": True,
                "hasStarted": False,
                "hasEnded": False,
                "placeId": match.placeId,
                "teamOneSource": match.teamOneSource,
                "teamTwoSource": match.teamTwoSource,
                "matchDuration": match.matchDuration if match.phase != PhaseType.GroupStage else None,
                "numberOfPeriods": match.numberOfPeriods,
                "currentPeriod": 1 if match.numberOfPeriods is not None and match.numberOfPeriods > 0 else None,
        }
        )
        return new_match
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

#Permet de modifier un match 


class MatchModifyRequest(BaseModel):
    phase: Optional[PhaseType] = None
    teamOneId: Optional[int] = None
    teamTwoId: Optional[int] = None
    teamOneSource: Optional[str] = None
    teamTwoSource: Optional[str] = None
    field: Optional[int] = None
    matchTime: Optional[datetime] = None
    sportId: Optional[int] = None
    placeId: Optional[int] = None
    isScheduled: Optional[bool] = None
    hasStarted: Optional[bool] = None
    hasEnded: Optional[bool] = None
    matchDuration: Optional[int] = None  # Durée personnalisée en minutes pour les phases finales
    numberOfPeriods: Optional[int] = None
    currentPeriod: Optional[int] = None
    scoreTeamOne: Optional[int] = None
    scoreTeamTwo: Optional[int] = None
    winnerId: Optional[int] = None
    # Champ spécial pour indiquer qu'on veut remettre à null (car None = "pas de changement" par défaut)
    resetScores: Optional[bool] = None
    resetWinner: Optional[bool] = None

@matches_router.put("/modify/{match_id}", dependencies=[Depends(check_admin)], response_model=Match)
async def modify_match(match_id: int, data: MatchModifyRequest = Body(...)):
    match = await prisma.match.find_unique(where={"id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")

    update_data = {}
    
    # Gérer les champs normaux (sauf les champs spéciaux)
    for k, v in data.dict(exclude_unset=True).items():
        if k in ['resetScores', 'resetWinner']:
            continue
        if v is not None:
            update_data[k] = v
    
    # Gérer le reset des scores
    if data.resetScores:
        update_data["scoreTeamOne"] = None
        update_data["scoreTeamTwo"] = None
    
    # Gérer le reset du gagnant
    if data.resetWinner:
        update_data["winnerId"] = None
        update_data["hasEnded"] = False

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")

    updated_match = await prisma.match.update(
        where={"id": match_id},
        data=update_data
    )
    return updated_match

# Démarrer un match: hasStarted True et initialise currentPeriod si nécessaire
@matches_router.put("/start/{match_id}")
async def start_match(match_id: int):
    match = await prisma.match.find_unique(where={"id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    data = {"hasStarted": True}
    if match.numberOfPeriods and (match.currentPeriod is None or match.currentPeriod < 1):
        data["currentPeriod"] = 1
    return await prisma.match.update(where={"id": match_id}, data=data)

# Passer à la période suivante
@matches_router.put("/period/next/{match_id}")
async def next_period(match_id: int):
    match = await prisma.match.find_unique(where={"id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if not match.numberOfPeriods:
        raise HTTPException(status_code=400, detail="numberOfPeriods non défini pour ce match")
    current = match.currentPeriod or 1
    if current >= match.numberOfPeriods:
        return match  # déjà à la dernière période
    updated = await prisma.match.update(
        where={"id": match_id},
        data={"currentPeriod": current + 1}
    )
    return updated

# Définir explicitement la période courante
class PeriodSetRequest(BaseModel):
    period: int

@matches_router.put("/period/set/{match_id}")
async def set_period(match_id: int, body: PeriodSetRequest):
    match = await prisma.match.find_unique(where={"id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if not match.numberOfPeriods:
        raise HTTPException(status_code=400, detail="numberOfPeriods non défini pour ce match")
    if body.period < 1 or body.period > match.numberOfPeriods:
        raise HTTPException(status_code=400, detail="Période hors bornes")
    updated = await prisma.match.update(where={"id": match_id}, data={"currentPeriod": body.period})
    return updated

# Terminer un match: hasEnded True, et caler currentPeriod sur numberOfPeriods si défini
@matches_router.put("/end/{match_id}")
async def end_match(match_id: int):
    match = await prisma.match.find_unique(where={"id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    data = {"hasEnded": True}
    if match.numberOfPeriods:
        data["currentPeriod"] = match.numberOfPeriods
    return await prisma.match.update(where={"id": match_id}, data=data)


    
##Permet d'effacer un match 

@matches_router.delete("/{match_id}", dependencies=[Depends(check_admin)])
async def delete_match(match_id: int):
    # Fetch the match details
    match = await prisma.match.find_unique(where={"id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")

    # Fetch sport settings for points configuration
    sport_settings = await prisma.sport.find_unique(where={"id": match.sportId})
    if not sport_settings:
        raise ValueError("Sport settings not found for this match.")

    # Points configuration avec valeurs par défaut
    points_per_win = sport_settings.pointsperwin if sport_settings.pointsperwin else 3
    points_per_defeat = sport_settings.pointsperdefeat if sport_settings.pointsperdefeat else 0
    points_per_draw = sport_settings.pointsperdraw if sport_settings.pointsperdraw else 1

    # Check if the match has ended
    if match.hasEnded:
        previous_score_team_one = match.scoreTeamOne
        previous_score_team_two = match.scoreTeamTwo

        if match.phase == PhaseType.GroupStage:
            # Reverse the effects of the match for GroupStage
            if previous_score_team_one is not None and previous_score_team_two is not None:
                # Undo goals scored and conceded
                await prisma.team.update(
                    where={"id": match.teamOneId},
                    data={
                        "goalsScored": {"decrement": previous_score_team_one},
                        "goalsConceded": {"decrement": previous_score_team_two},
                    },
                )
                await prisma.team.update(
                    where={"id": match.teamTwoId},
                    data={
                        "goalsScored": {"decrement": previous_score_team_two},
                        "goalsConceded": {"decrement": previous_score_team_one},
                    },
                )

                # Undo tournament points and match stats
                if previous_score_team_one > previous_score_team_two:
                    # Team One was the winner
                    await prisma.team.update(
                        where={"id": match.teamOneId},
                        data={
                            "tournamentPoints": {"decrement": points_per_win},
                            "poolmatcheswon": {"decrement": 1},
                        },
                    )
                    await prisma.team.update(
                        where={"id": match.teamTwoId},
                        data={
                            "tournamentPoints": {"decrement": points_per_defeat},
                            "poolmatcheslost": {"decrement": 1},
                        },
                    )
                elif previous_score_team_two > previous_score_team_one:
                    # Team Two was the winner
                    await prisma.team.update(
                        where={"id": match.teamTwoId},
                        data={
                            "tournamentPoints": {"decrement": points_per_win},
                            "poolmatcheswon": {"decrement": 1},
                        },
                    )
                    await prisma.team.update(
                        where={"id": match.teamOneId},
                        data={
                            "tournamentPoints": {"decrement": points_per_defeat},
                            "poolmatcheslost": {"decrement": 1},
                        },
                    )
                else:
                    # It was a draw
                    await prisma.team.update(
                        where={"id": match.teamOneId},
                        data={
                            "tournamentPoints": {"decrement": points_per_draw},
                            "poolmatchesdraw": {"decrement": 1},
                        },
                    )
                    await prisma.team.update(
                        where={"id": match.teamTwoId},
                        data={
                            "tournamentPoints": {"decrement": points_per_draw},
                            "poolmatchesdraw": {"decrement": 1},
                        },
                    )

    # Delete the match
    await prisma.match.delete(where={"id": match_id})

    return {"message": "Match deleted successfully, and team stats updated if applicable."}


@matches_router.delete("/sport/{sport_id}/all", dependencies=[Depends(check_admin)])
async def delete_all_matches_of_sport(sport_id: int):
    # Fetch all matches for the given sport
    matches = await prisma.match.find_many(where={"sportId": sport_id})
    deleted_count = 0

    for match in matches:
        await prisma.match.delete(where={"id": match.id})
        deleted_count += 1

    return {"message": f"Deleted {deleted_count} matches for sport {sport_id}."}


#pour le teamOneSource et teamTwoSource, on va chercher les id des équipes en fonction de la source

from fastapi import APIRouter, HTTPException
from typing import Optional

@matches_router.post("/resolve-sources/sport/{sport_id}", dependencies=[Depends(check_admin)])
async def resolve_match_sources(sport_id: int):
    # Chercher TOUS les matchs avec des sources (pas seulement ceux avec teamId = None)
    matches = await prisma.match.find_many(
        where={
            "sportId": sport_id,
            "OR": [
                {"teamOneSource": {"not": None}},
                {"teamTwoSource": {"not": None}},
            ]
        }
    )
    updated_count = 0

    for match in matches:
        updated = False
        team_one_id = match.teamOneId
        team_two_id = match.teamTwoId

        # Toujours résoudre teamOneSource si elle existe
        if match.teamOneSource:
            team_id = await resolve_team_source(match.teamOneSource, match.sportId)
            if team_id and team_id != team_one_id:
                team_one_id = team_id
                updated = True

        # Toujours résoudre teamTwoSource si elle existe
        if match.teamTwoSource:
            team_id = await resolve_team_source(match.teamTwoSource, match.sportId)
            if team_id and team_id != team_two_id:
                team_two_id = team_id
                updated = True

        if updated:
            await prisma.match.update(
                where={"id": match.id},
                data={
                    "teamOneId": team_one_id,
                    "teamTwoId": team_two_id,
                },
            )
            updated_count += 1

    return {"status": "ok", "updated_matches": updated_count}


async def resolve_team_source(source: str, sport_id: int) -> Optional[int]:
    # Si la source est None ou vide, retourner None
    if not source:
        return None
    
    if source.startswith("winner:"):
        match_id = int(source.split(":")[1])
        ref_match = await prisma.match.find_unique(where={"id": match_id})
        if not ref_match or ref_match.scoreTeamOne is None or ref_match.scoreTeamTwo is None:
            return None
        if ref_match.scoreTeamOne > ref_match.scoreTeamTwo:
            return ref_match.teamOneId
        if ref_match.scoreTeamTwo > ref_match.scoreTeamOne:
            return ref_match.teamTwoId
        return None  # Draw or not played

    if source.startswith("loser:"):
        match_id = int(source.split(":")[1])
        ref_match = await prisma.match.find_unique(where={"id": match_id})
        if not ref_match or ref_match.scoreTeamOne is None or ref_match.scoreTeamTwo is None:
            return None
        if ref_match.scoreTeamOne < ref_match.scoreTeamTwo:
            return ref_match.teamOneId
        if ref_match.scoreTeamTwo < ref_match.scoreTeamOne:
            return ref_match.teamTwoId
        return None  # Draw or not played

    if source.startswith("rank:"):
        _, rank, pool_id = source.split(":")
        team = await get_team_by_pool_rank(int(pool_id), int(rank))
        return team.id if team else None
    
    if source.startswith("best:"):
        from routes.pools import get_single_pool_ranking

        parts = source.split(":")
        rank = int(parts[1])
        nth = int(parts[2]) if len(parts) > 2 else 1

        pools = await prisma.pool.find_many(where={"sportId": sport_id})
        ranked_teams = []
        for pool in pools:
            ranking = await get_single_pool_ranking(pool.id)
            teams = ranking["teams"]
            if len(teams) >= rank:
                ranked_teams.append(teams[rank - 1])  

        if len(ranked_teams) >= nth:
            team_id = ranked_teams[nth - 1]["id"]
            team = await prisma.team.find_unique(where={"id": team_id})
            return team.id if team else None
        return None

    return None

async def get_team_by_pool_rank(pool_id: int, rank: int):
    # Use your pool ranking logic from pools.py
    from routes.pools import get_single_pool_ranking
    ranking = await get_single_pool_ranking(pool_id)
    if not ranking or not ranking["teams"]:
        return None
    teams = ranking["teams"]
    if 0 < rank <= len(teams):
        # rank is 1-based
        team_id = teams[rank - 1]["id"]
        team = await prisma.team.find_unique(where={"id": team_id})
        return team
    return None


@matches_router.post("/resolve-sources/{match_id}", dependencies=[Depends(check_admin)])
async def resolve_single_match_sources(match_id: int):
    match = await prisma.match.find_unique(where={"id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")

    updated = False
    team_one_id = match.teamOneId
    team_two_id = match.teamTwoId

    # Always resolve teamOneSource if present
    if match.teamOneSource:
        team_id = await resolve_team_source(match.teamOneSource, match.sportId)
        if team_id != team_one_id:
            team_one_id = team_id
            updated = True

    # Always resolve teamTwoSource if present
    if match.teamTwoSource:
        team_id = await resolve_team_source(match.teamTwoSource, match.sportId)
        if team_id != team_two_id:
            team_two_id = team_id
            updated = True

    if updated:
        await prisma.match.update(
            where={"id": match.id},
            data={
                "teamOneId": team_one_id,
                "teamTwoId": team_two_id,
            },
        )
        return {"status": "ok", "updated": True}
    else:
        return {"status": "ok", "updated": False, "message": "No sources to resolve or already up to date."}
    
    
    
@matches_router.post("/clear-resolved-sources/{match_id}", dependencies=[Depends(check_admin)])
async def clear_resolved_sources(match_id: int):
    """
    Efface les résolutions des matchs suivants qui dépendaient du résultat de ce match.
    Utilisé quand on modifie le résultat d'un match.
    """
    match = await prisma.match.find_unique(where={"id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")

    # Trouver tous les matchs dont la source dépend de ce match
    winner_source = f"winner:{match_id}"
    loser_source = f"loser:{match_id}"
    
    # Matchs qui attendent le gagnant de ce match
    matches_needing_winner = await prisma.match.find_many(
        where={
            "OR": [
                {"teamOneSource": winner_source},
                {"teamTwoSource": winner_source},
            ]
        }
    )
    
    # Matchs qui attendent le perdant de ce match
    matches_needing_loser = await prisma.match.find_many(
        where={
            "OR": [
                {"teamOneSource": loser_source},
                {"teamTwoSource": loser_source},
            ]
        }
    )
    
    cleared_count = 0
    
    # Effacer les teamId résolus pour les matchs qui attendent le gagnant
    for m in matches_needing_winner:
        update_data = {}
        if m.teamOneSource == winner_source and m.teamOneId is not None:
            update_data["teamOneId"] = None
        if m.teamTwoSource == winner_source and m.teamTwoId is not None:
            update_data["teamTwoId"] = None
        if update_data:
            await prisma.match.update(where={"id": m.id}, data=update_data)
            cleared_count += 1
    
    # Effacer les teamId résolus pour les matchs qui attendent le perdant
    for m in matches_needing_loser:
        update_data = {}
        if m.teamOneSource == loser_source and m.teamOneId is not None:
            update_data["teamOneId"] = None
        if m.teamTwoSource == loser_source and m.teamTwoId is not None:
            update_data["teamTwoId"] = None
        if update_data:
            await prisma.match.update(where={"id": m.id}, data=update_data)
            cleared_count += 1

    return {"status": "ok", "cleared_matches": cleared_count}

