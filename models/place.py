from dataclasses import dataclass


@dataclass
class Place:
    id: int
    name: str
    category: str
    latitude: float
    longitude: float
    address: str
    contact: str
    rating: float
    opening_hours: str
    description: str
    image_url: str
