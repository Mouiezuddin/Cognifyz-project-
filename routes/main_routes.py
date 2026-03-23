from flask import Blueprint, jsonify, render_template, request

from utils.geo import build_route_response, haversine_km
from utils.db import get_connection

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    return render_template("index.html")


@main_bp.route("/details/<int:place_id>")
def details(place_id: int):
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM places WHERE id = ?", (place_id,)).fetchone()
    if row is None:
        return render_template("details.html", place=None), 404
    return render_template("details.html", place=dict(row))


@main_bp.route("/api/places")
def get_places():
    category = request.args.get("category", "all")
    user_lat = request.args.get("lat", type=float)
    user_lng = request.args.get("lng", type=float)

    query = "SELECT * FROM places"
    params = []
    if category and category != "all":
        query += " WHERE category = ?"
        params.append(category)

    with get_connection() as connection:
        rows = [dict(row) for row in connection.execute(query, params).fetchall()]

    if user_lat is not None and user_lng is not None:
        for place in rows:
            place["distance_km"] = round(
                haversine_km(user_lat, user_lng, place["latitude"], place["longitude"]),
                2,
            )
        rows.sort(key=lambda x: x["distance_km"])

    return jsonify(rows)


@main_bp.route("/api/stats")
def get_stats():
    user_lat = request.args.get("lat", type=float)
    user_lng = request.args.get("lng", type=float)

    with get_connection() as connection:
        rows = [dict(row) for row in connection.execute("SELECT * FROM places").fetchall()]

    if user_lat is None or user_lng is None:
        return jsonify({"shortest": None, "longest": None, "total": len(rows)})

    distances = [haversine_km(user_lat, user_lng, row["latitude"], row["longitude"]) for row in rows]
    return jsonify(
        {
            "shortest": round(min(distances), 2),
            "longest": round(max(distances), 2),
            "total": len(rows),
        }
    )


@main_bp.route("/api/route")
def get_route():
    start_lat = request.args.get("start_lat", type=float)
    start_lng = request.args.get("start_lng", type=float)
    end_lat = request.args.get("end_lat", type=float)
    end_lng = request.args.get("end_lng", type=float)

    if None in [start_lat, start_lng, end_lat, end_lng]:
        return jsonify({"error": "Missing route coordinates."}), 400

    response = build_route_response(start_lat, start_lng, end_lat, end_lng)
    return jsonify(response)
