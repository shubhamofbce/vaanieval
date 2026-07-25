from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_workspace_owner
from app.db.session import get_db
from app.models.ingest import WorkspaceIngestKey
from app.schemas.ingest import (
    CreatedIngestKeyResponse,
    CreateIngestKeyRequest,
    IngestKeyResponse,
    PipecatCallIngestRequest,
    PipecatCallIngestResponse,
)
from app.services.ingest_service import (
    create_ingest_key,
    ingest_pipecat_call,
    resolve_ingest_key,
    revoke_ingest_key,
)

router = APIRouter()


def _key_response(key: WorkspaceIngestKey) -> IngestKeyResponse:
    return IngestKeyResponse(
        id=key.id, name=key.name, key_prefix=key.key_prefix,
        created_at=key.created_at, revoked_at=key.revoked_at,
    )


@router.post("/keys", response_model=CreatedIngestKeyResponse, status_code=status.HTTP_201_CREATED)
def create_key(
    payload: CreateIngestKeyRequest,
    workspace_id: str = Depends(get_current_workspace_owner),
    db: Session = Depends(get_db),
) -> CreatedIngestKeyResponse:
    key, raw_key = create_ingest_key(db, workspace_id=workspace_id, name=payload.name)
    return CreatedIngestKeyResponse(**_key_response(key).model_dump(), api_key=raw_key)


@router.get("/keys", response_model=list[IngestKeyResponse])
def list_keys(
    workspace_id: str = Depends(get_current_workspace_owner),
    db: Session = Depends(get_db),
) -> list[IngestKeyResponse]:
    rows = db.scalars(select(WorkspaceIngestKey).where(
        WorkspaceIngestKey.workspace_id == workspace_id
    ).order_by(WorkspaceIngestKey.created_at.desc())).all()
    return [_key_response(row) for row in rows]


@router.delete("/keys/{key_id}", response_model=IngestKeyResponse)
def revoke_key(
    key_id: str,
    workspace_id: str = Depends(get_current_workspace_owner),
    db: Session = Depends(get_db),
) -> IngestKeyResponse:
    key = revoke_ingest_key(db, workspace_id=workspace_id, key_id=key_id)
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingest key not found")
    return _key_response(key)


@router.post("/pipecat/calls", response_model=PipecatCallIngestResponse, status_code=status.HTTP_201_CREATED)
def ingest_call(
    payload: PipecatCallIngestRequest,
    response: Response,
    x_vaanieval_key: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> PipecatCallIngestResponse:
    if not x_vaanieval_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-VaaniEval-Key")
    key = resolve_ingest_key(db, x_vaanieval_key)
    if not key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ingest key")

    conversation, created, evaluation_queued = ingest_pipecat_call(
        db, workspace_id=key.workspace_id, payload=payload
    )
    if not created:
        response.status_code = status.HTTP_200_OK
    return PipecatCallIngestResponse(
        conversation_id=conversation.id,
        call_id=conversation.provider_conversation_id,
        created=created,
        evaluation_queued=evaluation_queued,
    )
