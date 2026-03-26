import math
from typing import Any, Dict

import requests


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_earth_km = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_earth_km * c


def _fallback_route(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> Dict[str, Any]:
    distance = haversine_km(start_lat, start_lng, end_lat, end_lng)
    estimated_minutes = max(2, int((distance / 30) * 60))
    return {
        "distance_km": round(distance, 2),
        "duration_min": estimated_minutes,
        "geometry": [[start_lat, start_lng], [end_lat, end_lng]],
        "source": "fallback",
    }


def build_route_response(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> Dict[str, Any]:
    url = (
        "https://router.project-osrm.org/route/v1/driving/"
        f"{start_lng},{start_lat};{end_lng},{end_lat}"
        "?overview=full&geometries=geojson&alternatives=true"
    )

    try:
        response = requests.get(url, timeout=4)
        response.raise_for_status()
        payload = response.json()
        routes = payload.get("routes", [])
        if not routes:
            return _fallback_route(start_lat, start_lng, end_lat, end_lng)

        best = routes[0]
        geometry = [[coord[1], coord[0]] for coord in best["geometry"]["coordinates"]]
        alternatives = []
        for route in routes[1:3]:
            alternatives.append(
                {
                    "distance_km": round(route["distance"] / 1000, 2),
                    "duration_min": int(route["duration"] / 60),
                }
            )

        return {
            "distance_km": round(best["distance"] / 1000, 2),
            "duration_min": int(best["duration"] / 60),
            "geometry": geometry,
            "alternatives": alternatives,
            "source": "osrm",
        }
    except (requests.RequestException, ValueError, KeyError):
        return _fallback_route(start_lat, start_lng, end_lat, end_lng)
