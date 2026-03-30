from typing import List
from fastapi import APIRouter, Depends, HTTPException
from prisma.models import Medal, Sport, School
from infra.prisma import getPrisma
from routes.auth.utils import check_token,check_admin
from prisma.enums import MedalType
# Initialize the router and Prisma client
medals_router = APIRouter(
    prefix="/medals",
    tags=["medals"],
    dependencies=[Depends(check_token)],
)

prisma = getPrisma()

# models.py (or a dedicated pydantic_models.py file)
from pydantic import BaseModel
from enum import Enum

class MedalTypeEnum(str, Enum):
    Gold = "Gold"
    Silver = "Silver"
    Bronze = "Bronze"

class MedalCreate(BaseModel):
    sport_id: int
    school_id: int
    type: MedalTypeEnum


# Route to get all medals for a given sport
@medals_router.get("/{sport_id}", response_model=List[Medal])
async def get_medals_for_sport(sport_id: int):
    # Check if the sport exists
    sport = await prisma.sport.find_unique(where={"id": sport_id})
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found")
    
    # Fetch all medals for the sport
    medals = await prisma.medal.find_many(
        where={"sportId": sport_id},
        include={"school": True, "sport": True}, 
    )

    if not medals:
        return []  # Return an empty list if no medals are found

    return medals


# Route to add a medal to a specific sport
@medals_router.post("/add", response_model=Medal)
async def add_medal(medal: MedalCreate):
    # Check if the sport exists
    sport = await prisma.sport.find_unique(where={"id": medal.sport_id})
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found")
    
    # Check if the school exists
    school = await prisma.school.find_unique(where={"id": medal.school_id})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    # Create the new medal entry with related data
    created_medal = await prisma.medal.create(
        data={
            "type": medal.type,
            "sportId": medal.sport_id,
            "schoolId": medal.school_id,
        },
        include={
            "school": True,  # Include related school data
            "sport": True    # Include related sport data (optional)
        }
    )

    return created_medal
