#!/usr/bin/env python
"""Setup evaluation provider for demo purposes."""
import sys
import os
import uuid

sys.path.insert(0, os.getcwd())

from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import EvalProviderAccount, Workspace

# Create tables if not exist
Base.metadata.create_all(bind=engine)

db: Session = SessionLocal()
try:
    workspaces = db.query(Workspace).all()
    if not workspaces:
        print("No workspaces found")
    else:
        for workspace in workspaces:
            existing = db.query(EvalProviderAccount).filter(
                EvalProviderAccount.workspace_id == workspace.id,
                EvalProviderAccount.provider_name == "openai",
            ).first()

            if existing:
                print("✓ OpenAI provider already configured")
                print(f"  Workspace: {workspace.id} ({workspace.name})")
                print(f"  ID: {existing.id}")
                continue

            provider = EvalProviderAccount(
                id=str(uuid.uuid4()),
                workspace_id=workspace.id,
                provider_name="openai",
                api_key="sk-test-dummy",
                model_name="gpt-4.1-mini",
            )
            db.add(provider)
            db.commit()
            print("✓ OpenAI evaluation provider configured")
            print(f"  Workspace: {workspace.id} ({workspace.name})")
            print(f"  ID: {provider.id}")
            print(f"  Provider: {provider.provider_name}")
            print(f"  Model: {provider.model_name}")
finally:
    db.close()
