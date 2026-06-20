from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_workspace_id
from app.db.session import get_db
from app.models.import_job import ImportJob
from app.schemas.imports import CreateImportRequest, ImportJobResponse, ImportProgressResponse
from app.services.import_service import cancel_import, create_import_job, queue_depth_for_import

router = APIRouter()


@router.post("", response_model=ImportJobResponse)
def create_import(
    payload: CreateImportRequest,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> ImportJobResponse:
    job = create_import_job(
        db,
        workspace_id=workspace_id,
        provider_account_id=payload.provider_account_id,
        agent_id=payload.agent_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        page_size=payload.page_size,
    )
    return ImportJobResponse(
        id=job.id,
        status=job.status,
        imported_count=job.imported_count,
        failed_count=job.failed_count,
        cursor=job.cursor,
        created_at=job.created_at,
    )


@router.get("/{import_job_id}", response_model=ImportJobResponse)
def get_import_job(
    import_job_id: str,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> ImportJobResponse:
    job = db.scalar(
        select(ImportJob).where(ImportJob.id == import_job_id, ImportJob.workspace_id == workspace_id)
    )
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import job not found")

    return ImportJobResponse(
        id=job.id,
        status=job.status,
        imported_count=job.imported_count,
        failed_count=job.failed_count,
        cursor=job.cursor,
        created_at=job.created_at,
    )


@router.get("/{import_job_id}/progress", response_model=ImportProgressResponse)
def get_import_progress(
    import_job_id: str,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> ImportProgressResponse:
    job = db.scalar(
        select(ImportJob).where(ImportJob.id == import_job_id, ImportJob.workspace_id == workspace_id)
    )
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import job not found")

    depth = queue_depth_for_import(db, import_job_id)
    return ImportProgressResponse(
        import_job_id=job.id,
        status=job.status,
        imported_count=job.imported_count,
        failed_count=job.failed_count,
        queue_pending=depth["pending"],
        queue_leased=depth["leased"],
    )


@router.post("/{import_job_id}/cancel", response_model=ImportJobResponse)
def cancel_import_job(
    import_job_id: str,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> ImportJobResponse:
    job = cancel_import(db, import_job_id)
    if not job or job.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import job not found")

    return ImportJobResponse(
        id=job.id,
        status=job.status,
        imported_count=job.imported_count,
        failed_count=job.failed_count,
        cursor=job.cursor,
        created_at=job.created_at,
    )
