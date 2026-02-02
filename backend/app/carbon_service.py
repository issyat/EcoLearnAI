"""Service for calculating carbon footprint using Climatiq API."""
from typing import Any

import httpx

from .config import get_settings


class CarbonServiceError(Exception):
    """Raised when carbon calculation fails."""
    pass


# Action code to Climatiq activity mapping
# Only using activity IDs that have been verified to work with the Climatiq API
ACTION_TO_ACTIVITY = {
    "recycle_plastic": {
        "activity_id": "electricity-supply_grid-source_production_mix",
        "parameters": {"energy": 0.05, "energy_unit": "kWh"}  # Energy to recycle plastic
    },
    "recycle_paper": {
        "activity_id": "electricity-supply_grid-source_production_mix",
        "parameters": {"energy": 0.03, "energy_unit": "kWh"}  # Energy to recycle paper
    },
    "public_transport": {
        "activity_id": "electricity-supply_grid-source_production_mix",
        "parameters": {"energy": 0.2, "energy_unit": "kWh"}  # Energy for bus trip
    },
    "bike_commute": {
        "activity_id": "electricity-supply_grid-source_production_mix",
        "parameters": {"energy": 0.1, "energy_unit": "kWh"}  # Energy for bike trip
    },
    "plant_tree": {
        "activity_id": "electricity-supply_grid-source_production_mix",
        "parameters": {"energy": 0.4, "energy_unit": "kWh"}  # Energy for tree planting
    },
    "reduce_meat": {
        # Skip beef for this one - use chicken instead (lighter impact)
        "activity_id": "food-type_chicken",
        "parameters": {"weight": 1, "weight_unit": "kg"}
    },
    "led_bulb": {
        "activity_id": "electricity-supply_grid-source_production_mix",
        "parameters": {"energy": 0.08, "energy_unit": "kWh"}  # Energy savings
    },
    "reusable_bag": {
        # Use pork for variety (different food type)
        "activity_id": "food-type_pork",
        "parameters": {"weight": 0.5, "weight_unit": "kg"}  # Half kg equivalent
    }
}


def get_activity_mapping(action_code: str) -> dict[str, Any]:
    """
    Get Climatiq activity mapping for an action code.
    
    Args:
        action_code: The action code to map
        
    Returns:
        Dictionary with activity_id and parameters
        
    Raises:
        CarbonServiceError: If action_code is not recognized
    """
    if action_code not in ACTION_TO_ACTIVITY:
        raise CarbonServiceError(f"Unknown action code: {action_code}")
    
    return ACTION_TO_ACTIVITY[action_code]


async def calculate_action_co2(action_code: str) -> float:
    """
    Calculate CO2 impact using Climatiq API.
    
    Args:
        action_code: The action code to calculate CO2 for
        
    Returns:
        CO2 impact in kilograms
        
    Raises:
        CarbonServiceError: If calculation fails
    """
    settings = get_settings()
    
    if not settings.climatiq_api_key:
        raise CarbonServiceError("Climatiq API key not configured")
    
    # Get activity mapping
    try:
        mapping = get_activity_mapping(action_code)
    except CarbonServiceError:
        # For unknown actions, return a default estimate
        return 1.0  # 1kg CO2 default
    
    headers = {
        "Authorization": f"Bearer {settings.climatiq_api_key}",
        "Content-Type": "application/json"
    }
    
    # Build Climatiq API request
    payload = {
        "emission_factor": {
            "activity_id": mapping["activity_id"],
            "data_version": "^3"  # Latest data version
        },
        "parameters": mapping["parameters"]
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Log the request for debugging
            print(f"DEBUG: Sending to {settings.climatiq_api_url}")
            print(f"DEBUG: Headers: {headers}")
            print(f"DEBUG: Payload: {payload}")
            
            response = await client.post(
                settings.climatiq_api_url,
                headers=headers,
                json=payload
            )
            
            # Log response for debugging
            print(f"DEBUG: Response status: {response.status_code}")
            print(f"DEBUG: Response body: {response.text}")
            
            response.raise_for_status()
            
            data = response.json()
            
            # Extract CO2e (CO2 equivalent) from response
            if "co2e" in data:
                co2_kg = data["co2e"]
                
                # For actions that reduce emissions, ensure positive value
                if isinstance(co2_kg, (int, float)):
                    return abs(float(co2_kg))
                else:
                    raise CarbonServiceError("Invalid CO2 value in response")
            else:
                raise CarbonServiceError("No CO2 data in Climatiq response")
                
    except httpx.HTTPStatusError as e:
        error_detail = e.response.text if e.response.text else "No error details"
        print(f"DEBUG: HTTP Error - {e.response.status_code}: {error_detail}")
        raise CarbonServiceError(
            f"Climatiq API error: {e.response.status_code} - {error_detail}"
        )
    except httpx.RequestError as e:
        raise CarbonServiceError(f"Climatiq API connection error: {str(e)}")
    except (KeyError, TypeError, ValueError) as e:
        raise CarbonServiceError(f"Failed to parse Climatiq response: {str(e)}")


def calculate_trees_planted(co2_kg: float) -> float:
    """
    Calculate equivalent trees planted based on CO2 saved.
    
    Args:
        co2_kg: CO2 saved in kilograms
        
    Returns:
        Equivalent number of trees
    """
    settings = get_settings()
    return co2_kg / settings.kg_co2_per_tree
