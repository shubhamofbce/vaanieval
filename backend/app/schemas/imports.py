from datetime import datetime

from pydantic import BaseModel


class CreateImportRequest(BaseModel):
    provider_account_id: str
    agent_id: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    page_size: int = 50


class ImportJobResponse(BaseModel):
    id: str
    status: str
    imported_count: int
    failed_count: int
    cursor: str | None
    created_at: datetime


class ImportProgressResponse(BaseModel):
    import_job_id: str
    status: str
    imported_count: int
    failed_count: int
    queue_pending: int
    queue_leased: int
