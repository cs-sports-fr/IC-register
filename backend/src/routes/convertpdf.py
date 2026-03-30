import os
import uuid
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi import Form, Query
from infra.aws.s3 import fileStorageClient  # type: ignore
import threading
import time
import convertapi
from infra.prisma import getPrisma  # type: ignore
prisma = getPrisma()


convertapi.api_credentials = 'secret_M645WdWtgRzvby9q'

pdf_router = APIRouter(
    prefix="/convertpdf",
    tags=["convertpdf"],
)

file_storage_client = fileStorageClient()

S3_BUCKET = "toss-images"
S3_FOLDER = "converted_pdfs"

# Set up logging
logger = logging.getLogger("convertpdf")
logging.basicConfig(level=logging.INFO)

def convert_and_upload(docx_path, pdf_path, s3_key, max_retries=2):
    attempt = 0
    success = False
    while attempt <= max_retries:
        try:
            logger.info(f"Starting conversion (attempt {attempt+1}): {docx_path} -> {pdf_path}")
            # --- ConvertAPI conversion ---
            result = convertapi.convert('pdf', {
                'File': docx_path
            }, from_format='docx')
            # Save the PDF to the desired path
            result.file.save(pdf_path)
            logger.info(f"ConvertAPI: PDF saved to {pdf_path}")
            # --- End ConvertAPI conversion ---

            logger.info(f"Uploading to S3: {s3_key}")
            file_storage_client.upload_file(pdf_path, S3_BUCKET, s3_key)
            logger.info(f"Upload complete: {s3_key}")
            success = True
            break  # Success, exit loop
        except Exception as e:
            logger.exception(f"Error during conversion/upload for {docx_path} on attempt {attempt+1}: {e}")
            attempt += 1
    # Clean up temp files after all attempts
    if os.path.exists(docx_path):
        os.remove(docx_path)
        logger.info(f"Deleted temp DOCX: {docx_path}")
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
        logger.info(f"Deleted temp PDF: {pdf_path}")
    if not success:
        logger.error(f"All attempts failed for {docx_path}")

@pdf_router.post("/upload-converted-pdf")
async def upload_converted_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    team_id: int = Form(None, description="Team ID"),
    participant_id: int = Form(None, description="Participant ID"),
    team_id_query: int = Query(None, alias="team_id"),
    participant_id_query: int = Query(None, alias="participant_id"),
):
    team_id = team_id or team_id_query
    participant_id = participant_id or participant_id_query

    os.makedirs("tmp", exist_ok=True)

    # --- new: fetch participant for naming ---
    participant = None
    if participant_id:
        participant = await prisma.participant.find_unique(
            where={"id": participant_id},
        )
    # ---------------------------------------

    docx_ext = file.filename.split(".")[-1]
    if docx_ext.lower() != "docx":
        raise HTTPException(status_code=400, detail="Only DOCX files are supported")

    docx_filename = f"{uuid.uuid4().hex}.docx"
    docx_path = os.path.join("tmp", docx_filename)

    # --- changed: build pdf_filename based on name ---
    if participant:
        # replace spaces or unsafe chars if needed
        fn = participant.firstname.replace(" ", "_")
        ln = participant.lastname.replace(" ", "_")
        pdf_filename = f"{fn}_{ln}.pdf"
    else:
        pdf_filename = f"{uuid.uuid4().hex}.pdf"
    # -----------------------------------

    # --- changed: build s3_key using same filename ---
    if team_id and participant:
        s3_key = f"{S3_FOLDER}/team_{team_id}/{pdf_filename}"
    else:
        s3_key = f"{S3_FOLDER}/{pdf_filename}"
    # -----------------------------------------

    pdf_path = os.path.join("tmp", pdf_filename)
    s3_url = f"https://{S3_BUCKET}.s3.amazonaws.com/{s3_key}"

    with open(docx_path, "wb") as buffer:
        buffer.write(await file.read())

    if participant_id:
        await prisma.participant.update(
            where={"id": participant_id},
            data={"convocationLink": s3_url}
        )
        logger.info(f"Updated convocationLink for participant {participant_id}")

    if team_id:
        await prisma.team.update(
            where={"id": team_id},
            data={"isConvocationGenerated": True}
        )
        logger.info(f"Updated convocationLink for team {team_id}")
        
    logger.info(f"Received file for team {team_id}, participant {participant_id}, S3 key: {s3_key}")
    background_tasks.add_task(convert_and_upload, docx_path, pdf_path, s3_key)
    return {
        "status": "started",
        "message": "Conversion and upload started in background.",
        "s3_key": s3_key,
        "s3_url": s3_url
    }
    
    
    
    
    