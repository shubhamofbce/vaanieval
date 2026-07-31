from pydantic import BaseModel, EmailStr, Field


class WaitlistApplicationRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    company: str = Field(min_length=1, max_length=160)
    role: str = Field(min_length=1, max_length=120)
    website: str | None = Field(default=None, max_length=2048)
    stack: str = Field(min_length=1, max_length=1000)
    challenge: str = Field(min_length=1, max_length=4000)
    source_page: str | None = Field(default=None, max_length=512)
    utm_source: str | None = Field(default=None, max_length=512)
    utm_medium: str | None = Field(default=None, max_length=512)
    utm_campaign: str | None = Field(default=None, max_length=512)


class WaitlistApplicationResponse(BaseModel):
    message: str
