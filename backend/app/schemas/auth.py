from pydantic import BaseModel, EmailStr


class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkVerifyRequest(BaseModel):
    token: str


class AuthResponse(BaseModel):
    user_id: str
    email: EmailStr
    workspace_id: str


class MessageResponse(BaseModel):
    message: str
