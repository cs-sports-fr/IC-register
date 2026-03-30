from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel
from collections import defaultdict

from infra.prisma import getPrisma
from routes.auth.utils import check_admin

tent_assignment_router = APIRouter(
    prefix="/tent-assignment",
    tags=["tent-assignment"],
    dependencies=[Depends(check_admin)],
)

prisma = getPrisma()

# ============================================================================
# MODÈLES PYDANTIC
# ============================================================================

class TentPlan(BaseModel):
    row: str
    section: str
    tent_number: int
    capacity: int
    gender: str
    occupation: Optional[int] = 0
    is_available: Optional[bool] = True


class TeamTentAssignment(BaseModel):
    team_id: int
    team_name: str
    school_name: str
    participants: List[Dict[str, Any]]
    assigned_tents: List[Dict[str, Any]]


class GlobalTentAssignmentRequest(BaseModel):
    # ⚠️ Ton inventaire réel
    total_tents_1p: int = 5
    total_tents_2p: int = 244
    total_tents_3p: int = 633

    # si tu veux forcer une répartition H/F précise tu peux passer ces valeurs
    male_tents_1p: Optional[int] = None
    male_tents_2p: Optional[int] = None
    male_tents_3p: Optional[int] = None
    female_tents_1p: Optional[int] = None
    female_tents_2p: Optional[int] = None
    female_tents_3p: Optional[int] = None

    preview: Optional[bool] = False  # Si true, ne sauvegarde pas en BDD


class GlobalTentAssignmentResponse(BaseModel):
    assignments: List[TeamTentAssignment]
    unassigned_participants: List[Dict[str, Any]]
    total_tents_used: int
    total_capacity_used: int
    tent_plan: List[TentPlan]
    missing_tents: Dict[str, int]


# ============================================================================
# RÉCUPÉRATION DES DONNÉES
# ============================================================================

async def get_all_teams_with_participants() -> List[Dict[str, Any]]:
    """Récupère toutes les équipes avec leurs participants tente"""
    teams = await prisma.team.find_many(
        where={"status": {"in": ["Validated", "PrincipalList"]}},
        include={
            "school": True,
            "sport": True,
            "participants": {
                "where": {"pack": {"name": "Hébergement en tente"}},
                "include": {"pack": True},
            },
        },
    )

    result = []
    for team in teams:
        if not team.participants:
            continue

        male_participants = []
        female_participants = []

        for p in team.participants:
            participant_data = {
                "id": p.id,
                "firstname": p.firstname,
                "lastname": p.lastname,
                "gender": p.gender,
                "team_id": team.id,
                "team_name": team.name,
                "sport_name": team.sport.sport if team.sport else "Autre",
                "school_name": team.school.name,
            }

            if p.gender == "M":
                male_participants.append(participant_data)
            elif p.gender == "F":
                female_participants.append(participant_data)

        if male_participants:
            result.append(
                {
                    "team_id": team.id,
                    "team_name": f"{team.name} (H)",
                    "school_name": team.school.name,
                    "sport_name": team.sport.sport if team.sport else "Autre",
                    "gender": "M",
                    "participants": male_participants,
                }
            )

        if female_participants:
            result.append(
                {
                    "team_id": team.id,
                    "team_name": f"{team.name} (F)",
                    "school_name": team.school.name,
                    "sport_name": team.sport.sport if team.sport else "Autre",
                    "gender": "F",
                    "participants": female_participants,
                }
            )

    return result


# ============================================================================
# STRATÉGIES DE RÉPARTITION (3P/2P/1P)
# ============================================================================

def calculate_team_distribution_leave_lonely(n: int) -> Tuple[int, int, int]:
    """
    Phase 1 (par équipe) :
    - favorise les 3P
    - si reste 1 => on laisse 1 personne seule volontairement (au lieu de 2×2P)
    - exception demandée: 4 => 2×2P
    Returns (nb_3p, nb_2p, lonely_count)
    """
    if n <= 0:
        return 0, 0, 0
    if n == 1:
        return 0, 0, 1
    if n == 2:
        return 0, 1, 0
    if n == 3:
        return 1, 0, 0
    if n == 4:
        return 0, 2, 0
    if n == 5:
        return 1, 1, 0

    t3 = n // 3
    r = n % 3
    if r == 0:
        return t3, 0, 0
    if r == 2:
        return t3, 1, 0
    # r == 1 => on laisse 1 seul
    return t3, 0, 1


def calculate_distribution_pack(n: int) -> Tuple[int, int, int]:
    """
    Phase 2 (par école, regroupement) :
    - pack au max
    - si reste 1 => on convertit 1×3P -> 2×2P si possible pour éviter un seul
    Returns (nb_3p, nb_2p, lonely_count)
    """
    if n <= 0:
        return 0, 0, 0
    if n == 1:
        return 0, 0, 1
    if n == 2:
        return 0, 1, 0
    if n == 3:
        return 1, 0, 0
    if n == 4:
        return 0, 2, 0
    if n == 5:
        return 1, 1, 0

    t3 = n // 3
    r = n % 3
    if r == 0:
        return t3, 0, 0
    if r == 2:
        return t3, 1, 0

    # r == 1
    if t3 > 0:
        return t3 - 1, 2, 0
    return 0, 0, 1


# ============================================================================
# GÉNÉRATION DU PLAN DE TENTES
# ============================================================================

def generate_tent_plan(num_1p: int, num_2p: int, num_3p: int, gender: str) -> List[TentPlan]:
    tents: List[TentPlan] = []
    tent_counter = 1

    rows = ["A", "B", "C", "D", "E", "F", "G"] if gender == "M" else ["A", "B", "C", "D", "E"]

    max_per_section = 60
    current_row_idx = 0
    current_section_start = 1

    # IMPORTANT : On crée d'abord les 3P puis 2P puis 1P, pour faciliter le "favoriser 3P"
    for capacity in [3, 2, 1]:
        num_tents = num_3p if capacity == 3 else (num_2p if capacity == 2 else num_1p)

        for _ in range(num_tents):
            if tent_counter > current_section_start + max_per_section - 1:
                current_row_idx += 1
                if current_row_idx >= len(rows):
                    current_row_idx = 0
                current_section_start += max_per_section
                tent_counter = current_section_start

            section = f"{current_section_start}-{current_section_start + max_per_section - 1}"
            tents.append(
                TentPlan(
                    row=rows[current_row_idx],
                    section=section,
                    tent_number=tent_counter,
                    capacity=capacity,
                    gender=gender,
                    occupation=0,
                    is_available=True,
                )
            )
            tent_counter += 1

    return tents


# ============================================================================
# DISTRIBUTION DES TENTES ENTRE H/F (MINIMISE LES 1P)
# ============================================================================

def distribute_tents_by_gender_minimize_1p(
    total_1p: int, total_2p: int, total_3p: int,
    male_count: int, female_count: int
) -> Tuple[int, int, int, int, int, int]:
    """
    Objectif:
    - couvrir H/F avec 3P puis 2P
    - n'utiliser les 1P que si vraiment nécessaire (et il n'y en a que 5)
    """
    print("\n📊 Distribution (minimise 1P):")
    print(f"  Total: {total_3p}×3P + {total_2p}×2P + {total_1p}×1P")
    print(f"  Participants: {male_count} H + {female_count} F")

    # Partage des 3P proportionnel au besoin
    total_participants = max(1, male_count + female_count)
    male_share_3p = round(total_3p * (male_count / total_participants))
    male_3p = min(total_3p, male_share_3p)
    female_3p = total_3p - male_3p

    # Puis on ajuste légèrement si une side est très courte en capacité
    def capacity(ones, twos, threes): return ones + 2 * twos + 3 * threes

    male_2p = 0
    female_2p = 0
    male_1p = 0
    female_1p = 0

    remaining_2p = total_2p
    remaining_1p = total_1p

    # Remplir les besoins avec 2P (pas de 1P tant qu'on a des 2P)
    male_short = max(0, male_count - capacity(0, 0, male_3p))
    female_short = max(0, female_count - capacity(0, 0, female_3p))

    # Assigner des 2P d'abord aux côtés qui manquent le plus
    for _ in range(total_2p):
        if male_short <= 0 and female_short <= 0:
            break
        if male_short >= female_short and male_short > 0:
            male_2p += 1
            male_short = max(0, male_short - 2)
        elif female_short > 0:
            female_2p += 1
            female_short = max(0, female_short - 2)
        remaining_2p -= 1

    # Si il reste un manque, on tente d'ajouter des 3P à partir de l'autre côté si possible
    # (rare mais utile si la répartition proportionnelle n'est pas optimale)
    def rebalance_threes():
        nonlocal male_3p, female_3p, male_short, female_short
        changed = True
        while changed:
            changed = False
            if male_short > 0 and female_3p > 0:
                female_3p -= 1
                male_3p += 1
                male_short = max(0, male_short - 3)
                female_short = max(0, female_count - capacity(0, female_2p, female_3p))
                changed = True
            elif female_short > 0 and male_3p > 0:
                male_3p -= 1
                female_3p += 1
                female_short = max(0, female_short - 3)
                male_short = max(0, male_count - capacity(0, male_2p, male_3p))
                changed = True

    rebalance_threes()

    # Enfin, 1P uniquement si toujours shortage (et stock dispo)
    # C'est là que tu minimises drastiquement l'usage des 1P.
    while remaining_1p > 0 and (male_short > 0 or female_short > 0):
        if male_short >= female_short and male_short > 0:
            male_1p += 1
            male_short -= 1
        elif female_short > 0:
            female_1p += 1
            female_short -= 1
        remaining_1p -= 1

    print(f"  Hommes: {male_3p}×3P + {male_2p}×2P + {male_1p}×1P")
    print(f"  Femmes: {female_3p}×3P + {female_2p}×2P + {female_1p}×1P\n")

    return male_1p, male_2p, male_3p, female_1p, female_2p, female_3p


# ============================================================================
# OUTILS POUR CONSOMMER DES TENTES DISPONIBLES (3P puis 2P puis 1P)
# ============================================================================

def _available_tents(tents: List[TentPlan], capacity: int, gender: str) -> List[TentPlan]:
    return [t for t in tents if t.is_available and t.capacity == capacity and t.gender == gender]


def _take_tent(tents: List[TentPlan], capacity: int, gender: str) -> Optional[TentPlan]:
    av = _available_tents(tents, capacity, gender)
    if not av:
        return None
    tent = av[0]
    tent.is_available = False
    return tent


# ============================================================================
# ASSIGNATION PAR ÉQUIPE (PHASE 1)
# ============================================================================

def assign_team_to_tents(team: Dict[str, Any], tents: List[TentPlan]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    participants = team["participants"]
    n = len(participants)
    gender = team["gender"]

    print(f"  📋 {team['team_name']}: {n} participants")
    num_3p, num_2p, lonely_count = calculate_team_distribution_leave_lonely(n)

    if lonely_count > 0:
        print(f"    ℹ️  Distribution (équipe): {num_3p}×3P + {num_2p}×2P + {lonely_count} seul(s) (à regrouper)")
    else:
        print(f"    ℹ️  Distribution (équipe): {num_3p}×3P + {num_2p}×2P")

    assigned_tents: List[Dict[str, Any]] = []
    idx = 0

    # 3P
    for _ in range(num_3p):
        tent = _take_tent(tents, 3, gender)
        if not tent:
            print("    ⚠️  Plus de tentes 3P (équipe)")
            break
        to_assign = participants[idx: idx + 3]
        idx += len(to_assign)
        tent.occupation = len(to_assign)
        assigned_tents.append({
            "row": tent.row,
            "section": tent.section,
            "tent_number": tent.tent_number,
            "capacity": tent.capacity,
            "gender": tent.gender,
            "participants": to_assign
        })
        print(f"    ✅ Tente {tent.row}{tent.tent_number} (3P): {len(to_assign)} assignés")

    # 2P
    for _ in range(num_2p):
        tent = _take_tent(tents, 2, gender)
        if not tent:
            print("    ⚠️  Plus de tentes 2P (équipe)")
            break
        to_assign = participants[idx: idx + 2]
        idx += len(to_assign)
        tent.occupation = len(to_assign)
        assigned_tents.append({
            "row": tent.row,
            "section": tent.section,
            "tent_number": tent.tent_number,
            "capacity": tent.capacity,
            "gender": tent.gender,
            "participants": to_assign
        })
        print(f"    ✅ Tente {tent.row}{tent.tent_number} (2P): {len(to_assign)} assignés")

    # Tout le reste part en "lonely" (soit volontaire, soit faute de tentes)
    lonely_participants = []
    if idx < n:
        lonely_participants = participants[idx:]
        print(f"    👤 {len(lonely_participants)} personne(s) restantes (pool regroupement école)")

    return assigned_tents, lonely_participants


# ============================================================================
# REGROUPEMENT PAR ÉCOLE (PHASE 2, PACK AU MAX, 1P EN DERNIER RECOURS)
# ============================================================================

def group_lonely_by_school(
    lonely_participants: List[Dict[str, Any]],
    tents_all: List[TentPlan]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    print(f"\n🔗 Regroupement des personnes seules ({len(lonely_participants)})")

    by_school_gender = defaultdict(list)
    for p in lonely_participants:
        by_school_gender[(p["school_name"], p["gender"])].append(p)

    # Petite optimisation: traiter d'abord les plus gros groupes
    groups_sorted = sorted(by_school_gender.items(), key=lambda kv: len(kv[1]), reverse=True)

    assigned_tents: List[Dict[str, Any]] = []
    unassigned: List[Dict[str, Any]] = []

    for (school_name, gender), participants in groups_sorted:
        print(f"  🏫 {school_name} ({gender}): {len(participants)}")

        num_3p, num_2p, lonely_count = calculate_distribution_pack(len(participants))
        idx = 0

        # 3P
        for _ in range(num_3p):
            tent = _take_tent(tents_all, 3, gender)
            if not tent:
                break
            to_assign = participants[idx: idx + 3]
            idx += len(to_assign)
            tent.occupation = len(to_assign)
            assigned_tents.append({
                "row": tent.row,
                "section": tent.section,
                "tent_number": tent.tent_number,
                "capacity": tent.capacity,
                "gender": tent.gender,
                "participants": to_assign
            })
            print(f"    ✅ Tente {tent.row}{tent.tent_number} (3P): {len(to_assign)} assignés")

        # 2P
        for _ in range(num_2p):
            tent = _take_tent(tents_all, 2, gender)
            if not tent:
                break
            to_assign = participants[idx: idx + 2]
            idx += len(to_assign)
            tent.occupation = len(to_assign)
            assigned_tents.append({
                "row": tent.row,
                "section": tent.section,
                "tent_number": tent.tent_number,
                "capacity": tent.capacity,
                "gender": tent.gender,
                "participants": to_assign
            })
            print(f"    ✅ Tente {tent.row}{tent.tent_number} (2P): {len(to_assign)} assignés")

        # 1P seulement si on a encore des gens et qu'il existe des 1P (très rare)
        while idx < len(participants):
            tent = _take_tent(tents_all, 1, gender)
            if not tent:
                break
            to_assign = participants[idx: idx + 1]
            idx += 1
            tent.occupation = 1
            assigned_tents.append({
                "row": tent.row,
                "section": tent.section,
                "tent_number": tent.tent_number,
                "capacity": tent.capacity,
                "gender": tent.gender,
                "participants": to_assign
            })
            print(f"    ✅ Tente {tent.row}{tent.tent_number} (1P): 1 assigné")

        # Si reste encore du monde => non assignés
        if idx < len(participants):
            remaining = participants[idx:]
            unassigned.extend(remaining)
            print(f"    ⚠️  {len(remaining)} non assigné(s)")

    return assigned_tents, unassigned


# ============================================================================
# ASSIGNATION GLOBALE
# ============================================================================

def assign_global(
    teams: List[Dict[str, Any]],
    male_tents: List[TentPlan],
    female_tents: List[TentPlan],
) -> GlobalTentAssignmentResponse:
    print(f"\n{'='*60}")
    print("🚀 ASSIGNATION GLOBALE")
    print(f"{'='*60}\n")

    all_assignments: List[TeamTentAssignment] = []
    all_lonely: List[Dict[str, Any]] = []

    male_teams = [t for t in teams if t["gender"] == "M"]
    female_teams = [t for t in teams if t["gender"] == "F"]

    print(f"👨 ÉQUIPES HOMMES ({len(male_teams)})")
    print("=" * 60)
    for team in male_teams:
        assigned_tents, lonely = assign_team_to_tents(team, male_tents)
        if assigned_tents:
            all_assignments.append(
                TeamTentAssignment(
                    team_id=team["team_id"],
                    team_name=team["team_name"],
                    school_name=team["school_name"],
                    participants=team["participants"],
                    assigned_tents=assigned_tents,
                )
            )
        all_lonely.extend(lonely)

    print(f"\n👩 ÉQUIPES FEMMES ({len(female_teams)})")
    print("=" * 60)
    for team in female_teams:
        assigned_tents, lonely = assign_team_to_tents(team, female_tents)
        if assigned_tents:
            all_assignments.append(
                TeamTentAssignment(
                    team_id=team["team_id"],
                    team_name=team["team_name"],
                    school_name=team["school_name"],
                    participants=team["participants"],
                    assigned_tents=assigned_tents,
                )
            )
        all_lonely.extend(lonely)

    # Regroupement école
    unassigned: List[Dict[str, Any]] = []
    if all_lonely:
        lonely_tents, unassigned = group_lonely_by_school(all_lonely, male_tents + female_tents)

        if lonely_tents:
            # regrouper par école dans la réponse
            schools = set()
            for tent in lonely_tents:
                if tent.get("participants"):
                    schools.add(tent["participants"][0]["school_name"])

            for school_name in schools:
                school_tents = [
                    t for t in lonely_tents
                    if t.get("participants") and t["participants"][0]["school_name"] == school_name
                ]
                school_participants = [p for t in school_tents for p in t.get("participants", [])]
                if school_tents and school_participants:
                    all_assignments.append(
                        TeamTentAssignment(
                            team_id=school_participants[0]["team_id"],
                            team_name=f"{school_name} - Regroupement",
                            school_name=school_name,
                            participants=school_participants,
                            assigned_tents=school_tents,
                        )
                    )

    # Stats
    total_tents_used = sum(len(a.assigned_tents) for a in all_assignments)
    total_capacity_used = sum(len(a.participants) for a in all_assignments)

    male_unassigned = len([p for p in unassigned if p["gender"] == "M"])
    female_unassigned = len([p for p in unassigned if p["gender"] == "F"])

    print(f"\n{'='*60}")
    print("📊 RÉSULTATS")
    print(f"{'='*60}")
    print(f"✅ Assignés: {total_capacity_used}")
    print(f"⚠️  Non assignés: {len(unassigned)} ({male_unassigned} H, {female_unassigned} F)")
    print(f"🏕️  Tentes utilisées: {total_tents_used}")
    print(f"{'='*60}\n")

    # "missing_tents" : on préfère indiquer en équivalent 2P (plus réaliste que 1P)
    return GlobalTentAssignmentResponse(
        assignments=all_assignments,
        unassigned_participants=unassigned,
        total_tents_used=total_tents_used,
        total_capacity_used=total_capacity_used,
        tent_plan=male_tents + female_tents,
        missing_tents={
            "male_2p_equivalent": (male_unassigned + 1) // 2,
            "female_2p_equivalent": (female_unassigned + 1) // 2,
            "total_unassigned": len(unassigned),
        },
    )


# ============================================================================
# SAUVEGARDE
# ============================================================================

async def save_tent_plan(tent_plan: List[TentPlan]):
    print(f"💾 Sauvegarde de {len(tent_plan)} tentes...")

    await prisma.tentplan.delete_many(where={"is_custom": True})

    batch_size = 50
    for i in range(0, len(tent_plan), batch_size):
        batch = tent_plan[i : i + batch_size]
        for tent in batch:
            await prisma.tentplan.create(
                data={
                    "row": tent.row,
                    "section": tent.section,
                    "tent_number": tent.tent_number,
                    "capacity": tent.capacity,
                    "gender": tent.gender,
                    "occupation": tent.occupation or 0,
                    "is_custom": True,
                }
            )
        print(f"  📦 Batch {i // batch_size + 1}: {len(batch)} tentes créées")

    print(f"✅ {len(tent_plan)} tentes sauvegardées")


async def apply_assignments(assignments: List[TeamTentAssignment]):
    print("💾 Application des assignations...")

    all_db_tents = await prisma.tentplan.find_many(where={"is_custom": True})
    tent_index = {(t.row, t.tent_number): t.id for t in all_db_tents}

    total_participants = 0

    for assignment in assignments:
        for tent in assignment.assigned_tents:
            key = (tent["row"], tent["tent_number"])
            if key not in tent_index:
                continue

            tent_id = tent_index[key]
            participants = tent.get("participants", [])

            await prisma.tentplan.update(
                where={"id": tent_id},
                data={"occupation": len(participants)},
            )

            for p in participants:
                await prisma.participant.update(
                    where={"id": p["id"]},
                    data={"tentPlanId": tent_id},
                )
                total_participants += 1

    print(f"✅ {total_participants} participants assignés")


# ============================================================================
# ROUTES
# ============================================================================

@tent_assignment_router.get("/participants-count")
async def get_participants_count():
    """
    Retourne le nombre de participants à placer (ceux avec pack "Hébergement en tente").
    """
    teams = await prisma.team.find_many(
        where={"status": {"in": ["Validated", "PrincipalList"]}},
        include={
            "school": True,
            "participants": {
                "where": {"pack": {"name": "Hébergement en tente"}},
            },
        },
    )
    
    male_count = 0
    female_count = 0
    schools = set()
    
    for team in teams:
        if team.participants:
            schools.add(team.school.id)
            for p in team.participants:
                if p.gender == "M":
                    male_count += 1
                elif p.gender == "F":
                    female_count += 1
    
    return {
        "total": male_count + female_count,
        "male": male_count,
        "female": female_count,
        "schools_count": len(schools)
    }


@tent_assignment_router.post("/global-assign", response_model=GlobalTentAssignmentResponse)
async def global_assign_tents(request: GlobalTentAssignmentRequest):
    try:
        print(f"\n{'='*60}")
        print("🚀 DÉMARRAGE")
        print(f"{'='*60}")

        teams = await get_all_teams_with_participants()
        if not teams:
            raise HTTPException(status_code=404, detail="Aucune équipe")

        male_count = sum(len(t["participants"]) for t in teams if t["gender"] == "M")
        female_count = sum(len(t["participants"]) for t in teams if t["gender"] == "F")
        print(f"📊 {len(teams)} équipes, {male_count} H + {female_count} F")

        # Si la répartition H/F est fournie explicitement => on la prend
        if request.male_tents_1p is not None:
            male_1p = request.male_tents_1p or 0
            male_2p = request.male_tents_2p or 0
            male_3p = request.male_tents_3p or 0
            female_1p = request.female_tents_1p or 0
            female_2p = request.female_tents_2p or 0
            female_3p = request.female_tents_3p or 0
        else:
            # Répartition auto en minimisant 1P
            male_1p, male_2p, male_3p, female_1p, female_2p, female_3p = distribute_tents_by_gender_minimize_1p(
                request.total_tents_1p or 0,
                request.total_tents_2p or 0,
                request.total_tents_3p or 0,
                male_count,
                female_count,
            )

        male_tents = generate_tent_plan(male_1p, male_2p, male_3p, "M")
        female_tents = generate_tent_plan(female_1p, female_2p, female_3p, "F")
        print(f"🏕️  {len(male_tents)} H + {len(female_tents)} F")

        result = assign_global(teams, male_tents, female_tents)

        if not request.preview:
            await save_tent_plan(result.tent_plan)
            await apply_assignments(result.assignments)
            print("✅ Terminé et sauvegardé\n")
        else:
            print("✅ Preview terminé (non sauvegardé)\n")

        return result

    except Exception as e:
        print(f"💥 Erreur: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@tent_assignment_router.post("/apply-assignments")
async def apply_assignments_route(assignments: List[Dict[str, Any]]):
    """
    Applique les assignations de tentes à la base de données.
    Appelé après avoir généré un plan avec preview=true.
    """
    try:
        # D'abord sauvegarder le tent plan s'il n'existe pas déjà
        all_db_tents = await prisma.tentplan.find_many(where={"is_custom": True})
        tent_index = {(t.row, t.tent_number): t.id for t in all_db_tents}
        
        total_participants = 0
        
        for assignment in assignments:
            assigned_tents = assignment.get("assigned_tents", [])
            
            for tent in assigned_tents:
                row = tent.get("row")
                tent_number = tent.get("tent_number")
                key = (row, tent_number)
                
                # Si la tente n'existe pas encore, la créer
                if key not in tent_index:
                    new_tent = await prisma.tentplan.create(
                        data={
                            "row": row,
                            "section": tent.get("section", ""),
                            "tent_number": tent_number,
                            "capacity": tent.get("capacity", 3),
                            "gender": tent.get("gender", "M"),
                            "occupation": 0,
                            "is_custom": True,
                        }
                    )
                    tent_index[key] = new_tent.id
                
                tent_id = tent_index[key]
                participants = tent.get("participants", [])
                
                # Mettre à jour l'occupation
                await prisma.tentplan.update(
                    where={"id": tent_id},
                    data={"occupation": len(participants)},
                )
                
                # Assigner les participants
                for p in participants:
                    await prisma.participant.update(
                        where={"id": p["id"]},
                        data={"tentPlanId": tent_id},
                    )
                    total_participants += 1
        
        return {"updated_participants": total_participants}
    
    except Exception as e:
        print(f"💥 Erreur apply-assignments: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@tent_assignment_router.post("/tent-plan/reset-occupation")
async def reset_tent_occupation():
    try:
        await prisma.execute_raw('UPDATE "TentPlan" SET "occupation" = 0 WHERE "is_custom" = true')
        await prisma.execute_raw('UPDATE "Participant" SET "tentPlanId" = NULL WHERE "tentPlanId" IS NOT NULL')
        return {"message": "Réinitialisé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@tent_assignment_router.get("/tent-plan")
async def get_tent_plan():
    try:
        tents = await prisma.tentplan.find_many(
            where={"is_custom": True},
            include={"participants": True},
        )

        return {
            "tents": [
                {
                    "id": t.id,
                    "row": t.row,
                    "section": t.section,
                    "tent_number": t.tent_number,
                    "capacity": t.capacity,
                    "gender": t.gender,
                    "occupation": t.occupation,
                    "is_available": t.occupation < t.capacity,
                    "participants": [
                        {"id": p.id, "firstname": p.firstname, "lastname": p.lastname, "gender": p.gender}
                        for p in (t.participants or [])
                    ],
                }
                for t in tents
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")