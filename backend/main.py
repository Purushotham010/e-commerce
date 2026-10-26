import os
import time
import logging
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ecommerce-backend")

# Read database connection parameters from environment variables
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres123")
DB_HOST = os.getenv("POSTGRES_HOST", "db")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "ecommerce_db")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Setup SQLAlchemy with retry mechanism for container readiness
engine = None
SessionLocal = None
Base = declarative_base()

class ProductModel(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    price = Column(Float, nullable=False)
    rating = Column(Float, default=4.8)
    image_url = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    stock = Column(Integer, default=50)

class OrderModel(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(150), nullable=False)
    customer_email = Column(String(150), nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(String(50), default="Confirmed")
    items_summary = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db(max_retries=15, delay=2):
    global engine, SessionLocal
    retries = 0
    while retries < max_retries:
        try:
            logger.info(f"Connecting to PostgreSQL at {DB_HOST}:{DB_PORT} (attempt {retries+1}/{max_retries})...")
            engine = create_engine(DATABASE_URL, pool_pre_ping=True)
            Base.metadata.create_all(bind=engine)
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            logger.info("Database connected and tables initialized successfully!")
            seed_initial_data()
            return
        except Exception as e:
            retries += 1
            logger.warning(f"Database not ready yet ({e}). Retrying in {delay}s...")
            time.sleep(delay)
    logger.error("Failed to connect to the database after retries.")

def seed_initial_data():
    db = SessionLocal()
    try:
        sample_products = [
            (
                "Aura ANC Pro Wireless Headphones",
                "Audio",
                14999.00,
                4.9,
                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
                "Studio-grade acoustic architecture with adaptive hybrid active noise cancellation.",
                25
            ),
            (
                "Vanguard Titanium Smartwatch",
                "Wearables",
                24999.00,
                4.8,
                "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
                "Aerospace-grade titanium chassis, always-on OLED sapphire screen, 7-day battery.",
                18
            ),
            (
                "HyperShift Mechanical Keyboard",
                "Peripherals",
                8499.00,
                4.7,
                "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80",
                "Gasket-mounted hot-swappable switches, PBT double-shot keycaps, RGB backlighting.",
                30
            ),
            (
                "Lumix Minimalist Desk Lamp",
                "Lifestyle",
                2999.00,
                4.6,
                "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80",
                "Wireless Qi charging base with adjustable circadian color temperatures.",
                40
            ),
            (
                "Apex Precision Wireless Mouse",
                "Peripherals",
                4999.00,
                4.9,
                "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80",
                "Ultra-lightweight 58g design, optical sensors with zero wireless latency.",
                22
            ),
            (
                "Zenith 4K HDR Portable Monitor",
                "Display",
                18999.00,
                4.7,
                "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80",
                "15.6-inch Ultra-HD IPS panel with USB-C single-cable power and display delivery.",
                15
            )
        ]

        existing = db.query(ProductModel).all()
        if not existing:
            logger.info("Seeding initial e-commerce catalog in INR...")
            for title, cat, price, rating, img, desc, stock in sample_products:
                db.add(ProductModel(
                    title=title, category=cat, price=price, rating=rating,
                    image_url=img, description=desc, stock=stock
                ))
            db.commit()
            logger.info("Seeded 6 high-tier products with INR pricing.")
        else:
            # Update existing records to INR currency if they had previous dollar values
            for p in existing:
                match = next((item for item in sample_products if item[0] == p.title), None)
                if match:
                    p.price = match[2]
            db.commit()
            logger.info("Updated existing products to INR prices.")
    finally:
        db.close()

# Pydantic Schemas
class ProductSchema(BaseModel):
    id: int
    title: str
    category: str
    price: float
    rating: float
    image_url: str
    description: str
    stock: int

    class Config:
        from_attributes = True

class OrderCreateSchema(BaseModel):
    customer_name: str
    customer_email: str
    items_summary: str
    total_amount: float

class OrderResponseSchema(BaseModel):
    id: int
    customer_name: str
    customer_email: str
    items_summary: str
    total_amount: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# FastAPI Application
app = FastAPI(
    title="E-Commerce API",
    description="FastAPI Backend for Cloud E-Commerce Platform",
    version="1.0.0"
)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="Database not initialized yet")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "fastapi-backend",
        "database": "postgresql",
        "currency": "INR (₹)",
        "db_host": DB_HOST,
        "db_port": DB_PORT,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/architecture")
def architecture_info():
    return {
        "project": "E-Commerce Cloud Architecture",
        "network_security": {
            "public_port": "80 (Nginx Reverse Proxy & React UI)",
            "private_ports": [
                {"service": "FastAPI Backend", "port": 8000, "access": "Internal Docker Network Only"},
                {"service": "PostgreSQL Database", "port": 5432, "access": "Internal Docker Network Only"}
            ]
        },
        "docker_compose_services": ["frontend", "backend", "db"]
    }

@app.get("/api/products", response_model=List[ProductSchema])
def list_products(db: Session = Depends(get_db)):
    return db.query(ProductModel).order_by(ProductModel.id.asc()).all()

@app.get("/api/products/{product_id}", response_model=ProductSchema)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.post("/api/orders", response_model=OrderResponseSchema)
def create_order(payload: OrderCreateSchema, db: Session = Depends(get_db)):
    new_order = OrderModel(
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        items_summary=payload.items_summary,
        total_amount=payload.total_amount,
        status="Confirmed",
        created_at=datetime.utcnow()
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return new_order

@app.get("/api/orders", response_model=List[OrderResponseSchema])
def list_orders(db: Session = Depends(get_db)):
    return db.query(OrderModel).order_by(OrderModel.id.desc()).all()
