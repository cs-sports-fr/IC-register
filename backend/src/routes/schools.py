from typing import List
from fastapi import APIRouter, Depends, HTTPException
from prisma.models import School
from typing import Dict, List, Annotated, Any 
from math import radians, sin, cos, sqrt, atan2
from routes.auth.utils import check_user
from prisma.models import User
from prisma.types import (
    SchoolWhereInput,
    SchoolCreateInput,
    SchoolWhereUniqueInput,
    SchoolInclude,
    TeamSumAggregateInput,
    TeamWhereInput,
    TeamUpdateInput,
    TeamWhereUniqueInput,
)

from infra.prisma import getPrisma  # type: ignore
from routes.auth.utils import check_super_admin  # type: ignore


schools_router = APIRouter(
    prefix="/schools", tags=["schools"], dependencies=[])
prisma = getPrisma()


@schools_router.get("", response_model=List[School], dependencies=[])
async def get_all_schools():
    schools = await prisma.school.find_many()
    ordered_schools = sorted(
        schools, key=lambda x: (x.isInIDF, x.name)
    )
    return ordered_schools


@schools_router.post(
    "/", response_model=School, dependencies=[Depends(check_super_admin)]
)
async def create_school(name: str, is_in_idf: bool):
    school = await prisma.school.create(
        data=SchoolCreateInput(name=name, isInIDF=is_in_idf)
    )
    return school


@schools_router.put(
    "/{school_id}",
    response_model=School,
    dependencies=[Depends(check_super_admin)],
)
async def update_school(
    school_id: int,
    name: str,
    is_in_idf: bool,
    is_deleg: bool,
    is_paid: bool,
    is_caution_paid: bool,
):
    # Fetch the current school data to compare isCautionPaid
    old_school = await prisma.school.find_unique(
        where=SchoolWhereUniqueInput(id=school_id)
    )
    if not old_school:
        raise HTTPException(status_code=404, detail="School not found")

    updated_school = await prisma.school.update(
        where=SchoolWhereUniqueInput(id=school_id),
        data=SchoolCreateInput(
            name=name,
            isInIDF=is_in_idf,
            isDeleg=is_deleg,
            isPaid=is_paid,
            isCautionPaid=is_caution_paid,
        ),
    )

    # If the caution payment status has changed, update the participants in teams
    if old_school.isCautionPaid != is_caution_paid:
        teams = await prisma.team.find_many(
            where={
                "schoolId": school_id,
                "status": {"in": ["Validated", "PrincipalList"]},
            }
        )
        for team in teams:
            await prisma.participant.update_many(
                where={"teamId": team.id},
                data={"cautionOK": is_caution_paid},
            )
     # If the isPaid status has changed, update team statuses accordingly
    if old_school.isPaid != is_paid:
        if is_paid:
            # If isPaid changed from false to true, update teams with status PrincipalList to Validated
            teams = await prisma.team.find_many(
                where={
                    "schoolId": school_id,
                    "status": "PrincipalList",
                }
            )
            for team in teams:
                await prisma.team.update(
                    where=TeamWhereUniqueInput(id=team.id),
                    data={"status": "Validated"},
                )
        else:
            # If isPaid changed from true to false, move teams from Validated back to PrincipalList
            teams = await prisma.team.find_many(
                where={
                    "schoolId": school_id,
                    "status": "Validated",
                }
            )
            for team in teams:
                await prisma.team.update(
                    where=TeamWhereUniqueInput(id=team.id),
                    data={"status": "PrincipalList"},
                )

    return updated_school

@schools_router.delete(
    "/{school_id}", dependencies=[Depends(check_super_admin)]
)
async def delete_school(school_id: int):
    await prisma.school.delete(
        where=SchoolWhereUniqueInput(id=school_id),
    )


@schools_router.put(
    "/{school_id}/paid", dependencies=[Depends(check_super_admin)]
)
async def school_paid(school_id: int, amountPaidInCents: int):

    school = await prisma.school.find_unique(
        where=SchoolWhereUniqueInput(id=school_id),
        include=SchoolInclude(teams=True),
    )

    if school is None:
        raise HTTPException(
            status_code=400,
            detail="This school does not exist",
        )

    # Ajout de la condition pour filtrer uniquement les équipes sur la liste principale
    amounts = await prisma.team.group_by(
        by=["schoolId"],
        sum=TeamSumAggregateInput(
            amountPaidInCents=True,
            amountToPayInCents=True,
        ),
        where=TeamWhereInput(schoolId=school_id, status="PrincipalList"),
    )
    schoolAmountPaidInCents = amounts[0]["_sum"]["amountPaidInCents"]
    schoolAmountToPayInCents = amounts[0]["_sum"]["amountToPayInCents"]

    schoolAmountLeftToPayInCents = (
        schoolAmountToPayInCents - schoolAmountPaidInCents
    )

    if schoolAmountLeftToPayInCents <= 0:
        raise HTTPException(
            status_code=400,
            detail="No payment needed",
        )

    if amountPaidInCents != schoolAmountLeftToPayInCents:
        raise HTTPException(
            status_code=400,
            detail={
                "error": f"Amount paid does not match the amount left to pay : amountPaidInCents[{amountPaidInCents}] != schoolAmountLeftToPayInCents[{schoolAmountLeftToPayInCents}]",
                "schoolAmountLeftToPayInCents": schoolAmountLeftToPayInCents,
                "amountPaidInCents": amountPaidInCents,
            },
        )

    # Mettre à jour uniquement les équipes sur la liste principale
    teams = await prisma.team.find_many(
        where=TeamWhereInput(schoolId=school_id, status="PrincipalList"),
    )
    for team in teams:
        await prisma.team.update(
            where=TeamWhereUniqueInput(id=team.id),
            data=TeamUpdateInput(
                amountPaidInCents=team.amountToPayInCents,
            ),
        )



#Ecotoss 



def distance_haversine(lat1, lon1, lat2, lon2):
     """
     Calculate the great circle distance between two points 
     on the earth (specified in decimal degrees)
     """
     # Rayon de la Terre en km
     R = 6371.0

     # Convertir les coordonnées en radians
     lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

     # Différences de latitude et de longitude
     dlat = lat2 - lat1
     dlon = lon2 - lon1

     # Formule de Haversine
     a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
     c = 2 * atan2(sqrt(a), sqrt(1 - a))

     # Distance en km
     distance = R * c
     return round(distance, 2)

@schools_router.get("/delegations/distances")
async def get_delegation_distances(user: Annotated[User, Depends(check_user)]):
    """
    Calculate distances between the user's school and all delegation schools.
    Returns a list of school objects with id, name and distance in km, sorted by distance.
    """
    # Get the user's school
    user_school = await prisma.school.find_unique(
        where={"id": user.schoolId}
    )
    
    if not user_school:
        raise HTTPException(status_code=404, detail="User's school not found")
    
    if not user_school.latitude or not user_school.longitude:
        raise HTTPException(
            status_code=400, 
            detail="User's school does not have geographic coordinates"
        )
    
    # Get all delegation schools
    delegation_schools = await prisma.school.find_many(
        where={"isDeleg": True}
    )
    
    if not delegation_schools:
        return {}
    
    # Calculate distances and create school objects
    school_distances = []
    for school in delegation_schools:
        # Skip schools without coordinates and the user's own school
        if (school.latitude and school.longitude) and school.id != user_school.id:
            distance = distance_haversine(
                user_school.latitude, 
                user_school.longitude,
                school.latitude, 
                school.longitude
            )
            school_distances.append({
                "id": school.id,
                "name": school.name,
                "distance": distance
            })
    
    # Sort by distance
    sorted_school_distances = sorted(school_distances, key=lambda x: x["distance"])
    
    return sorted_school_distances

@schools_router.get("/delegations", response_model=List[School])
async def get_delegation_schools():
    """Get all schools that are delegations"""
    schools = await prisma.school.find_many(
        where={"isDeleg": True}
    )
    return schools






@schools_router.get("/contact/{school_id}")
async def get_school_contact(
    school_id: int,
    user: Annotated[User, Depends(check_user)]
) -> Dict[str, Any]:
    """
    Get contact information for a specific school by its name.
    """
    # Find the school by name
    school = await prisma.school.find_first(
        where=SchoolWhereInput(
            id=school_id
        )
    )
    
    return {"contact": school.contact} if school else {}    