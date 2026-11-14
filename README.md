# Project 3: E-Commerce Cloud Platform (React + FastAPI + PostgreSQL)

**Assignment Part:** Part 1 - Python + React (Q1-20)  
**Tools:** Docker, Docker Compose, Docker Host (AWS EC2)  
**Database:** PostgreSQL 15  

---

## 1. Scenario & Objectives
> **Scenario:** A shop website must go live. Your task: Dockerize React, FastAPI and PostgreSQL, run them on an Ubuntu server, and list which ports are open (80) and which stay private.

This project delivers an enterprise-grade cloud e-commerce platform with microservice containerization, Nginx reverse proxy routing, and isolated network security.

---

## 2. Port Architecture: Public vs. Private Ports

To satisfy the scenario requirement (*"list which ports are open (80) and which stay private"*), the network architecture strictly isolates internal services:

| Container Service | Internal Container Port | Host / EC2 Public Port | Visibility | Security Role |
| :--- | :--- | :--- | :--- | :--- |
| **`frontend` (Nginx + React)** | `80` | **`80:80` (HTTP)** | **OPEN (Public)** | Sole public entry point. Serves React UI & proxies `/api/` to FastAPI. |
| **`backend` (FastAPI)** | `8000` | *None (Not published)* | **PRIVATE (Internal)** | Accessible strictly inside `ecommerce-net` bridge network via service name `backend`. |
| **`db` (PostgreSQL)** | `5432` | *None (Not published)* | **PRIVATE (Internal)** | Accessible strictly inside `ecommerce-net` via service name `db`. Zero public exposure. |

### Why this satisfies production best practices:
1. **Attack Surface Minimization:** Direct attacks against database credentials, SQL injection on port 5432, or unauthenticated FastAPI documentation endpoints are blocked from the internet.
2. **Reverse Proxying:** Nginx acts as a unified facade. Browsers connect on standard HTTP port `80`. Nginx routes `/` to the React build and transparently forwards `/api/*` to `http://backend:8000/api/*`.

---

## 3. Architecture Diagram

```
[ Browser / Internet User ]
           │
           │ (HTTP Traffic on Public Port 80)
           ▼
┌──────────────────────────────────────────────────────────────┐
│ AWS EC2 Ubuntu Server / Docker Host                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ frontend Container (Nginx :80) [PUBLIC PORT 80]       │  │
│  │  - Serves compiled React SPA                          │  │
│  │  - Proxies /api/ requests internally                  │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                           │                                  │
│             Internal Docker Network: ecommerce-net           │
│                           │                                  │
│            ┌──────────────┴──────────────┐                   │
│            ▼                             ▼                   │
│  ┌────────────────────┐        ┌───────────────────────┐    │
│  │ backend Container  │        │ db Container          │    │
│  │ (FastAPI :8000)    │◄──────►│ (PostgreSQL :5432)    │    │
│  │ [PRIVATE PORT]     │  SQL   │ [PRIVATE PORT]        │    │
│  └────────────────────┘        └───────────┬───────────┘    │
│                                            │                 │
│                                 ┌──────────▼───────────┐    │
│                                 │ Named Volume: pgdata │    │
│                                 └──────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. How to Run Locally

### Step 1: Start the Entire Stack
From the `project_3_ecommerce` folder:
```bash
docker compose up --build -d
```

### Step 2: Verify Running Containers
```bash
docker compose ps
```
You should see:
- `ecommerce_frontend` listening on `0.0.0.0:80->80/tcp`
- `ecommerce_backend` on internal port `8000/tcp`
- `ecommerce_postgres` on internal port `5432/tcp`

### Step 3: Open in Browser
Open your browser and navigate to:
```
http://localhost/
```

### Step 4: Verify via CLI
```bash
# Test backend health via Nginx proxy
curl -i http://localhost/api/health

# Fetch catalog products from PostgreSQL
curl -i http://localhost/api/products

# Test architecture endpoint
curl -i http://localhost/api/architecture
```

---

## 5. Deployment on AWS EC2 (Ubuntu)

Follow these steps to deploy on AWS:

### Step 1: Launch EC2 Instance
1. In the AWS Management Console, navigate to **EC2** > **Launch Instance**.
2. **Name:** `Ecommerce-Docker-Server`
3. **AMI:** Ubuntu Server 24.04 LTS (HVM) or 22.04 LTS
4. **Instance Type:** `t2.micro` (Free Tier eligible)
5. **Key Pair:** Select or create an SSH key pair (e.g. `my-key.pem`).
6. **Network Settings (Security Group):**
   - Inbound Rule 1: **SSH** (Port 22) from `My IP`
   - Inbound Rule 2: **HTTP** (Port 80) from `0.0.0.0/0` (Anywhere)
   - *Leave ports 8000 and 5432 closed!*

### Step 2: Connect via SSH
```bash
ssh -i /path/to/my-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
```

### Step 3: Install Docker & Docker Compose on Ubuntu
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose-v2

# Start and enable Docker daemon
sudo systemctl enable --now docker

# Add ubuntu user to docker group (so sudo is not needed)
sudo usermod -aG docker ubuntu
newgrp docker
```

### Step 4: Copy Code and Start Stack
```bash
# Clone or copy project files into EC2
git clone <YOUR_GIT_REPO_URL>
cd docker_assignment/project_3_ecommerce

# Start the stack with Docker Compose
docker compose up --build -d
```

### Step 5: Test Live App
In your web browser:
```
http://<YOUR-EC2-PUBLIC-IP>/
```
All features (catalog, cart, checkout, PostgreSQL order records) work seamlessly under the single public port 80.


---

## 6. Project Flow & Architecture Summary

As submitted in the course tracking sheet, the complete end-to-end data and traffic flow is structured as:

```text
User → React (Vite) Frontend → Nginx Reverse Proxy (Port 8080) → FastAPI REST API (Port 8000) → PostgreSQL 15 Database (Port 5432) → Persistent Docker Volume (pgdata)
```

### Flow Breakdown:
1. **User Ingress:** Client requests enter through public **Port 8080** (or Port 80) managed by Nginx.
2. **Reverse Proxy Routing:** Nginx serves the compiled React application and transparently reverse-proxies `/api/*` routes to the private FastAPI backend on port `8000`.
3. **Database Access:** FastAPI queries PostgreSQL over the private Docker/Kubernetes network on port `5432`.
4. **Data Persistence:** Database files are stored on a persistent volume (`pgdata`) so that inventory counts and order records survive container restarts.

---

## 7. Docker Hub Image Distribution Pipeline

All microservices are packaged and published to the public Docker Hub registry for cloud-native deployment:

* **Frontend Image:** `docker.io/purushotham010/ecommerce-frontend:v1.0`
* **Backend Image:** `docker.io/purushotham010/ecommerce-backend:v1.0`

### Pushing to Docker Hub:
```bash
# 1. Login to Docker Hub
docker login

# 2. Tag local images
docker tag project_3_ecommerce-frontend:latest purushotham010/ecommerce-frontend:v1.0
docker tag project_3_ecommerce-backend:latest purushotham010/ecommerce-backend:v1.0

# 3. Push to registry
docker push purushotham010/ecommerce-frontend:v1.0
docker push purushotham010/ecommerce-backend:v1.0
```

---

## 8. Kubernetes Cluster Orchestration (`k8s/`)

The application is fully configured for Kubernetes orchestration using declarative YAML manifests in the `k8s/` directory:

```
k8s/
├── postgres.yaml    # PostgreSQL 15 Deployment, PersistentVolumeClaim (1Gi), and ClusterIP Service
├── backend.yaml     # FastAPI REST API Deployment (2 Replicas for HA) and ClusterIP Service
└── frontend.yaml    # React + Nginx Deployment (2 Replicas) and NodePort Service (Port 30081)
```

### Key Kubernetes Features Implemented:
* **High Availability (HA):** Both frontend and backend deployments run with **2 replicas** for automatic load balancing.
* **Service Discovery:** Backend and PostgreSQL are exposed exclusively via internal `ClusterIP` services (`backend:8000` and `db:5432`), keeping them completely private within the cluster.
* **Data Persistence:** PostgreSQL uses a `PersistentVolumeClaim` (`postgres-pvc`) to prevent data loss across pod restarts.
* **Self-Healing:** If any pod crashes or is terminated, Kubernetes automatically detects the failure and spins up a healthy replacement pod in seconds.

### Deploying to Kubernetes:
```bash
# 1. Apply all manifests
kubectl apply -f k8s/

# 2. Verify all pods and services are running
kubectl get pods,svc,pvc

# 3. Forward port 8081 to test locally
kubectl port-forward svc/frontend 8081:80
```
Open **`http://localhost:8081/`** to view the application running live on Kubernetes!

### Self-Healing Verification (Simulate a Crash):
```bash
# Delete any active backend pod
kubectl delete pod <backend-pod-name>

# Verify immediate autonomous recovery
kubectl get pods
```
