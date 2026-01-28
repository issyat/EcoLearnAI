"""Carbon tracking endpoints for recording user actions."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
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
