import logging
import math
import random
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.db.connection import Base, db_manager
from app.db.models import (
    WarehouseNode,
    FleetVehicle,
    HSCodeItem,
    InventorySKU,
    HistoricalDailySale,
    ExogenousIndicator
)

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

INITIAL_SKUS = [
    {
        "sku_id": "SKU-NAS-AGRI-01",
        "name": "Nashik Organic Agricultural Feeds",
        "category": "Agriculture",
        "default_warehouse_id": "WH-NSK-01",
        "unit_price_inr": 420.0,
        "holding_cost_per_day": 1.25,
        "base_daily_demand": 450.0,
        "lead_time_days": 4,
        "service_level_target": 0.95,
        "current_stock": 3200
    },
    {
        "sku_id": "SKU-JNPT-ELEC-01",
        "name": "JNPT Semiconductor & Electronic Components",
        "category": "Electronics",
        "default_warehouse_id": "PORT-JNPT-01",
        "unit_price_inr": 12500.0,
        "holding_cost_per_day": 8.50,
        "base_daily_demand": 280.0,
        "lead_time_days": 6,
        "service_level_target": 0.98,
        "current_stock": 1850
    },
    {
        "sku_id": "SKU-PUN-AUTO-01",
        "name": "Pune High-Precision Auto Assemblies",
        "category": "Automotive",
        "default_warehouse_id": "WH-PUN-01",
        "unit_price_inr": 4800.0,
        "holding_cost_per_day": 4.20,
        "base_daily_demand": 340.0,
        "lead_time_days": 5,
        "service_level_target": 0.95,
        "current_stock": 2400
    },
    {
        "sku_id": "SKU-MUM-PHARM-01",
        "name": "Mumbai Critical Cold-Chain Vaccines",
        "category": "Pharmaceuticals",
        "default_warehouse_id": "WH-MUM-01",
        "unit_price_inr": 820.0,
        "holding_cost_per_day": 3.80,
        "base_daily_demand": 520.0,
        "lead_time_days": 3,
        "service_level_target": 0.99,
        "current_stock": 4100
    },
    {
        "sku_id": "SKU-THN-CHEM-01",
        "name": "Thane Industrial Specialty Polymers",
        "category": "Chemicals",
        "default_warehouse_id": "WH-THN-01",
        "unit_price_inr": 950.0,
        "holding_cost_per_day": 2.10,
        "base_daily_demand": 310.0,
        "lead_time_days": 4,
        "service_level_target": 0.95,
        "current_stock": 2600
    }
]


def generate_seed_historical_sales(skus: List[Dict[str, Any]], days: int = 90) -> List[Dict[str, Any]]:
    """
    Generate realistic Western India corridor daily historical sales.
    Includes day-of-week seasonality, occasional promo discounts, and monsoon weather anomaly features.
    """
    random.seed(42)  # Deterministic seed for reproducible testing
    records = []
    base_date = datetime.now(timezone.utc).date() - timedelta(days=days)

    for i in range(days):
        current_date = base_date + timedelta(days=i)
        date_str = current_date.isoformat()
        weekday = current_date.weekday()  # 0=Monday, 6=Sunday

        # Exogenous indicators
        # Monsoon season simulation in Western India (cyclical)
        monsoon_factor = 1.0 + 0.3 * math.sin(i / 15.0)
        is_rainy = random.random() < 0.25
        weather_cond = "Monsoon Rain" if is_rainy else ("Cloudy" if random.random() < 0.3 else "Clear")
        precipitation = round(random.uniform(15.0, 65.0), 1) if is_rainy else 0.0
        temperature = round(24.0 + random.uniform(0, 10) - (4.0 if is_rainy else 0.0), 1)

        # Promotional campaigns occur periodically
        promo_active = (i % 21 in [0, 1, 2, 3])

        for sku in skus:
            base = sku["base_daily_demand"]
            # Day-of-week factor: Tuesday-Thursday peaks (+15%), Sunday lower (-20%)
            dow_multiplier = 0.80 if weekday == 6 else (1.15 if weekday in [1, 2, 3] else 1.0)
            
            promo_discount = round(random.choice([10.0, 15.0, 20.0, 25.0]), 1) if promo_active else 0.0
            promo_boost = 1.0 + (promo_discount * 0.015)  # Elasticity uplift

            # Weather impact: Agri feeds surge during rain, electronics slight drop
            if sku["category"] == "Agriculture":
                weather_multiplier = 1.12 if is_rainy else 1.0
            elif sku["category"] == "Electronics":
                weather_multiplier = 0.92 if is_rainy else 1.0
            else:
                weather_multiplier = 1.0

            noise = random.gauss(0, base * 0.05)
            quantity = int(round(base * dow_multiplier * promo_boost * weather_multiplier + noise))
            quantity = max(10, quantity)

            records.append({
                "date": date_str,
                "sku_id": sku["sku_id"],
                "warehouse_id": sku["default_warehouse_id"],
                "quantity_sold": quantity,
                "promo_discount_pct": promo_discount,
                "weather_condition": weather_cond,
                "precipitation_mm": precipitation,
                "temperature_c": temperature,
                "stockout_flag": False
            })

    return records


def generate_seed_exogenous_indicators(days: int = 90) -> List[Dict[str, Any]]:
    """Generate Western India corridor macro and climate indicators."""
    random.seed(42)
    indicators = []
    base_date = datetime.now(timezone.utc).date() - timedelta(days=days)

    for i in range(days):
        current_date = base_date + timedelta(days=i)
        date_str = current_date.isoformat()
        is_promo = (i % 21 in [0, 1, 2, 3])
        monsoon_score = round(1.0 + 0.4 * abs(math.sin(i / 12.0)), 2)
        fuel_index = round(100.0 + 3.0 * math.sin(i / 20.0) + random.uniform(-0.5, 0.5), 1)

        indicators.append({
            "date": date_str,
            "region": "Western India Corridor (Mumbai-JNPT-Nashik-Pune)",
            "monsoon_severity_score": monsoon_score,
            "fuel_price_index": fuel_index,
            "promo_campaign_active": is_promo,
            "notes": "Western Ghats transit active; seasonal weather monitored."
        })

    return indicators


# Cached fallback fixtures accessible in memory
FALLBACK_SKUS = INITIAL_SKUS
FALLBACK_HISTORICAL_SALES = generate_seed_historical_sales(INITIAL_SKUS, days=90)
FALLBACK_EXOGENOUS = generate_seed_exogenous_indicators(days=90)


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

        if db.query(InventorySKU).first() is None:
            logger.info("Seeding inventory SKU master catalog...")
            for sku_data in INITIAL_SKUS:
                db.add(InventorySKU(**sku_data))

        if db.query(HistoricalDailySale).first() is None:
            logger.info("Seeding historical daily sales series...")
            for sale_data in FALLBACK_HISTORICAL_SALES:
                db.add(HistoricalDailySale(**sale_data))

        if db.query(ExogenousIndicator).first() is None:
            logger.info("Seeding exogenous corridor indicators...")
            for exo_data in FALLBACK_EXOGENOUS:
                db.add(ExogenousIndicator(**exo_data))

        db.commit()
        logger.info("Seed data successfully committed.")
    except Exception as e:
        db.rollback()
        logger.error("Failed to seed initial data: %s", str(e))
    finally:
        if owns_session:
            db.close()
