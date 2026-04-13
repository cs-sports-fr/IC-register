import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from infra.prisma import prisma


from routes.auth.auth import auth_router
from routes.signup import signup_router
from routes.teams.teams import teams_router
from routes.teams.participants import team_participants_router
from routes.schools import schools_router
from routes.products import products_router
from routes.packs import packs_router
from routes.sports import sports_router
from routes.users import users_router
from routes.config import config_router
from routes.payment.payment import payment_router
from routes.pools import pools_router
from routes.matches.matches import matches_router
from routes.participants import participant_router
from routes.places import places_router
from routes.medals import medals_router
from routes.convertpdf import pdf_router
from routes.tent_assignment import tent_assignment_router
from routes.swimming import swimming_router
from routes.restauration import restauration_router

MODE = os.getenv("MODE", "dev")

docs_url = None
redoc_url = None
openapi_url = None

if MODE == "dev":
    print("Developper mode enabled, Loading .env ...")
    load_dotenv("../.env")

openapi_url = "/openapi.json"
docs_url = "/docs"
redoc_url = "/redoc"

app = FastAPI(
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
    title="ic-register backend",
    description="The backend API for IC register, a web app for registering users to the IC tournament.",
    version="0.0.1",
    contact={
        "name": "IC Team",
        "email": "info@cs-sports.fr",
    },
)


origins = ["https://localhost:3000", "http://localhost:8081",'http://localhost:5173', "*"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(signup_router)
app.include_router(teams_router)
app.include_router(team_participants_router)
app.include_router(schools_router)
app.include_router(products_router)
app.include_router(packs_router)
app.include_router(sports_router)
app.include_router(users_router)
app.include_router(config_router)
app.include_router(payment_router)
app.include_router(pools_router)
app.include_router(matches_router)
app.include_router(participant_router)
app.include_router(places_router)
app.include_router(medals_router)
app.include_router(pdf_router)
app.include_router(tent_assignment_router)
app.include_router(swimming_router)
app.include_router(restauration_router)

@app.on_event("startup")
async def startup():
    await prisma.connect()


@app.on_event("shutdown")
async def shutdown():
    await prisma.disconnect()
