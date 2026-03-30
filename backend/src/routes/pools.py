from typing import List
from fastapi import APIRouter, Depends, HTTPException
from prisma.models import Pool, Team
from prisma.types import (
    PoolCreateInput,
    PoolInclude,
    PoolWhereUniqueInput,
    FindManyTeamArgsFromPool,
    TeamIncludeFromTeamRecursive1,
)
from infra.prisma import getPrisma  # type: ignore
from routes.auth.utils import check_super_admin, check_token, check_admin  # type: ignore

pools_router = APIRouter(
    prefix="/pools",
    tags=["pools"],
    dependencies=[Depends(check_token)],
)
prisma = getPrisma()

"""
@pools_router.get("", response_model=List[Pool])
async def get_all_pools():
    pools = await prisma.pool.find_many()
    return pools
"""

@pools_router.get("/sport/{sport_id}", response_model=List[Pool], dependencies=[Depends(check_admin)])
async def get_pools_by_sport(sport_id: int):
    pools = await prisma.pool.find_many(
        where={"sportId": sport_id},
        include=PoolInclude(teams=True)
    )
    return pools


"""@pools_router.get(
    "/{pool_id}", response_model=Pool, dependencies=[Depends(check_admin)]
)
async def get_pool(pool_id: int):
    pool = await prisma.pool.find_unique(
        where=PoolWhereUniqueInput(id=pool_id),
        include=PoolInclude(
            teams=FindManyTeamArgsFromPool(
                include=TeamIncludeFromTeamRecursive1(participants=True, school=True)
            )
        ),
    )
    return pool
"""

@pools_router.post(
    "/create-pool",
    response_model=Pool,
    dependencies=[Depends(check_admin)],
)
async def create_pool(name: str, sport_id: int):
    new_pool = await prisma.pool.create(
        data=PoolCreateInput(
            name=name,
            sportId=sport_id,
        )
    )
    return new_pool

""""
@pools_router.post(
    "/assign-sequentially/{sport_id}",
    dependencies=[Depends(check_admin)],
)
async def assign_teams_to_pools_sequentially(sport_id: int):
    teams = await prisma.team.find_many(where={"sportId": sport_id})
    pools = await prisma.pool.find_many(where={"sportId": sport_id})

    if not pools:
        raise HTTPException(status_code=400, detail="No pools available for this sport")

    # Assign teams to pools in a round-robin manner
    pool_index = 0
    for team in teams:
        await prisma.team.update(
            where={"id": team.id},
            data={"pools": {"connect": {"id": pools[pool_index].id}}}
        )
        pool_index = (pool_index + 1) % len(pools)

    return {"message": "Teams assigned to pools sequentially"}

"""

@pools_router.post(
    "/update-team-pool/{team_id}/{new_pool_id}",
    dependencies=[Depends(check_admin)],
)
async def update_team_pool(team_id: int, new_pool_id: int):
    await prisma.team.update(
        where={"id": team_id},
        data={"pools": {"connect": {"id": new_pool_id}}}
    )
    return {"message": "Team moved to the new pool successfully"}


@pools_router.put(
    "/{pool_id}",
    response_model=Pool,
    dependencies=[Depends(check_super_admin)],
)
async def update_pool(pool_id: int, name: str, sport_id: int):
    updated_pool = await prisma.pool.update(
        where=PoolWhereUniqueInput(id=pool_id),
        data=PoolCreateInput(
            name=name,
            sportId=sport_id,
        )
    )
    return updated_pool


@pools_router.delete("/{pool_id}", dependencies=[Depends(check_admin)])
async def delete_pool(pool_id: int):
    await prisma.pool.delete(where=PoolWhereUniqueInput(id=pool_id))
    return {"message": "Pool deleted successfully"}



@pools_router.post("/remove-team-from-pool/{team_id}/{pool_id}")
async def remove_team_from_pool(team_id: int, pool_id: int):
    await prisma.team.update(
        where={"id": team_id},
        data={"pools": {"disconnect": {"id": pool_id}}}
    )
    return {"message": "Team removed from the pool successfully"}




@pools_router.get("/rankings/{sport_id}")
async def get_pool_rankings(sport_id: int):
    sport = await prisma.sport.find_unique(
        where={"id": sport_id},
    )
    if not sport or not sport.tiebreakerOrder:
        raise HTTPException(status_code=404, detail="Sport or tiebreaker order not found")

    tiebreaker_order = sport.tiebreakerOrder

    pools = await prisma.pool.find_many(
        where={"sportId": sport_id},
        include={
            "teams": {
                "include": {
                    "school": True,
                    "matchesTeamOne": {"include": {"teamTwo": True}},
                    "matchesTeamTwo": {"include": {"teamOne": True}},
                },
            },
        },
    )
    if not pools:
        raise HTTPException(status_code=404, detail="No pools found for this sport")

    def head_to_head_points(team_a, team_b):
        head_to_head_matches = [
            match for match in team_a.matchesTeamOne if match.teamTwoId == team_b.id
        ] + [
            match for match in team_b.matchesTeamOne if match.teamTwoId == team_a.id
        ]
        points_a, points_b = 0, 0
        for match in head_to_head_matches:
            if match.scoreTeamOne is not None and match.scoreTeamTwo is not None:
                if match.scoreTeamOne > match.scoreTeamTwo:
                    if match.teamOneId == team_a.id:
                        points_a += 3
                    else:
                        points_b += 3
                elif match.scoreTeamTwo > match.scoreTeamOne:
                    if match.teamTwoId == team_a.id:
                        points_a += 3
                    else:
                        points_b += 3
                else:
                    points_a += 1
                    points_b += 1
        return points_a, points_b

    def get_sort_key(team, teams):
        key = []
        for criterion in tiebreaker_order:
            if criterion == "HeadToHead":
                # Sum of head-to-head points against all other teams
                key.append([
                    head_to_head_points(team, other)[0]
                    for other in teams if other.id != team.id
                ])
            elif criterion == "GoalsConceded":
                key.append(-team.goalsConceded)  # Lower is better
            elif criterion == "FairPlay":
                key.append(getattr(team, "fairPlayPoints", 0))  # Lower is better, adjust as needed
            elif criterion == "TournamentPoints":
                key.append(team.tournamentPoints)
            elif criterion == "GoalsScored":
                key.append(team.goalsScored)
            elif criterion == "GoalDifference":
                key.append(team.goalsScored - team.goalsConceded)
            elif criterion == "MatchesWon":
                key.append(team.poolmatcheswon)
            else:
                key.append(0)  # Default/fallback
        return tuple(key)

    rankings = []
    for pool in pools:
        teams = pool.teams
        for team in teams:
            team.goalDifference = team.goalsScored - team.goalsConceded

        sorted_teams = sorted(
            teams,
            key=lambda t: get_sort_key(t, teams),
            reverse=True,
        )

        pool_data = {
            "pool_name": pool.name,
            "teams": [
                {
                    "id": team.id,
                    "team_name": team.name,
                    "school_name": team.school.name,
                    "tournamentPoints": team.tournamentPoints,
                    "goalDifference": team.goalDifference,
                    "goalsScored": team.goalsScored,
                    "goalsConceded": team.goalsConceded,
                    "poolmatcheswon": team.poolmatcheswon,
                    "poolmatcheslost": team.poolmatcheslost,
                    "poolmatchesdraw": team.poolmatchesdraw,
                }
                for team in sorted_teams
            ],
        }
        rankings.append(pool_data)
    rankings.sort(key=lambda x: x["pool_name"])
    return rankings




@pools_router.get("/ranking/{pool_id}")
async def get_single_pool_ranking(pool_id: int):
    pool = await prisma.pool.find_unique(
        where={"id": pool_id},
        include={
            "teams": {
                "include": {
                    "school": True,
                    "matchesTeamOne": {"include": {"teamTwo": True}},
                    "matchesTeamTwo": {"include": {"teamOne": True}},
                },
            },
            "sport": True,  # Needed to get tiebreakerOrder
        },
    )
    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")
    
    # Utiliser tiebreakerOrder du sport ou valeur par défaut pour les sports de combat
    if pool.sport and pool.sport.tiebreakerOrder:
        tiebreaker_order = pool.sport.tiebreakerOrder
    else:
        # Ordre par défaut: Points > Victoires > Head-to-head > Différence de buts
        tiebreaker_order = ["TournamentPoints", "MatchesWon", "HeadToHead", "GoalDifference"]
    teams = pool.teams
    for team in teams:
        team.goalDifference = team.goalsScored - team.goalsConceded

    def head_to_head_points(team_a, team_b):
        """Calcule les points de team_a contre team_b en confrontation directe."""
        head_to_head_matches = [
            match for match in team_a.matchesTeamOne if match.teamTwoId == team_b.id
        ] + [
            match for match in team_b.matchesTeamOne if match.teamTwoId == team_a.id
        ]
        points_a, points_b = 0, 0
        for match in head_to_head_matches:
            if match.scoreTeamOne is not None and match.scoreTeamTwo is not None:
                if match.scoreTeamOne > match.scoreTeamTwo:
                    if match.teamOneId == team_a.id:
                        points_a += 3
                    else:
                        points_b += 3
                elif match.scoreTeamTwo > match.scoreTeamOne:
                    if match.teamTwoId == team_a.id:
                        points_a += 3
                    else:
                        points_b += 3
                else:
                    points_a += 1
                    points_b += 1
        return points_a, points_b

    def get_head_to_head_total(team, tied_teams):
        """
        Calcule le total des points head-to-head d'une équipe 
        contre TOUTES les équipes à égalité avec elle (mini-championnat).
        """
        total_points = 0
        for other in tied_teams:
            if other.id != team.id:
                points, _ = head_to_head_points(team, other)
                total_points += points
        return total_points

    def get_sort_key(team, teams):
        key = []
        for criterion in tiebreaker_order:
            if criterion == "HeadToHead":
                # Trouver les équipes à égalité de points avec cette équipe
                tied_teams = [t for t in teams if t.tournamentPoints == team.tournamentPoints]
                # Calculer le total des points dans les confrontations directes
                key.append(get_head_to_head_total(team, tied_teams))
            elif criterion == "GoalsConceded":
                key.append(-team.goalsConceded)
            elif criterion == "FairPlay":
                key.append(getattr(team, "fairPlayPoints", 0))
            elif criterion == "TournamentPoints":
                key.append(team.tournamentPoints)
            elif criterion == "GoalsScored":
                key.append(team.goalsScored)
            elif criterion == "GoalDifference":
                key.append(team.goalsScored - team.goalsConceded)
            elif criterion == "MatchesWon":
                key.append(team.poolmatcheswon)
            else:
                key.append(0)
        return tuple(key)

    sorted_teams = sorted(
        teams,
        key=lambda t: get_sort_key(t, teams),
        reverse=True,
    )

    pool_data = {
        "pool_name": pool.name,
        "teams": [
            {
                "id": team.id,
                "team_name": team.name,
                "school_name": team.school.name,
                "tournamentPoints": team.tournamentPoints,
                "goalDifference": team.goalDifference,
                "goalsScored": team.goalsScored,
                "goalsConceded": team.goalsConceded,
                "poolmatcheswon": team.poolmatcheswon,
                "poolmatcheslost": team.poolmatcheslost,
                "poolmatchesdraw": team.poolmatchesdraw,
            }
            for team in sorted_teams
        ],
    }
    return pool_data


@pools_router.put("/rename/{pool_id}", dependencies=[Depends(check_admin)])
async def rename_pool(pool_id: int, new_name: str):
    pool = await prisma.pool.find_unique(where={"id": pool_id})
    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")
    updated_pool = await prisma.pool.update(
        where={"id": pool_id},
        data={"name": new_name}
    )
    return updated_pool
