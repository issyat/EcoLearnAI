"""Service for calculating carbon footprint using Climatiq API."""
from typing import Any

import httpx

from .config import get_settings


class CarbonServiceError(Exception):
    """Raised when carbon calculation fails."""
    pass


# Action code to Climatiq activity mapping
ACTION_TO_ACTIVITY = {
    "recycle_plastic": {
        "activity_id": "waste_type-plastic-disposal_method-recycled",
        "parameters": {"weight": 1, "weight_unit": "kg"}
    },
    "recycle_paper": {
        "activity_id": "waste_type-paper-disposal_method-recycled",
        "parameters": {"weight": 1, "weight_unit": "kg"}
    },
    "public_transport": {
        "activity_id": "passenger_vehicle-vehicle_type_bus-fuel_source_diesel",
        "parameters": {"distance": 10, "distance_unit": "km"}
    },
    "bike_commute": {
        "activity_id": "passenger_vehicle-vehicle_type_bicycle",
        "parameters": {"distance": 10, "distance_unit": "km"}
    },
    "plant_tree": {
        "activity_id": "forestry-type_tree_planting",
        "parameters": {"number": 1}
    },
    "reduce_meat": {
        "activity_id": "consumer_goods-type_food-food_type_beef",
        "parameters": {"weight": 1, "weight_unit": "kg", "reduction": True}
    },
    "led_bulb": {
        "activity_id": "electricity-energy_source_grid_mix",
        "parameters": {"energy": 0.06, "energy_unit": "kWh"}  # Savings vs incandescent
    },
    "reusable_bag": {
        "activity_id": "waste_type-plastic-disposal_method-landfilled",
        "parameters": {"weight": 0.008, "weight_unit": "kg"}  # Average plastic bag
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
            "data_version": "^1"
        },
        "parameters": mapping["parameters"]
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.climatiq_api_url,
                headers=headers,
                json=payload
            )
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
        raise CarbonServiceError(
            f"Climatiq API error: {e.response.status_code}"
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
