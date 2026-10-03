from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime
from datetime import datetime, timezone
from app.db.connection import Base


class WarehouseNode(Base):
    __tablename__ = "warehouse_nodes"

    node_id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    city = Column(String(50), nullable=False)
    node_type = Column(String(50), nullable=False)  # port, regional_hub, depot
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    storage_capacity_m3 = Column(Float, nullable=False, default=10000.0)
    current_utilization_pct = Column(Float, nullable=False, default=65.0)
    handling_rate_units_hr = Column(Integer, nullable=False, default=1200)
    operating_cost_per_hr = Column(Float, nullable=False, default=150.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class FleetVehicle(Base):
    __tablename__ = "fleet_vehicles"

    vehicle_id = Column(String(50), primary_key=True, index=True)
    plate_number = Column(String(30), nullable=False)
    vehicle_type = Column(String(50), nullable=False)
    max_payload_kg = Column(Float, nullable=False, default=16000.0)
    max_volume_m3 = Column(Float, nullable=False, default=60.0)
    current_latitude = Column(Float, nullable=False)
    current_longitude = Column(Float, nullable=False)
    status = Column(String(30), nullable=False, default="idle")  # idle, transit, maintenance
    battery_fuel_soc_pct = Column(Float, nullable=False, default=100.0)
    cost_per_km = Column(Float, nullable=False, default=2.4)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class HSCodeItem(Base):
    __tablename__ = "hs_code_items"

    hs_code = Column(String(20), primary_key=True, index=True)
    description = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    tariff_rate_pct = Column(Float, nullable=False, default=7.5)
    regulatory_restrictions = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
