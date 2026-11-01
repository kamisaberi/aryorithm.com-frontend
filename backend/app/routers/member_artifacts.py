"""Member-facing artifact uploads and listings.

This router is the browser/member alternative to the developer-token based
``POST /hub/publish`` flow.  It authenticates with the normal user session
(``Authorization: Bearer`` or the shared SSO cookie) and reuses the existing
workspace upload pipeline, which server-signs artifacts when the browser does
not provide an Ed25519 signature.

The original developer, CLI and workspace routes remain unchanged.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.routers import workspace_artifacts as workspace
from app.services import hub_access as access
from app.services import hub_assets as assets

router = APIRouter(prefix="/member/artifacts", tags=["Member — Artifacts"])


@router.get("")
async def list_member_artifacts(
    scope: str = Query(
        default="owned",
        description="owned | shared | all | public | private",
    ),
    type: str = Query(default="all"),
    q: str = Query(default=""),
    industry: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="latest"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List artifacts the signed-in member owns or receives through a share."""
    scope = (scope or "owned").strip().lower()
    if scope not in access.SCOPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown scope '{scope}'. Use one of: {', '.join(access.SCOPES)}.",
        )
    try:
        views = await workspace._workspace_views(db, user, scope)
        views = assets.filter_views(
            views, query=q, asset_type=type, industry=industry
        )
        ordered = assets.sort_views(views, sort)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )
    return assets.paginate(ordered, page, limit)


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_member_artifact(
    asset_type: str = Form(...),
    file: UploadFile = File(...),
    manifest: str = Form(...),
    signature: str = Form(""),
    visibility: str = Form("private"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload any artifact type as a signed-in member.

    No developer API token or author signature is required.  The existing
    workspace pipeline validates the manifest, signs the file with the
    deployment key when needed, and records ownership against this user.
    """
    return await workspace.upload_workspace_artifact(
        asset_type=asset_type,
        file=file,
        manifest=manifest,
        signature=signature,
        visibility=visibility,
        user=user,
        db=db,
    )


@router.get("/{asset_type}/{slug}")
async def member_artifact_detail(
    asset_type: str,
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Read one artifact visible to the signed-in member."""
    return await workspace.workspace_artifact_detail(
        asset_type=asset_type,
        slug=slug,
        user=user,
        db=db,
    )
