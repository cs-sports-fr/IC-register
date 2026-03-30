import os

from typing import Annotated, List
from fastapi import APIRouter, HTTPException, Depends, UploadFile
from fastapi.responses import FileResponse
from prisma.models import User, Participant, Team
from prisma.types import (
    PackWhereUniqueInput,
    ParticipantWhereInput,
    ParticipantUpdateInput,
    ParticipantInclude,
    PackUpdateOneWithoutRelationsInput,
    ProductUpdateManyWithoutRelationsInput,
    _ProductWhereUnique_id_Input,
    StringFilter,
)

from infra.aws.s3 import fileStorageClient  # type: ignore
from starlette.background import BackgroundTasks

from .utils import (
    ParticipantInput,
    add_participant_to_team,
    check_and_update_team_amount_to_pay_then_get_team,
    get_team_if_allowed,
    send_charte_email,
    send_host_rez_email,
    send_participant_rez_email,
    send_participant_selected_email,
    send_participant_com_email,
    send_participant_com_email2
)   

from infra.prisma import getPrisma  # type: ignore
from routes.auth.utils import check_user, check_admin, generate_password  # type: ignore
from .caution_links import SPORT_CAUTION_LINKS, DEFAULT_CAUTION_LINK  # type: ignore

team_participants_router = APIRouter(
    prefix="/teams",
    tags=["teams-participants"],
)
prisma = getPrisma()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
file_storage_client = fileStorageClient()
ALLOWED_UPLOAD_EXTENSIONS = ["pdf", "jpeg", "jpg", "png", "JPG", "JPEG", "PNG"]


async def _get_participant_in_team(team_id: int, participant_id: int):
    participant = await prisma.participant.find_first(
        where=ParticipantWhereInput(id=participant_id, teamId=team_id),
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    return participant


async def _save_participant_document(
    *,
    team_id: int,
    participant_id: int,
    upload: UploadFile,
    document_type: str,
    participant_field: str,
):
    existing_participant = await _get_participant_in_team(team_id, participant_id)
    if upload is None:
        raise HTTPException(status_code=400, detail="No file provided")

    if upload.filename is None:
        raise HTTPException(
            status_code=400,
            detail="No file name on original file : cannot get file extension",
        )

    extension = upload.filename.split(".")[-1]
    if extension not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file extension")

    try:
        contents = await upload.read()
        size = len(contents)
        if size == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        if size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large")

        os.makedirs("tmp", exist_ok=True)
        temp_file = f"tmp/{document_type}_{team_id}_{participant_id}.{extension}"
        with open(temp_file, "wb") as buffer:
            buffer.write(contents)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error while saving file: {e}"
        )

    try:
        document_url = (
            f"{document_type}/team_{team_id}/participant_{participant_id}.{extension}"
        )
        file_storage_client.upload_file(
            temp_file, "toss-register-certificates", document_url
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error while uploading file to s3: {e}"
        )
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

    await prisma.participant.update(
        where=ParticipantWhereInput(id=existing_participant.id),
        data={participant_field: document_url},
    )


async def _get_participant_document(
    *,
    team_id: int,
    participant_id: int,
    participant_field: str,
    not_found_message: str,
    background_tasks: BackgroundTasks,
):
    existing_participant = await _get_participant_in_team(team_id, participant_id)
    document_link = getattr(existing_participant, participant_field, None)
    if document_link is None:
        raise HTTPException(status_code=404, detail=not_found_message)

    try:
        download_path = f"tmp/{document_link.replace('/', '_')}"
        file_storage_client.download_file(
            "toss-register-certificates",
            document_link,
            download_path,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error while downloading file from s3: {e}"
        )

    background_tasks.add_task(os.remove, download_path)
    return FileResponse(download_path)


async def _toggle_participant_boolean_field(
    *,
    team_id: int,
    participant_id: int,
    field_name: str,
    label: str,
):
    team = await prisma.team.find_unique(where={"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    participant = await prisma.participant.find_unique(where={"id": participant_id})
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    if participant.teamId != team_id:
        raise HTTPException(
            status_code=403, detail="Participant does not belong to this team"
        )

    new_status = not getattr(participant, field_name)
    await prisma.participant.update(
        where={"id": participant_id},
        data={field_name: new_status},
    )

    status_message = "validated" if new_status else "invalidated"
    return {"message": f"Participant {label} {status_message} successfully"}


@team_participants_router.get(
    "/{team_id}/participants", response_model=List[Participant]
)
async def team_get_participants(
    team_id: int,
    user: Annotated[User, Depends(check_user)],
):
    existing_team = await get_team_if_allowed(team_id, user)

    return existing_team.participants


@team_participants_router.post("/{team_id}/participants", response_model=Team)
async def team_add_participants(
    team_id: int,
    participants: List[ParticipantInput],
    user: Annotated[User, Depends(check_user)],
):
    existing_team = await get_team_if_allowed(team_id, user)

    for new_participant in participants:

        charte_password = generate_password()

        participant = await add_participant_to_team(
            team_id=existing_team.id,
            school_id=existing_team.schoolId,
            charte_password=charte_password,
            new_participant=new_participant,
            sport_id=existing_team.sportId,
        )

        url = f"{FRONTEND_URL}/charte"

        await send_charte_email(
            participant.email,
            participant.firstname,
            participant.chartePassword,
            url,
        )

        if participant.packId == 1 or participant.packId == 6: ## TODO change to better logic
            await send_host_rez_email(participant.mailHebergeur, participant.firstname, participant.lastname)
        
        if participant.packId == 1 or participant.packId == 6: ## TODO change to better logic
            await send_participant_rez_email(participant.email, participant.firstname)


    updated_team, _ = await check_and_update_team_amount_to_pay_then_get_team(
        team_id=existing_team.id
    )

    return updated_team


@team_participants_router.delete("/{team_id}/participants", response_model=Team)
async def team_delete_participants(
    team_id: int,
    participant_ids: List[int],
    user: Annotated[User, Depends(check_user)],
):
    existing_team = await get_team_if_allowed(team_id, user)

    if not existing_team.participants:
        raise HTTPException(
            status_code=404, detail="No participants found in team"
        )

    for participant_id in participant_ids:
        id_found = None
        for team_participants in existing_team.participants:
            if team_participants.id == participant_id:
                id_found = participant_id
                break
        if not id_found:
            raise HTTPException(
                status_code=404, detail="Participant not found in team"
            )
        await prisma.participant.delete(
            where=ParticipantWhereInput(id=participant_id)
        )

    updated_team, _ = await check_and_update_team_amount_to_pay_then_get_team(
        team_id=existing_team.id
    )

    return updated_team

@team_participants_router.put(
    "/{team_id}/participant/{participant_id}", response_model=Participant
)
async def team_update_participant(
    team_id: int,
    participant_id: int,
    participant: ParticipantInput,
    user: Annotated[User, Depends(check_user)],
):
    await get_team_if_allowed(team_id, user)

    existing_participant = await prisma.participant.find_first(
        where=ParticipantWhereInput(id=participant_id, teamId=team_id),
        include=ParticipantInclude(products=True),
    )
    if not existing_participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    product_connections = [
        _ProductWhereUnique_id_Input(id=id_) for id_ in participant.productsIds
    ]

    # Check if participant is switching from a non-residence pack to a residence pack
    was_residence_pack = existing_participant.packId in [1, 6]
    is_residence_pack = participant.packId in [1, 6]
    reset_logement_rez_ok = False

    # If switching from non-residence to residence pack, set logementRezOk to False
    if not was_residence_pack and is_residence_pack:
        reset_logement_rez_ok = True

    # NOTE: On ne gère PAS les SwimmingResult ici.
    # Les changements d'épreuves seront reflétés dans toss_results via les champs
    # swimming50mEventId et swimming100mEventId qui sont mis à jour ci-dessous.
    # Si le responsable du sport veut changer les assignations, il peut le faire
    # directement dans l'interface de gestion des épreuves de natation.

    try:
        updated_participant = await prisma.participant.update(
            where=ParticipantWhereInput(id=participant_id),
            data=ParticipantUpdateInput(
                gender=participant.gender,
                firstname=participant.firstname,
                lastname=participant.lastname,
                email=participant.email,
                mobile=participant.mobile,
                dateOfBirth=participant.dateOfBirth,
                isCaptain=participant.isCaptain,
                licenceID=participant.licenceID,
                isVegan=participant.isVegan,
                hasAllergies=participant.hasAllergies,
                allergies=participant.allergies,
                weight=participant.weight,
                products=ProductUpdateManyWithoutRelationsInput(
                    set=product_connections,
                ),
                pack=PackUpdateOneWithoutRelationsInput(
                    connect=PackWhereUniqueInput(id=participant.packId)
                ),
                mailHebergeur=participant.mailHebergeur,
                classementTennis=participant.classementTennis,
                classementTT=participant.classementTT,
                armeVoeu1=participant.armeVoeu1,
                armeVoeu2=participant.armeVoeu2,
                armeVoeu3=participant.armeVoeu3,
                # Reset logementRezOk if needed
                logementRezOk=False if reset_logement_rez_ok else existing_participant.logementRezOk,
            ),
        )
    except Exception as e:
        # Prisma renvoie une erreur de contrainte unique avec le code P2002
        code = getattr(e, "code", None)
        if code == "P2002" and "email" in str(e):
            raise HTTPException(
                status_code=400,
                detail="Un autre participant utilise déjà cet email."
            )
        # Pour les autres erreurs, renvoyer un message explicite au frontend
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de la mise à jour du participant."
        )

    # Handle email notifications for residence packs
    residence_pack_ids = [1, 6]  # List of pack IDs that require residence
    
    # Send emails if mailHebergeur changed
    if existing_participant.mailHebergeur != participant.mailHebergeur and participant.mailHebergeur is not None:
        if participant.packId in residence_pack_ids:
            await send_host_rez_email(participant.mailHebergeur, participant.firstname, participant.lastname)
            await send_participant_rez_email(participant.email, participant.firstname)
    
    # Also send emails if pack type changed to residence pack
    elif not was_residence_pack and is_residence_pack and participant.mailHebergeur is not None:
        await send_host_rez_email(participant.mailHebergeur, participant.firstname, participant.lastname)
        await send_participant_rez_email(participant.email, participant.firstname)

    await check_and_update_team_amount_to_pay_then_get_team(team_id=team_id)

    return updated_participant


@team_participants_router.post(
    "/{team_id}/participant/{participant_id}/resend-charte-email",
    dependencies=[Depends(check_admin)],
)
async def participant_resend_charte_email(team_id: int, participant_id: int):
    existing_participant = await prisma.participant.find_first(
        where=ParticipantWhereInput(id=participant_id, teamId=team_id),
    )
    if not existing_participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    url = f"{FRONTEND_URL}/charte"

    await send_charte_email(
        existing_participant.email,
        existing_participant.firstname,
        existing_participant.chartePassword,
        url,
    )



@team_participants_router.post(
    "/{team_id}/participant/{participant_id}/resend-caution-email",
    dependencies=[Depends(check_admin)],
)
async def participant_resend_caution_email(team_id: int, participant_id: int):
    """
    Resend the selection notification email to a specific participant.
    Only accessible by admins.
    """
    # First check if the participant exists and belongs to the team
    participant = await prisma.participant.find_first(
        where=ParticipantWhereInput(id=participant_id, teamId=team_id),
        include={"team": {"include": {"sport": True}}}
    )
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    if not participant.team:
        raise HTTPException(status_code=404, detail="Team not found for participant")
    
    if not participant.team.sport:
        raise HTTPException(status_code=404, detail="Sport not found for team")
        
    # Get sport-specific link
    sport_id = participant.team.sportId
    sport_name = participant.team.sport.sport
    team_name = participant.team.name
    sport_link = SPORT_CAUTION_LINKS.get(sport_id, DEFAULT_CAUTION_LINK)
    
    # Resend the selection email
    try:
        await send_participant_selected_email(
            participant.email,
            participant.firstname,
            sport_link,
            sport_name,
            team_name
        )
        
        return {
            "message": f"Selection email resent successfully to {participant.firstname} {participant.lastname}",
            "email": participant.email
        }
    except Exception as e:
        print(f"Failed to send email to participant {participant.id}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to send email: {str(e)}"
        )




@team_participants_router.post(
    "/participant/sign-charte"
)
async def participant_sign_charte(
    email: str,
    charte_password: str,
):
    participants_with_email = await prisma.participant.find_many(
        where=ParticipantWhereInput(
            email=StringFilter(
                equals=email,
                mode="insensitive"
            )
        ),
    )
    if not participants_with_email:
        raise HTTPException(status_code=404, detail="Participant not found")

    existing_participant = next(
        (p for p in participants_with_email if p.chartePassword == charte_password),
        None,
    )
    if not existing_participant:
        raise HTTPException(status_code=403, detail="Invalid charte password")

    await prisma.participant.update(
        where=ParticipantWhereInput(id=existing_participant.id),
        data=ParticipantUpdateInput(
            charteIsValidated=True,
            chartePassword=charte_password,
        ),
    )


@team_participants_router.post(
    "/{team_id}/participant/{participant_id}/certificate",
)
async def participant_add_certificate(
    team_id: int,
    participant_id: int,
    certificate: UploadFile,
):
    await _save_participant_document(
        team_id=team_id,
        participant_id=participant_id,
        upload=certificate,
        document_type="certificates",
        participant_field="certificateLink",
    )


@team_participants_router.get(
    "/{team_id}/participant/{participant_id}/certificate",
    dependencies=[Depends(check_admin)],
    response_class=FileResponse,
)
async def participant_get_certificate(
    team_id: int, participant_id: int, background_tasks: BackgroundTasks
):
    return await _get_participant_document(
        team_id=team_id,
        participant_id=participant_id,
        participant_field="certificateLink",
        not_found_message="No certificate found",
        background_tasks=background_tasks,
    )


@team_participants_router.post(
    "/{team_id}/participant/{participant_id}/licence",
)
async def participant_add_licence(
    team_id: int,
    participant_id: int,
    licence: UploadFile,
):
    await _save_participant_document(
        team_id=team_id,
        participant_id=participant_id,
        upload=licence,
        document_type="licences",
        participant_field="licenceLink",
    )


@team_participants_router.get(
    "/{team_id}/participant/{participant_id}/licence",
    dependencies=[Depends(check_admin)],
    response_class=FileResponse,
)
async def participant_get_licence(
    team_id: int, participant_id: int, background_tasks: BackgroundTasks
):
    return await _get_participant_document(
        team_id=team_id,
        participant_id=participant_id,
        participant_field="licenceLink",
        not_found_message="No licence found",
        background_tasks=background_tasks,
    )




@team_participants_router.put("/{team_id}/participant/{participant_id}/validate-rez")
async def validate_participant_rez(
    team_id: int,
    participant_id: int,
    user: Annotated[User, Depends(check_admin)]  # Only admins can access this endpoint
):
    """
    Toggle a participant's logementRezOk status between true and false.
    This endpoint is used to validate or invalidate a participant's accommodation status.
    """
    # First check if the team exists
    team = await prisma.team.find_unique(
        where={
            "id": team_id
        }
    )
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Then check if the participant exists and belongs to the team
    participant = await prisma.participant.find_unique(
        where={
            "id": participant_id
        }
    )
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    if participant.teamId != team_id:
        raise HTTPException(status_code=403, detail="Participant does not belong to this team")
    
    # Toggle the logementRezOk status instead of just setting it to True
    new_logement_status = not participant.logementRezOk
    
    updated_participant = await prisma.participant.update(
        where={
            "id": participant_id
        },
        data={
            "logementRezOk": new_logement_status
        }
    )
    
    status_message = "validated" if new_logement_status else "invalidated"
    return {"message": f"Participant accommodation {status_message} successfully"}

@team_participants_router.put("/{team_id}/participant/{participant_id}/validate-caution")
async def validate_participant_caution(
    team_id: int,
    participant_id: int,
    user: Annotated[User, Depends(check_admin)]  # Only admins can access this endpoint
):
    """
    Toggle a participant's caution status between true and false.
    This endpoint is used to validate or invalidate a participant's caution status.
    """
    # First check if the team exists
    team = await prisma.team.find_unique(
        where={
            "id": team_id
        }
    )
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Then check if the participant exists and belongs to the team
    participant = await prisma.participant.find_unique(
        where={
            "id": participant_id
        }
    )
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    if participant.teamId != team_id:
        raise HTTPException(status_code=403, detail="Participant does not belong to this team")
    
    # Toggle the cautionOK status instead of just setting it to True
    new_caution_status = not participant.cautionOK
    
    updated_participant = await prisma.participant.update(
        where={
            "id": participant_id
        },
        data={
            "cautionOK": new_caution_status
        }
    )
    
    status_message = "validated" if new_caution_status else "invalidated"
    return {"message": f"Participant caution {status_message} successfully"}


@team_participants_router.put("/{team_id}/participant/{participant_id}/validate-certificateandlicence")
async def validate_participant_certificate(
    team_id: int,
    participant_id: int,
    user: Annotated[User, Depends(check_admin)]  # Only admins can access this endpoint
):
    return await _toggle_participant_boolean_field(
        team_id=team_id,
        participant_id=participant_id,
        field_name="certificateOK",
        label="certificate",
    )


@team_participants_router.put("/{team_id}/participant/{participant_id}/validate-certificate")
async def validate_participant_certificate_only(
    team_id: int,
    participant_id: int,
    user: Annotated[User, Depends(check_admin)],
):
    return await _toggle_participant_boolean_field(
        team_id=team_id,
        participant_id=participant_id,
        field_name="certificateOK",
        label="certificate",
    )


@team_participants_router.put("/{team_id}/participant/{participant_id}/validate-licence")
async def validate_participant_licence(
    team_id: int,
    participant_id: int,
    user: Annotated[User, Depends(check_admin)],
):
    return await _toggle_participant_boolean_field(
        team_id=team_id,
        participant_id=participant_id,
        field_name="licenceOK",
        label="licence",
    )




from typing import Optional, List
from fastapi import Query
from prisma.enums import TeamStatus

@team_participants_router.get("/packs/statistics")
async def get_pack_statistics(
    user: Annotated[User, Depends(check_admin)],
    team_status: Optional[List[TeamStatus]] = Query(None, description="Filter by team status"),
    sport_ids: Optional[List[int]] = Query(None, description="Filter by sport IDs"),
    school_ids: Optional[List[int]] = Query(None, description="Filter by school IDs"),
    pack_ids: Optional[List[int]] = Query(None, description="Filter by pack IDs"),
    gender: Optional[List[str]] = Query(None, description="Filter by participant gender"),
    include_dates: bool = Query(False, description="Group statistics by registration date")
):
    try:
        # Build where conditions
        where_conditions = {}
        team_where = {}
        if team_status:
            team_where["status"] = {"in": team_status}
        if sport_ids:
            team_where["sportId"] = {"in": sport_ids}
        if school_ids:
            team_where["schoolId"] = {"in": school_ids}
        if team_where:
            where_conditions["team"] = team_where
        if pack_ids:
            where_conditions["packId"] = {"in": pack_ids}
        if gender:
            where_conditions["gender"] = {"in": gender}
        
        # Get all participants matching the filters
        participants = await prisma.participant.find_many(
            where=where_conditions,
            include={
                "team": {
                    "include": {
                        "sport": True,
                        "school": True
                    }
                },
                "pack": True,
                "products": True
            }
        )
        
        if not participants:
            return {"message": "No participants found matching the criteria", "total": 0, "packs": {}}
        
        # Initialize statistics
        stats = {
            "total": len(participants),
            "by_pack": {},
            "by_school": {},
            "by_sport": {},
            "by_gender": {},
            "by_product": {},
        }
        products_revenue = 0
        pack17_count_global = 0  # if needed for global purposes
        
        for participant in participants:
            # Determine pack
            if not participant.pack:
                pack_id = "No Pack"
                pack_name = "No Pack"
            else:
                pack_id = participant.pack.id
                pack_name = participant.pack.name

            # Count pack id 17
            if participant.pack and participant.pack.id == 17:
                pack17_count_global += 1

            participant_gender = participant.gender if getattr(participant, "gender", None) else "Unknown"
            
            # Process by_pack statistics
            if pack_id not in stats["by_pack"]:
                stats["by_pack"][pack_id] = {
                    "name": pack_name,
                    "count": 0,
                    "price": participant.pack.priceInCents/100 if participant.pack else 0,
                    "participants": [] if include_dates else None
                }
            stats["by_pack"][pack_id]["count"] += 1

            # Process product statistics
            if participant.products:
                for product in participant.products:
                    product_id = product.id
                    product_name = product.name
                    product_price = product.priceInCents/100
                    products_revenue += product_price
                    if product_id not in stats["by_product"]:
                        stats["by_product"][product_id] = {
                            "name": product_name,
                            "count": 0,
                            "price": product_price,
                            "total_revenue": 0
                        }
                    stats["by_product"][product_id]["count"] += 1
                    stats["by_product"][product_id]["total_revenue"] += product_price

            if include_dates:
                stats["by_pack"][pack_id]["participants"].append({
                    "id": participant.id,
                    "name": f"{participant.firstname} {participant.lastname}",
                    "created_at": participant.createdAt,
                    "gender": participant_gender,
                    "team_name": participant.team.name if participant.team else None,
                    "sport": participant.team.sport.sport if participant.team and participant.team.sport else None,
                    "school": participant.team.school.name if participant.team and participant.team.school else None
                })
            
            # Process by_school statistics
            school_name = participant.team.school.name if participant.team and participant.team.school else "Unknown"
            school_id = participant.team.schoolId if participant.team else 0
            if school_id not in stats["by_school"]:
                stats["by_school"][school_id] = {
                    "name": school_name,
                    "count": 0,
                    "packs": {}
                }
            stats["by_school"][school_id]["count"] += 1
            if pack_id not in stats["by_school"][school_id]["packs"]:
                stats["by_school"][school_id]["packs"][pack_id] = {
                    "name": pack_name,
                    "count": 0
                }
            stats["by_school"][school_id]["packs"][pack_id]["count"] += 1

            # Process by_sport statistics
            sport_name = participant.team.sport.sport if participant.team and participant.team.sport else "Unknown"
            sport_id = participant.team.sportId if participant.team else 0
            if sport_id not in stats["by_sport"]:
                stats["by_sport"][sport_id] = {
                    "name": sport_name,
                    "count": 0,
                    "packs": {},
                    "pack17_count": 0   # count for pack 17
                }
            stats["by_sport"][sport_id]["count"] += 1
            if participant.pack and participant.pack.id == 17:
                stats["by_sport"][sport_id]["pack17_count"] += 1
            if pack_id not in stats["by_sport"][sport_id]["packs"]:
                stats["by_sport"][sport_id]["packs"][pack_id] = {
                    "name": pack_name,
                    "count": 0
                }
            stats["by_sport"][sport_id]["packs"][pack_id]["count"] += 1

            # Process by_gender statistics
            if participant_gender not in stats["by_gender"]:
                stats["by_gender"][participant_gender] = {
                    "count": 0,
                    "packs": {}
                }
            stats["by_gender"][participant_gender]["count"] += 1
            if pack_id not in stats["by_gender"][participant_gender]["packs"]:
                stats["by_gender"][participant_gender]["packs"][pack_id] = {
                    "name": pack_name,
                    "count": 0
                }
            stats["by_gender"][participant_gender]["packs"][pack_id]["count"] += 1
        
        # Compute revenue summary
        packs_revenue = sum(
            stats["by_pack"][pid]["count"] * stats["by_pack"][pid]["price"]
            for pid in stats["by_pack"]
            if pid != "No Pack"
        )
        total_revenue = packs_revenue + products_revenue

        # Sort entries (optional)
        stats["by_pack"] = dict(sorted(stats["by_pack"].items(), key=lambda item: item[1]["count"], reverse=True))
        stats["by_product"] = dict(sorted(stats["by_product"].items(), key=lambda item: item[1]["count"], reverse=True))
        stats["by_school"] = dict(sorted(stats["by_school"].items(), key=lambda item: item[1]["count"], reverse=True))
        stats["by_sport"] = dict(sorted(stats["by_sport"].items(), key=lambda item: item[1]["count"], reverse=True))
        stats["by_gender"] = dict(sorted(stats["by_gender"].items(), key=lambda item: item[1]["count"], reverse=True))
        
        # Add summary fields
        stats["total_revenue"] = total_revenue
        stats["packs_revenue"] = packs_revenue
        stats["products_revenue"] = products_revenue
        stats["average_price_per_participant"] = total_revenue / stats["total"] if stats["total"] > 0 else 0
        
        # For each sport, calculate the maximum possible participants and set the pack17 ratio
        all_sports = await prisma.sport.find_many()
        sports_by_id = {sport.id: sport for sport in all_sports}
        for sport_id, sport_stats in stats["by_sport"].items():
            sport_info = sports_by_id.get(int(sport_id))
            if sport_info and sport_info.nbOfTeams and sport_info.nbPlayersMax:
                max_participants = sport_info.nbOfTeams * sport_info.nbPlayersMax
                sport_stats["pack17_ratio"] = sport_stats["pack17_count"] / max_participants if max_participants > 0 else None
            else:
                sport_stats["pack17_ratio"] = None
        
        return stats
    except Exception as e:
        import traceback
        print(f"Error calculating pack statistics: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    
    
@team_participants_router.get("/participants/details")
async def get_participants_details(
    user: Annotated[User, Depends(check_admin)],
    team_status: Optional[List[TeamStatus]] = Query(None, description="Filter by team status"),
    sport_ids: Optional[List[int]] = Query(None, description="Filter by sport IDs"),
    school_ids: Optional[List[int]] = Query(None, description="Filter by school IDs"),
    pack_ids: Optional[List[int]] = Query(None, description="Filter by pack IDs"),
    gender: Optional[List[str]] = Query(None, description="Filter by participant gender"),
    search: Optional[str] = Query(None, description="Search participants by name or email")
):
    try:
        # Build where conditions based on provided filters
        where_conditions = {}
        
        # Only include participants from specific teams if filtered
        team_where = {}
        if team_status:
            team_where["status"] = {"in": team_status}
        if sport_ids:
            team_where["sportId"] = {"in": sport_ids}
        if school_ids:
            team_where["schoolId"] = {"in": school_ids}
        if team_where:
            where_conditions["team"] = team_where
        
        # Add pack filter directly if provided
        if pack_ids:
            where_conditions["packId"] = {"in": pack_ids}
        
        # Add gender filter directly if provided
        if gender:
            where_conditions["gender"] = {"in": gender}
        
        # Add search filter on firstname, lastname, or email
        if search:
            where_conditions["OR"] = [
                {"firstname": {"contains": search, "mode": "insensitive"}},
                {"lastname": {"contains": search, "mode": "insensitive"}},
                {"email": {"contains": search, "mode": "insensitive"}}
            ]
        
        # Get all participants that match our filters, including their products
        participants = await prisma.participant.find_many(
            where=where_conditions,
            include={
                "team": {
                    "include": {
                        "sport": True,
                        "school": True
                    }
                },
                "pack": True,
                "products": True
            },
            take=502  
        )
        
        if not participants:
            return {"message": "No participants found matching the criteria", "participants": []}
        
        # Format each participant with the requested information
        participants_details = []
        for participant in participants:
            pack_price = participant.pack.priceInCents / 100 if participant.pack else 0
            products_price = (
                sum(product.priceInCents / 100 for product in participant.products)
                if participant.products
                else 0
            )

            # Remises écoles réelles (utilisées pour le prix réellement payé)
            real_school_discount = (
                43 if participant.team and participant.team.schoolId in [34] else 0
            )
            real_school_discount2 = (
                10
                if participant.team
                and participant.team.schoolId in [2, 93, 97, 43, 10, 59, 118]
                else 0
            )

            # Suppléments sport : 15€ pour l'équitation (id 14), 20€ pour le golf (id 19)
            sport_extra_fee = 0
            if participant.team:
                if participant.team.sportId == 14:
                    sport_extra_fee = 15
                elif participant.team.sportId == 19:
                    sport_extra_fee = 20
            sport_discount = (
                10 if participant.team and participant.team.sportId == 34 else 0
            )

            # Prix réellement payé par le participant (organisateur)
            effective_price = (
                pack_price
                + products_price
                - real_school_discount
                - real_school_discount2
                + sport_extra_fee
                - sport_discount
            )
            
            participant_detail = {
                "id": participant.id,
                "firstname": participant.firstname,
                "lastname": participant.lastname,
                "email": participant.email,
                "mobile": participant.mobile,
                "isCaptain": participant.isCaptain,
                "gender": participant.gender or "Unknown",
                "products": [
                    {
                        "id": product.id,
                        "name": product.name,
                        "price": product.priceInCents/100
                    } for product in participant.products
                ] if participant.products else [],
                "pack": {
                    "id": participant.pack.id,
                    "name": participant.pack.name,
                    "price": pack_price
                } if participant.pack else None,
                "school": {
                    "id": participant.team.schoolId,
                    "name": participant.team.school.name if participant.team and participant.team.school else "Unknown"
                } if participant.team else None,
                "team": {
                    "id": participant.teamId,
                    "name": participant.team.name if participant.team else "Unknown"
                } if participant.teamId else None,
                "sport": {
                    "id": participant.team.sportId,
                    "name": participant.team.sport.sport
                    if participant.team and participant.team.sport
                    else "Unknown",
                }
                if participant.team
                else None,
                # Prix affiché au participant ET prix réellement payé 
                # (pack + goodies + suppléments − remises écoles éventuelles)
                "total_price": effective_price,
                "effective_price": effective_price,
            }
            
            participants_details.append(participant_detail)
        
        return {
            "total": len(participants_details),
            "participants": participants_details
        }
        
    except Exception as e:
        import traceback
        print(f"Error retrieving participant details: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    


#Email pour le toss result 



@team_participants_router.post(
    "/{team_id}/participant/send-email-com",
    dependencies=[Depends(check_admin)],
)
async def participant_send_email_com(team_id: int):
    """
    Resend the selection notification email to all participants of a team.
    Only accessible by admins.
    """
    participants = await prisma.participant.find_many(
        where={"teamId": team_id},
        include={"team": {"include": {"sport": True}}}
    )
    
    if not participants:
        raise HTTPException(status_code=404, detail="Participant not found")

    sportId = participants[0].team.sport.id
    sent = []
    failed = []

    for participant in participants:
        try:
            await send_participant_com_email(
                participant.email,
                participant.firstname,
                sportId,
            )
            sent.append({
                "firstname": participant.firstname,
                "lastname": participant.lastname,
                "email": participant.email
            })
        except Exception as e:
            print(f"Failed to send email to participant {participant.id}: {e}")
            failed.append({
                "id": participant.id,
                "error": str(e)
            })

    return {
        "message": f"Emails sent: {len(sent)}, failed: {len(failed)}",
        "sent": sent,
        "failed": failed
    }

@team_participants_router.post(
    "/{team_id}/participant/send-email-com2",
    dependencies=[Depends(check_admin)],
)
async def participant_send_email_com2(team_id: int):
    """
    Resend the selection notification email to all participants of a team using send_participant_com_email2.
    Only accessible by admins.
    """
    participants = await prisma.participant.find_many(
        where={"teamId": team_id},
        include={"team": {"include": {"sport": True}}}
    )
    
    if not participants:
        raise HTTPException(status_code=404, detail="Participant not found")

    sportId = participants[0].team.sport.id
    sent = []
    failed = []

    for participant in participants:
        try:
            await send_participant_com_email2(
                participant.email,
                participant.firstname,
                sportId,
            )
            sent.append({
                "firstname": participant.firstname,
                "lastname": participant.lastname,
                "email": participant.email
            })
        except Exception as e:
            print(f"Failed to send email to participant {participant.id}: {e}")
            failed.append({
                "id": participant.id,
                "error": str(e)
            })

    return {
        "message": f"Emails sent: {len(sent)}, failed: {len(failed)}",
        "sent": sent,
        "failed": failed
    }