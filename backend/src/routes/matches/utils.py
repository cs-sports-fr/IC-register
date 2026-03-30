import itertools
import random
import math
from datetime import timedelta
from datetime import datetime, timedelta
from typing import List, Optional
import itertools

def generate_round_robin_matches(teams):
    team_ids = [team.id for team in teams]
    
    # Check if the number of teams is 4
    if len(team_ids) == 4:
        # Assign specific match order for four teams
        matches = [
            {'team_one_id': team_ids[0], 'team_two_id': team_ids[1]},  # A vs B
            {'team_one_id': team_ids[2], 'team_two_id': team_ids[3]},  # C vs D
            {'team_one_id': team_ids[0], 'team_two_id': team_ids[2]},  # A vs C
            {'team_one_id': team_ids[1], 'team_two_id': team_ids[3]},  # B vs D
            {'team_one_id': team_ids[0], 'team_two_id': team_ids[3]},  # A vs D
            {'team_one_id': team_ids[1], 'team_two_id': team_ids[2]},  # B vs C
        ]
    else:
        # For other numbers of teams, generate all combinations
        matches = []
        for team_one_id, team_two_id in itertools.combinations(team_ids, 2):
            matches.append({
                'team_one_id': team_one_id,
                'team_two_id': team_two_id,
            })

    return matches


from datetime import timedelta

## pools c'est tous les matches dans un tableau de tableau avec chaque tableau representant une poule 
from datetime import timedelta
from datetime import datetime, timedelta


def schedule_matches(pools: List[List[dict]], number_of_fields: int, match_length: int, start_time: datetime) -> List[dict]:
    """
    Schedules matches for a given set of pools starting from start_time.

    Args:
        pools: List of lists, where each sublist contains matches for a pool.
        number_of_fields: Number of fields available per time slot.
        match_length: Duration of each match in minutes.
        start_time: The starting datetime for scheduling.

    Returns:
        A list of scheduled match dictionaries containing 'match', 'time_slot', 'field', and 'pool'.
    """
    scheduled_matches = []
    current_time = start_time
    total_pools = len(pools)
    pool_order = list(range(total_pools))

    def matches_left() -> bool:
        return any(pool for pool in pools)

    while matches_left():
        # Start a new scheduling cycle
        cycle_matches_played = {p: 0 for p in pool_order}  # Matches played per pool in this cycle

        while True:
            # Check if the cycle is complete
            if all(
                (cycle_matches_played[p] >= 2 or len(pools[p]) == 0)
                for p in pool_order
            ):
                break  # Cycle complete

            fields_available = number_of_fields
            can_play_this_timeslot = False

            # Attempt to schedule matches in the current time slot
            for p in pool_order:
                if pools[p] and cycle_matches_played[p] < 2:
                    can_play_this_timeslot = True
                    matches_to_schedule = min(2 - cycle_matches_played[p], len(pools[p]), fields_available)

                    for _ in range(matches_to_schedule):
                        match = pools[p].pop(0)
                        field_number = number_of_fields - fields_available + 1
                        scheduled_matches.append({
                            'match': match,
                            'time_slot': current_time,
                            'field': field_number,
                            'pool': p + 1
                        })
                        cycle_matches_played[p] += 1
                        fields_available -= 1
                        if fields_available == 0:
                            break  # No more fields available in this time slot

                if fields_available == 0:
                    break  # Move to the next time slot

            # If no matches were scheduled in this time slot, exit the loop
            if not can_play_this_timeslot:
                break

            # Move to the next time slot
            current_time += timedelta(minutes=match_length)

        # Cycle complete, continue if there are matches left
    # Sort the scheduled matches by time_slot and field
    scheduled_matches.sort(key=lambda x: (x['time_slot'], x['field']))
    return scheduled_matches


def get_phase_for_bracket_size(bracket_size: int) -> str:
    """Retourne la phase correspondant à la taille du bracket."""
    phase_map = {
        2: "Final",
        4: "SemiFinal",
        8: "QuarterFinal",
        16: "Roundof16",
        32: "Roundof32",
        64: "Roundof64",
    }
    return phase_map.get(bracket_size, "Roundof64")


def get_next_phase(phase: str) -> Optional[str]:
    """Retourne la phase suivante dans le bracket."""
    phase_order = [
        "Roundof64", "Roundof32", "Roundof16", 
        "QuarterFinal", "SemiFinal", "Final"
    ]
    if phase not in phase_order:
        return None
    idx = phase_order.index(phase)
    if idx + 1 < len(phase_order):
        return phase_order[idx + 1]
    return None


def generate_knockout_bracket(teams: List, category: str, seeded: bool = True) -> List[dict]:
    """
    Génère un bracket d'élimination directe pour une catégorie de poids.
    
    Args:
        teams: Liste des équipes (objets avec attribut id), DÉJÀ TRIÉES par seed
               (alternance 1er poule A, 1er poule B, 2ème poule A, 2ème poule B...)
        category: Nom de la catégorie (ex: "BoxeH_60kg")
        seeded: Si True, place les équipes pour que les meilleures ne se rencontrent qu'en finale
    
    Returns:
        Liste de matchs avec structure:
        {
            'phase': str,
            'team_one_id': int | None,
            'team_two_id': int | None,
            'team_one_source': str | None,  # ex: "W1" pour Winner of match 1
            'team_two_source': str | None,
            'match_number': int,  # Numéro unique dans le bracket
        }
    """
    n = len(teams)
    if n < 2:
        return []
    
    # Organiser les équipes selon le seeding standard
    # Pour 4 qualifiés (2 poules): [1A, 2B, 1B, 2A] → 1A vs 2A, 1B vs 2B en demies
    # Pour que 1A et 1B se rencontrent en finale
    if seeded and n >= 4:
        # Réorganiser pour le bracket: positions [0, n-1, 1, n-2, 2, n-3, ...]
        # Cela met les têtes de série aux extrémités opposées du bracket
        ordered_teams = []
        for i in range((n + 1) // 2):
            ordered_teams.append(teams[i])
            if n - 1 - i != i:
                ordered_teams.append(teams[n - 1 - i])
        teams = ordered_teams[:n]
    else:
        # Pour 2-3 qualifiés, garder l'ordre
        teams = list(teams)
    
    # Calculer la taille du bracket (puissance de 2 >= n)
    bracket_size = 1
    while bracket_size < n:
        bracket_size *= 2
    
    # Nombre de byes nécessaires
    num_byes = bracket_size - n
    
    matches = []
    match_number = 1
    
    # Phase initiale
    initial_phase = get_phase_for_bracket_size(bracket_size)
    
    # Générer le premier tour
    # Les équipes avec bye avancent directement au tour suivant
    first_round_winners = []  # Liste des sources pour le tour suivant
    team_idx = 0
    
    for i in range(bracket_size // 2):
        if i < num_byes:
            # Cette position a un bye - l'équipe passe directement
            first_round_winners.append({
                'type': 'team',
                'team_id': teams[team_idx].id
            })
            team_idx += 1
        else:
            # Match normal
            team1 = teams[team_idx]
            team_idx += 1
            team2 = teams[team_idx]
            team_idx += 1
            
            matches.append({
                'phase': initial_phase,
                'team_one_id': team1.id,
                'team_two_id': team2.id,
                'team_one_source': None,
                'team_two_source': None,
                'match_number': match_number,
                'category': category,
            })
            first_round_winners.append({
                'type': 'winner',
                'match_number': match_number
            })
            match_number += 1
    
    # Générer les tours suivants
    current_round = first_round_winners
    current_phase = get_next_phase(initial_phase) if num_byes > 0 or bracket_size > 2 else None
    
    # Si tous les matchs du premier tour ont été créés et qu'il y a plus d'un gagnant potentiel
    while len(current_round) > 1 and current_phase:
        next_round = []
        
        for i in range(0, len(current_round), 2):
            source1 = current_round[i]
            source2 = current_round[i + 1] if i + 1 < len(current_round) else None
            
            if source2 is None:
                # Impair - cette source avance directement
                next_round.append(source1)
                continue
            
            # Déterminer team_one_id/source
            if source1['type'] == 'team':
                team_one_id = source1['team_id']
                team_one_source = None
            else:
                team_one_id = None
                team_one_source = f"W{source1['match_number']}"
            
            # Déterminer team_two_id/source
            if source2['type'] == 'team':
                team_two_id = source2['team_id']
                team_two_source = None
            else:
                team_two_id = None
                team_two_source = f"W{source2['match_number']}"
            
            matches.append({
                'phase': current_phase,
                'team_one_id': team_one_id,
                'team_two_id': team_two_id,
                'team_one_source': team_one_source,
                'team_two_source': team_two_source,
                'match_number': match_number,
                'category': category,
            })
            next_round.append({
                'type': 'winner',
                'match_number': match_number
            })
            match_number += 1
        
        current_round = next_round
        current_phase = get_next_phase(current_phase)
    
    # Ajouter le match pour la 3ème place si on a des demi-finales
    semifinal_matches = [m for m in matches if m['phase'] == 'SemiFinal']
    if len(semifinal_matches) == 2:
        matches.append({
            'phase': 'ThirdPlace',
            'team_one_id': None,
            'team_two_id': None,
            'team_one_source': f"L{semifinal_matches[0]['match_number']}",  # Loser of semi 1
            'team_two_source': f"L{semifinal_matches[1]['match_number']}",  # Loser of semi 2
            'match_number': match_number,
            'category': category,
        })
    
    return matches
