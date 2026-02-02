"""Carbon tracking endpoints for recording user actions."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from .carbon_service import (
    CarbonServiceError,
    calculate_action_co2,
    calculate_trees_planted,
)
from .db import get_db
from .models import User, UserAction, UserFootprint
from .schemas import ActionRequest, ActionResponse

router = APIRouter(prefix="/users", tags=["carbon"])


@router.post("/action", response_model=ActionResponse, status_code=status.HTTP_200_OK)
async def record_action(
    request: ActionRequest,
    db: AsyncSession = Depends(get_db)
) -> ActionResponse:
    """
    Record a carbon-saving action and calculate CO2 impact.
    
    - **user_id**: The user performing the action (required)
    - **action_code**: Code identifying the action type (required)
    
    Returns CO2 saved, cumulative savings, and trees planted equivalent.
    """
    # Verify user exists
    result = await db.execute(
        select(User).where(User.id == request.user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Calculate CO2 impact using Climatiq API
    try:
        co2_kg = await calculate_action_co2(request.action_code)
    except CarbonServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate CO2: {str(e)}"
        )
    
    # Store the action
    user_action = UserAction(
        user_id=request.user_id,
        action_code=request.action_code,
        co2_kg=co2_kg
    )
    db.add(user_action)
    
    # Update cumulative footprint
    footprint_result = await db.execute(
        select(UserFootprint).where(UserFootprint.user_id == request.user_id)
    )
    footprint = footprint_result.scalar_one_or_none()
    
    if footprint:
        # Update existing footprint
        footprint.cumulative_co2_kg += co2_kg
        cumulative_co2 = footprint.cumulative_co2_kg
    else:
        # Create new footprint record
        footprint = UserFootprint(
            user_id=request.user_id,
            cumulative_co2_kg=co2_kg
        )
        db.add(footprint)
        cumulative_co2 = co2_kg
    
    # Calculate trees planted equivalent
    trees = calculate_trees_planted(cumulative_co2)
    footprint.trees_planted = trees
    
    # Commit all changes
    await db.commit()
    
    return ActionResponse(
        co2_kg=co2_kg,
        cumulative_co2_kg=cumulative_co2,
        trees_planted=trees,
        action_code=request.action_code
    )


@router.get("/history", response_model=dict)
async def get_paginated_history(
    user_id: int = Query(..., description="User ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(5, ge=1, le=50, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get paginated action history for a user.
    """
    # Verify user exists
    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalar_one_or_none():
         raise HTTPException(status_code=404, detail="User not found")

    # Get total count
    count_query = select(func.count(UserAction.id)).where(UserAction.user_id == user_id)
    count_result = await db.execute(count_query)
    total_count = count_result.scalar_one()

    # Get items
    query = (
        select(UserAction)
        .where(UserAction.user_id == user_id)
        .order_by(desc(UserAction.timestamp))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(query)
    actions = result.scalars().all()

    return {
        "items": [
            {
                "id": a.id,
                "action_code": a.action_code,
                "co2_kg": a.co2_kg,
                "timestamp": a.timestamp
            } for a in actions
        ],
        "total": total_count,
        "page": page,
        "limit": limit,
        "pages": (total_count + limit - 1) // limit
    }


@router.get("/action-history")
async def get_action_history(
    user_id: int = Query(..., description="User ID"),
    days: int = Query(30, description="Number of days to retrieve (default: 30)"),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Get user's action history for the past N days.
    Useful for creating charts and graphs of environmental impact over time.
    
    - **user_id**: The user ID to retrieve history for
    - **days**: Number of days to look back (default 30)
    
    Returns list of actions with timestamps and CO2 values.
    """
    # Verify user exists
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Calculate date range
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    # Get user actions in date range
    result = await db.execute(
        select(UserAction)
        .where(
            (UserAction.user_id == user_id) &
            (UserAction.timestamp >= start_date) &
            (UserAction.timestamp <= end_date)
        )
        .order_by(UserAction.timestamp.asc())
    )
    actions = result.scalars().all()
    
    # Get current footprint
    footprint_result = await db.execute(
        select(UserFootprint).where(UserFootprint.user_id == user_id)
    )
    footprint = footprint_result.scalar_one_or_none()
    
    # Format response for charts
    return {
        "user_id": user_id,
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "actions": [
            {
                "id": action.id,
                "action_code": action.action_code,
                "co2_kg": action.co2_kg,
                "timestamp": action.timestamp.isoformat()
            }
            for action in actions
        ],
        "summary": {
            "total_actions": len(actions),
            "total_co2_kg": sum(action.co2_kg for action in actions),
            "cumulative_co2_kg": footprint.cumulative_co2_kg if footprint else 0,
            "trees_planted": footprint.trees_planted if footprint else 0
        }
    }


@router.get("/footprint/{user_id}")
async def get_user_footprint(
    user_id: int,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Get user's current environmental footprint stats.
    
    Returns cumulative CO2 saved and trees planted equivalent.
    """
    # Verify user exists
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get footprint
    footprint_result = await db.execute(
        select(UserFootprint).where(UserFootprint.user_id == user_id)
    )
    footprint = footprint_result.scalar_one_or_none()
    
    if not footprint:
        return {
            "user_id": user_id,
            "cumulative_co2_kg": 0,
            "trees_planted": 0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    
    return {
        "user_id": user_id,
        "cumulative_co2_kg": footprint.cumulative_co2_kg,
        "trees_planted": footprint.trees_planted,
        "updated_at": footprint.updated_at.isoformat()
    }


@router.delete("/action/{action_id}")
async def delete_action(
    action_id: int,
    user_id: int = Query(..., description="User ID to verify ownership"),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Delete a user action and update their footprint.
    
    - **action_id**: The action ID to delete
    - **user_id**: The user ID to verify the action belongs to them
    
    Returns updated footprint stats.
    """
    # Get the action to delete
    result = await db.execute(
        select(UserAction).where(UserAction.id == action_id)
    )
    action = result.scalar_one_or_none()
    
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action not found"
        )
    
    # Verify ownership
    if action.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own actions"
        )
    
    # Get footprint before deletion
    footprint_result = await db.execute(
        select(UserFootprint).where(UserFootprint.user_id == user_id)
    )
    footprint = footprint_result.scalar_one_or_none()
    
    if not footprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User footprint not found"
        )
    
    # Subtract the CO2 from footprint
    footprint.cumulative_co2_kg = max(0, footprint.cumulative_co2_kg - action.co2_kg)
    
    # Recalculate trees
    trees = calculate_trees_planted(footprint.cumulative_co2_kg)
    footprint.trees_planted = trees
    
    # Delete the action
    await db.delete(action)
    
    # Commit changes
    await db.commit()
    
    return {
        "user_id": user_id,
        "action_deleted": {
            "id": action.id,
            "action_code": action.action_code,
            "co2_kg": action.co2_kg
        },
        "cumulative_co2_kg": footprint.cumulative_co2_kg,
        "trees_planted": footprint.trees_planted,
        "updated_at": footprint.updated_at.isoformat()
    }
