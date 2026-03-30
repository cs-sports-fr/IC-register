from fastapi import APIRouter, HTTPException, Depends
from typing import List
from pydantic import BaseModel
from prisma.models import Place
from infra.prisma import getPrisma  # Ensure this points to your Prisma client setup
from routes.auth.utils import check_admin  # Adjust your authentication as needed
from fastapi import Body
from fastapi import Query
from fastapi import Path
from pydantic import BaseModel
from datetime import datetime as Datetime
from typing import Optional
places_router = APIRouter(
    prefix="/places",
    tags=["places"],
    dependencies=[Depends(check_admin)],  # Only admins can manage places
)

prisma = getPrisma()


class PlaceCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    description: str = None


@places_router.get("/", response_model=List[Place])
async def get_all_places():
    places = await prisma.place.find_many()
    return places


@places_router.get("/logement", response_model=List[Place])
async def get_places_logement():
    places = await prisma.place.find_many(
        where={"Type":"Logement"},
        )
    return places


@places_router.get("/dinner", response_model=List[Place])
async def get_places_logement():
    places = await prisma.place.find_many(
        where={"Type":"RestaurationSoir"},
        )
    return places



@places_router.get("/vt", response_model=List[Place])
async def get_places_vt():
    places = await prisma.place.find_many(
        where={"Type":"VT"},
        )
    return places


@places_router.get("/food/breakfast", response_model=List[Place])
async def get_places_breakfast():
    places = await prisma.place.find_many(
        where={
            "Type": {"in": ["Restau", "RestaurationMidi", "VT"]}
        },
        )
    return places

@places_router.get("/food/lunch", response_model=List[Place])
async def get_places_lunch():
    places = await prisma.place.find_many(
        where={
            "Type": {"in": ["Restau", "RestaurationMidi", "VT"]}
        },
        )
    return places

@places_router.get("/food/dinner", response_model=List[Place])
async def get_places_dinner():
    places = await prisma.place.find_many(
        where={
            "Type": {"in": ["Restau", "RestaurationSoir", "VT"]}
        },
        )
    return places






@places_router.get("/search", response_model=List[Place])
async def search_places(query: str = Query(..., min_length=1)):
    places = await prisma.place.find_many(
        where={
            "OR": [
                {"name": {"contains": query, "mode": "insensitive"}},
                {"description": {"contains": query, "mode": "insensitive"}},
            ],
            "AND": [
                {"Type": "Tournoi"}
            ]
        }

    )
    return places

class PlaceCreateRequest(BaseModel):
    name: str
    latitude: float
    longitude: float
    description: str
    Type: str 

@places_router.post("/", response_model=Place)
async def create_place(data: PlaceCreateRequest):
    place = await prisma.place.create(
        data={
            "name": data.name,
            "latitude": data.latitude,
            "longitude": data.longitude,
            "description": data.description,
            "Type": data.Type,
        }
    )
    return place


@places_router.put("/assign", response_model=Place)
async def assign_place_to_sport(
    place_id: int = Body(...),
    sport_id: int = Body(None),  # Allow sport_id to be None for de-assign
    day: str = Body(..., regex="^(saturday|sunday)$")
):
    place = await prisma.place.find_unique(where={"id": place_id})
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    update_data = {}
    if day == "saturday":
        update_data["sportSaturdayId"] = sport_id  # Can be None to de-assign
    elif day == "sunday":
        update_data["sportSundayId"] = sport_id

    updated_place = await prisma.place.update(
        where={"id": place_id},
        data=update_data
    )
    return updated_place




class FieldsUpdate(BaseModel):
    number_of_fields: int

@places_router.put("/{place_id}/fields", response_model=Place)
async def update_number_of_fields(
    place_id: int = Path(...),
    data: FieldsUpdate = Body(...)
):
    place = await prisma.place.find_unique(where={"id": place_id})
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    updated_place = await prisma.place.update(
        where={"id": place_id},
        data={"numberOfFields": data.number_of_fields}
    )
    return updated_place



class TimeUpdate(BaseModel):
    startTime: Optional[Datetime] = None
    startTimeAfternoon: Optional[Datetime] = None

@places_router.put("/{place_id}/time", response_model=Place)
async def update_time_fields(
    place_id: int = Path(...),
    data: TimeUpdate = Body(...)
):
    place = await prisma.place.find_unique(where={"id": place_id})
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    update_data = {}
    if data.startTime is not None:
        update_data["startTime"] = data.startTime
    if data.startTimeAfternoon is not None:
        update_data["startTimeAfternoon"] = data.startTimeAfternoon

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    updated_place = await prisma.place.update(
        where={"id": place_id},
        data=update_data
    )
    return updated_place


class PlaceUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    longitude: Optional[float] = None
    latitude: Optional[float] = None

@places_router.put("/{place_id}/update", response_model=Place)
async def update_place(
    place_id: int = Path(...),
    data: PlaceUpdateRequest = Body(...)
):
    place = await prisma.place.find_unique(where={"id": place_id})
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description
    if data.longitude is not None:
        update_data["longitude"] = data.longitude
    if data.latitude is not None:
        update_data["latitude"] = data.latitude

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    updated_place = await prisma.place.update(
        where={"id": place_id},
        data=update_data
    )
    return updated_place