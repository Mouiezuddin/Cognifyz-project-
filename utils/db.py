import os
import sqlite3

DB_PATH = os.path.join("database", "app.db")

SAMPLE_PLACES = [
    ("Green Basket Grocery", "shop", 28.6139, 77.2090, "Connaught Place, New Delhi", "+91-11-40001111", 4.2, "07:00-22:00", "Fresh groceries and essentials.", "https://images.unsplash.com/photo-1542838132-92c53300491e"),
    ("City Care Hospital", "hospital", 28.6165, 77.2150, "Mandi House, New Delhi", "+91-11-45002222", 4.4, "24 Hours", "Multi-speciality healthcare center.", "https://images.unsplash.com/photo-1538108149393-fbbd81895907"),
    ("Sunrise Pharmacy", "pharmacy", 28.6120, 77.2210, "Barakhamba Road, New Delhi", "+91-11-40112233", 4.1, "08:00-23:00", "Prescription medicines and health products.", "https://images.unsplash.com/photo-1587854692152-cbe660dbde88"),
    ("Maple International School", "school", 28.6200, 77.2050, "Janpath, New Delhi", "+91-11-40778899", 4.3, "08:00-16:00", "Primary and secondary education campus.", "https://images.unsplash.com/photo-1588072432836-e10032774350"),
    ("Taste Trail Cafe", "restaurant", 28.6110, 77.2078, "Bengali Market, New Delhi", "+91-11-49001234", 4.5, "09:00-23:30", "Cafe with continental and Indian fusion food.", "https://images.unsplash.com/photo-1555396273-367ea4eb4db5"),
    ("Blue Horizon Hotel", "hotel", 28.6182, 77.2123, "Tolstoy Marg, New Delhi", "+91-11-45554444", 4.0, "24 Hours", "Business-friendly hotel with premium rooms.", "https://images.unsplash.com/photo-1566073771259-6a8506099945"),
    ("QuickFuel Station", "petrol_pump", 28.6095, 77.2145, "Copernicus Marg, New Delhi", "+91-11-42226611", 3.9, "24 Hours", "Fuel station with EV charging support.", "https://images.unsplash.com/photo-1558403194-611308249627"),
    ("National Bank ATM", "atm", 28.6147, 77.2168, "KG Marg, New Delhi", "+91-11-48889900", 4.0, "24 Hours", "Cash withdrawal and mini statement ATM.", "https://images.unsplash.com/photo-1579621970795-87facc2f976d"),
]


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    os.makedirs("database", exist_ok=True)

    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS places (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                address TEXT,
                contact TEXT,
                rating REAL,
                opening_hours TEXT,
                description TEXT,
                image_url TEXT
            )
            """
        )

        existing_rows = cursor.execute("SELECT COUNT(*) FROM places").fetchone()[0]
        if existing_rows == 0:
            cursor.executemany(
                """
                INSERT INTO places
                (name, category, latitude, longitude, address, contact, rating, opening_hours, description, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                SAMPLE_PLACES,
            )
        connection.commit()
