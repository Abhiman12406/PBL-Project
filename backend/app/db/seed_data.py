import logging
from sqlalchemy.orm import Session
from app.db.connection import Base, db_manager
from app.db.models import WarehouseNode, FleetVehicle, HSCodeItem

logger = logging.getLogger(__name__)

WESTERN_INDIA_NODES = [
    {
        "node_id": "PORT-JNPT-01",
        "name": "Jawaharlal Nehru Port Trust (JNPT)",
        "city": "Navi Mumbai",
        "node_type": "port",
        "latitude": 18.9496,
        "longitude": 72.9515,
        "storage_capacity_m3": 500000.0,
        "current_utilization_pct": 82.5,
        "handling_rate_units_hr": 4500,
        "operating_cost_per_hr": 850.0
    },
    {
        "node_id": "WH-MUM-01",
        "name": "Mumbai Central Logistics Park",
        "city": "Mumbai",
        "node_type": "regional_hub",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "storage_capacity_m3": 120000.0,
        "current_utilization_pct": 74.0,
        "handling_rate_units_hr": 2200,
        "operating_cost_per_hr": 350.0
    },
    {
        "node_id": "WH-THN-01",
        "name": "Thane Inland Freight Hub",
        "city": "Thane",
        "node_type": "depot",
        "latitude": 19.2183,
        "longitude": 72.9781,
        "storage_capacity_m3": 85000.0,
        "current_utilization_pct": 68.0,
        "handling_rate_units_hr": 1600,
        "operating_cost_per_hr": 240.0
    },
    {
        "node_id": "WH-NSK-01",
        "name": "Nashik Agro & Industrial Depot",
        "city": "Nashik",
        "node_type": "depot",
        "latitude": 19.9975,
        "longitude": 73.7898,
        "storage_capacity_m3": 95000.0,
        "current_utilization_pct": 61.5,
        "handling_rate_units_hr": 1400,
        "operating_cost_per_hr": 210.0
    },
    {
        "node_id": "WH-PUN-01",
        "name": "Pune Auto-Corridor Fulfillment Center",
        "city": "Pune",
        "node_type": "fulfillment_center",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "storage_capacity_m3": 150000.0,
        "current_utilization_pct": 79.0,
        "handling_rate_units_hr": 2800,
        "operating_cost_per_hr": 380.0
    }
]

INITIAL_FLEET = [
    {
        "vehicle_id": "TRK-MH-01",
        "plate_number": "MH-04-AZ-2041",
        "vehicle_type": "Electric Heavy Hauler 24T",
        "max_payload_kg": 24000.0,
        "max_volume_m3": 75.0,
        "current_latitude": 18.9496,
        "current_longitude": 72.9515,
        "status": "transit",
        "battery_fuel_soc_pct": 88.0,
        "cost_per_km": 1.95
    },
    {
        "vehicle_id": "TRK-MH-02",
        "plate_number": "MH-12-BQ-8812",
        "vehicle_type": "Refrigerated Multi-Axle 18T",
        "max_payload_kg": 18000.0,
        "max_volume_m3": 55.0,
        "current_latitude": 19.0760,
        "current_longitude": 72.8777,
        "status": "idle",
        "battery_fuel_soc_pct": 95.0,
        "cost_per_km": 2.45
    },
    {
        "vehicle_id": "TRK-MH-03",
        "plate_number": "MH-15-DX-3390",
        "vehicle_type": "Container Carrier 32T",
        "max_payload_kg": 32000.0,
        "max_volume_m3": 90.0,
        "current_latitude": 19.9975,
        "current_longitude": 73.7898,
        "status": "loading",
        "battery_fuel_soc_pct": 76.0,
        "cost_per_km": 2.80
    }
]

INITIAL_HS_CODES = [
    {
        "hs_code": "8504.40",
        "description": "Static converters, power supply units and inverters",
        "category": "Electronics & Electrical Machinery",
        "tariff_rate_pct": 7.5,
        "regulatory_restrictions": "BIS certification required for import into India"
    },
    {
        "hs_code": "8471.30",
        "description": "Portable automatic data processing machines (Laptops/Tablets)",
        "category": "Information Technology",
        "tariff_rate_pct": 0.0,
        "regulatory_restrictions": "Import restricted; Directorate General of Foreign Trade (DGFT) license"
    },
    {
        "hs_code": "3004.90",
        "description": "Medicaments consisting of mixed or unmixed products for therapeutic uses",
        "category": "Pharmaceuticals",
        "tariff_rate_pct": 10.0,
        "regulatory_restrictions": "Cold chain temperature logs & CDSCO approval required"
    },
    {
        "hs_code": "8708.29",
        "description": "Parts and accessories of the motor vehicles (Bodies and components)",
        "category": "Automotive",
        "tariff_rate_pct": 15.0,
        "regulatory_restrictions": "Country of Origin Certificate (COO) and standard inspection"
    }
]


def seed_initial_data(db: Session = None):
    """Seed Western India corridor data into relational store."""
    engine = db_manager.engine
    Base.metadata.create_all(bind=engine)

    owns_session = False
    if db is None:
        db = db_manager.session_maker()
        owns_session = True

    try:
        # Check if already seeded
        if db.query(WarehouseNode).first() is None:
            logger.info("Seeding Western India corridor warehouse nodes...")
            for node_data in WESTERN_INDIA_NODES:
                db.add(WarehouseNode(**node_data))

        if db.query(FleetVehicle).first() is None:
            logger.info("Seeding initial fleet vehicles...")
            for v_data in INITIAL_FLEET:
                db.add(FleetVehicle(**v_data))

        if db.query(HSCodeItem).first() is None:
            logger.info("Seeding HS code master items...")
            for hs_data in INITIAL_HS_CODES:
                db.add(HSCodeItem(**hs_data))

        db.commit()
        logger.info("Seed data successfully committed.")
    except Exception as e:
        db.rollback()
        logger.error("Failed to seed initial data: %s", str(e))
    finally:
        if owns_session:
            db.close()
