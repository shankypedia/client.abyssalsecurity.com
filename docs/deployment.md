# Production Deployment Guide

This guide provides comprehensive instructions for deploying the AbyssalSecurity Client Portal to production environments. It covers multiple deployment strategies, security configurations, and best practices.

## Table of Contents
- [Pre-deployment Checklist](#pre-deployment-checklist)
- [Infrastructure Requirements](#infrastructure-requirements)
- [Database Setup](#database-setup)
- [Application Deployment](#application-deployment)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security Hardening](#security-hardening)
- [Performance Optimization](#performance-optimization)
- [Backup and Recovery](#backup-and-recovery)
- [CI/CD Pipeline](#cicd-pipeline)

---

## Pre-deployment Checklist

### Code Preparation
- [ ] All tests passing (`npm test`)
- [ ] Code linting clean (`npm run lint`)
- [ ] TypeScript compilation successful (`npm run type-check`)
- [ ] Security audit clean (`npm audit`)
- [ ] Dependencies updated and vulnerabilities patched
- [ ] Environment-specific configurations reviewed
- [ ] Database migrations tested
- [ ] Performance testing completed
- [ ] Security testing completed

### Configuration Review
- [ ] Environment variables configured for production
- [ ] Secrets generated and stored securely
- [ ] Database connection strings validated
- [ ] SSL certificates obtained and validated
- [ ] Domain names configured and DNS updated
- [ ] Firewall rules planned
- [ ] Backup strategy defined
- [ ] Monitoring tools configured

### Documentation
- [ ] Deployment runbook prepared
- [ ] Rollback procedures documented
- [ ] Team contact information updated
- [ ] Post-deployment verification steps defined

---

## Infrastructure Requirements

### Minimum Server Specifications

#### Production Server
- **CPU**: 4 cores (Intel/AMD x64)
- **Memory**: 8GB RAM minimum, 16GB recommended
- **Storage**: 100GB SSD minimum, 500GB recommended
- **Network**: Gigabit ethernet, low latency internet connection
- **OS**: Ubuntu 20.04 LTS, CentOS 8+, or Debian 11+

#### Database Server (if separate)
- **CPU**: 4 cores minimum, 8 cores recommended
- **Memory**: 16GB RAM minimum, 32GB recommended
- **Storage**: SSD with high IOPS, minimum 200GB
- **Network**: Low latency connection to application server

#### Load Balancer (for high availability)
- **CPU**: 2 cores minimum
- **Memory**: 4GB RAM minimum
- **Network**: High bandwidth, multiple network interfaces

### Cloud Provider Specifications

#### AWS
```yaml
Application Server:
  Instance Type: t3.large (2 vCPU, 8GB RAM) minimum
  Recommended: c5.xlarge (4 vCPU, 8GB RAM)
  Storage: gp3 EBS volume, 100GB minimum
  
Database:
  RDS Instance: db.t3.medium minimum
  Recommended: db.r5.large
  Storage: gp3, 100GB minimum with auto-scaling
  
Load Balancer:
  Application Load Balancer (ALB)
  SSL termination enabled
```

#### Google Cloud Platform
```yaml
Application Server:
  Machine Type: e2-standard-4 (4 vCPU, 16GB RAM)
  Boot Disk: SSD persistent disk, 100GB
  
Database:
  Cloud SQL: db-standard-2 (2 vCPU, 7.5GB RAM) minimum
  Storage: SSD, 100GB with automatic increase
  
Load Balancer:
  HTTP(S) Load Balancer
  SSL certificates managed
```

#### Azure
```yaml
Application Server:
  VM Size: Standard_B4ms (4 vCPU, 16GB RAM)
  Storage: Premium SSD, 128GB
  
Database:
  Azure Database for PostgreSQL: GP_Gen5_2 minimum
  Storage: 100GB with auto-grow
  
Load Balancer:
  Application Gateway with SSL termination
```

---

## Database Setup

### PostgreSQL Production Setup

#### Installation (Ubuntu 20.04)
```bash
# Install PostgreSQL 15
sudo apt update
sudo apt install wget ca-certificates
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt update
sudo apt install postgresql-15 postgresql-client-15

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Database Configuration
```bash
# Create database and user
sudo -u postgres psql
```

```sql
-- Create database
CREATE DATABASE abyssal_security_prod;

-- Create user with limited privileges
CREATE USER abyssal_app WITH PASSWORD 'your_secure_password_here';

-- Grant necessary permissions
GRANT CONNECT ON DATABASE abyssal_security_prod TO abyssal_app;
GRANT USAGE ON SCHEMA public TO abyssal_app;
GRANT CREATE ON SCHEMA public TO abyssal_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO abyssal_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO abyssal_app;

-- Exit psql
\q
```

#### PostgreSQL Configuration (`/etc/postgresql/15/main/postgresql.conf`)
```ini
# Connection settings
listen_addresses = 'localhost'  # or specific IP addresses
port = 5432
max_connections = 100

# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 10MB
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Performance
checkpoint_completion_target = 0.7
wal_buffers = 16MB
default_statistics_target = 100

# Security
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
```

#### Authentication Configuration (`/etc/postgresql/15/main/pg_hba.conf`)
```ini
# Database administrative login by Unix domain socket
local   all             postgres                                peer

# "local" for Unix domain socket connections only
local   all             all                                     peer

# IPv4 local connections
host    abyssal_security_prod    abyssal_app    127.0.0.1/32    md5

# IPv6 local connections
host    all             all             ::1/128                 md5
```

### Database Migrations
```bash
# Set production database URL
export DATABASE_URL="postgresql://abyssal_app:your_password@localhost:5432/abyssal_security_prod"

# Run migrations
cd server
npm run db:migrate:deploy

# Verify migration status
npm run db:migrate:status
```

### Database Backup Strategy
```bash
# Create backup script
cat > /opt/abyssal-security/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/abyssal-security/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="abyssal_security_prod"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h localhost -U abyssal_app -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
EOF

chmod +x /opt/abyssal-security/backup-db.sh

# Add to crontab (daily backup at 2 AM)
echo "0 2 * * * /opt/abyssal-security/backup-db.sh" | crontab -
```

---

## Application Deployment

### Method 1: PM2 (Recommended for VPS)

#### Installation and Setup
```bash
# Install PM2 globally
npm install -g pm2

# Create application directory
sudo mkdir -p /opt/abyssal-security
sudo chown $USER:$USER /opt/abyssal-security

# Clone repository
cd /opt/abyssal-security
git clone https://github.com/your-username/client.abyssalsecurity.com.git .

# Install dependencies
npm install
cd server
npm install
cd ..
```

#### Build Application
```bash
# Build frontend
npm run build

# Build backend
cd server
npm run build
cd ..
```

#### PM2 Configuration
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'abyssal-security-api',
      script: './dist/index.js',
      cwd: './server',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    }
  ]
};
```

#### Environment Configuration
Create `server/.env.production`:
```bash
NODE_ENV=production
PORT=3001
HOST=127.0.0.1

# Database
DATABASE_URL="postgresql://abyssal_app:your_password@localhost:5432/abyssal_security_prod"

# JWT (Generate secure secrets)
JWT_SECRET=your_production_jwt_secret_minimum_32_characters_long
JWT_EXPIRES_IN=24h

# Session
SESSION_SECRET=your_production_session_secret_minimum_32_characters_long

# Security
BCRYPT_ROUNDS=14
ACCOUNT_LOCKOUT_ATTEMPTS=3
ACCOUNT_LOCKOUT_DURATION=3600000

# Logging
LOG_LEVEL=warn
LOG_FILE=/var/log/abyssal-security/app.log

# Performance
DB_POOL_SIZE=10

# Application
APP_VERSION=2.0.0
APP_NAME=AbyssalSecurity Client Portal
```

#### Start Application
```bash
# Create log directory
sudo mkdir -p /var/log/abyssal-security
sudo chown $USER:$USER /var/log/abyssal-security

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by PM2

# Monitor application
pm2 status
pm2 logs
pm2 monit
```

### Method 2: Docker Production

#### Dockerfile.prod
```dockerfile
# Frontend build stage
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Backend build stage
FROM node:18-alpine AS backend-builder
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ .
RUN npm run build
RUN npm run db:generate

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy built application
COPY --from=backend-builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=backend-builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=backend-builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=frontend-builder --chown=nodejs:nodejs /app/dist ./public

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

#### Docker Compose Production
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://abyssal_app:${DB_PASSWORD}@db:5432/abyssal_security_prod
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
    restart: unless-stopped
    depends_on:
      - db
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - /var/log/nginx:/var/log/nginx
    depends_on:
      - app
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=abyssal_security_prod
      - POSTGRES_USER=abyssal_app
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U abyssal_app -d abyssal_security_prod"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    driver: bridge
```

#### Environment Variables (.env)
```bash
# Database
DB_PASSWORD=your_secure_database_password

# JWT
JWT_SECRET=your_production_jwt_secret_minimum_32_characters_long

# Session
SESSION_SECRET=your_production_session_secret_minimum_32_characters_long

# Redis
REDIS_PASSWORD=your_redis_password
```

#### Deploy with Docker
```bash
# Build and start services
docker-compose up -d --build

# Run database migrations
docker-compose exec app npm run db:migrate:deploy

# Check status
docker-compose ps
docker-compose logs -f app
```

### Method 3: Kubernetes Deployment

#### Namespace and ConfigMap
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: abyssal-security

---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: abyssal-security
data:
  NODE_ENV: "production"
  PORT: "3001"
  LOG_LEVEL: "warn"
  APP_VERSION: "2.0.0"
```

#### Secrets
```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: abyssal-security
type: Opaque
data:
  JWT_SECRET: <base64-encoded-jwt-secret>
  SESSION_SECRET: <base64-encoded-session-secret>
  DATABASE_URL: <base64-encoded-database-url>
```

#### Deployment
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: abyssal-security-app
  namespace: abyssal-security
spec:
  replicas: 3
  selector:
    matchLabels:
      app: abyssal-security-app
  template:
    metadata:
      labels:
        app: abyssal-security-app
    spec:
      containers:
      - name: app
        image: abyssal-security:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

#### Service and Ingress
```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: abyssal-security-service
  namespace: abyssal-security
spec:
  selector:
    app: abyssal-security-app
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: abyssal-security-ingress
  namespace: abyssal-security
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - client.abyssalsecurity.com
    secretName: abyssal-security-tls
  rules:
  - host: client.abyssalsecurity.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: abyssal-security-service
            port:
              number: 3001
```

---

## SSL/TLS Configuration

### Let's Encrypt with Certbot
```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d client.abyssalsecurity.com

# Test automatic renewal
sudo certbot renew --dry-run

# Setup automatic renewal (crontab)
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Nginx SSL Configuration
```nginx
# /etc/nginx/sites-available/abyssal-security
server {
    listen 80;
    server_name client.abyssalsecurity.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name client.abyssalsecurity.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/client.abyssalsecurity.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/client.abyssalsecurity.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Proxy to application
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:3001/health;
    }
}
```

---

## Monitoring and Logging

### Application Monitoring with PM2

#### PM2 Monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-server-monit

# Web monitoring interface
pm2 web
```

#### Log Management
```bash
# Log rotation configuration
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### System Monitoring

#### Prometheus and Grafana Setup
```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'

volumes:
  prometheus_data:
  grafana_data:
```

#### Prometheus Configuration
```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'abyssal-security-app'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
```

### Centralized Logging

#### ELK Stack Setup
```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    ports:
      - "5044:5044"
    volumes:
      - ./logstash/logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

---

## Security Hardening

### Firewall Configuration
```bash
# UFW (Ubuntu Firewall)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Check status
sudo ufw status verbose
```

### System Security Updates
```bash
# Setup automatic security updates
sudo apt install unattended-upgrades

# Configure automatic updates
echo 'Unattended-Upgrade::Automatic-Reboot "false";' | sudo tee -a /etc/apt/apt.conf.d/50unattended-upgrades
```

### Application Security
```bash
# Create restricted user for application
sudo useradd --system --shell /bin/false --home /opt/abyssal-security --create-home abyssal

# Set proper file permissions
sudo chown -R abyssal:abyssal /opt/abyssal-security
sudo chmod -R 750 /opt/abyssal-security
sudo chmod 600 /opt/abyssal-security/server/.env*
```

### Fail2Ban Setup
```bash
# Install Fail2Ban
sudo apt install fail2ban

# Configure for Nginx
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 7200
maxretry = 10
EOF

# Start Fail2Ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## Performance Optimization

### Node.js Optimization
```bash
# PM2 cluster mode configuration
pm2 start ecosystem.config.js --env production

# Optimize V8 heap
export NODE_OPTIONS="--max-old-space-size=2048"
```

### Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_username ON users(username);
CREATE INDEX CONCURRENTLY idx_sessions_user_id ON sessions(user_id);
CREATE INDEX CONCURRENTLY idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX CONCURRENTLY idx_security_logs_created_at ON security_logs(created_at);

-- Analyze tables
ANALYZE users;
ANALYZE sessions;
ANALYZE security_logs;
```

### Nginx Optimization
```nginx
# Worker processes
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Keepalive
    keepalive_timeout 30;
    keepalive_requests 100;

    # Buffer sizes
    client_body_buffer_size 128k;
    client_header_buffer_size 1k;
    client_max_body_size 10m;
    large_client_header_buffers 4 4k;

    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    send_timeout 10;

    # File caching
    open_file_cache max=200000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
}
```

---

## Backup and Recovery

### Database Backup
```bash
# Automated backup script
cat > /opt/abyssal-security/scripts/backup.sh << 'EOF'
#!/bin/bash
set -e

BACKUP_DIR="/opt/abyssal-security/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="abyssal_security_prod"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U abyssal_app -d $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Application files backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C /opt/abyssal-security \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='backups' \
    .

# Upload to cloud storage (AWS S3 example)
aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql.gz s3://abyssal-security-backups/
aws s3 cp $BACKUP_DIR/app_backup_$DATE.tar.gz s3://abyssal-security-backups/

# Cleanup old local backups
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/abyssal-security/scripts/backup.sh

# Schedule daily backups
echo "0 2 * * * /opt/abyssal-security/scripts/backup.sh" | crontab -
```

### Recovery Procedures
```bash
# Database recovery
cat > /opt/abyssal-security/scripts/restore.sh << 'EOF'
#!/bin/bash
set -e

if [ $# -ne 1 ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

BACKUP_FILE=$1
DB_NAME="abyssal_security_prod"

# Stop application
pm2 stop abyssal-security-api

# Restore database
gunzip -c $BACKUP_FILE | psql -h localhost -U abyssal_app -d $DB_NAME

# Start application
pm2 start abyssal-security-api

echo "Recovery completed"
EOF

chmod +x /opt/abyssal-security/scripts/restore.sh
```

---

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: |
        npm ci
        cd server && npm ci

    - name: Run linting
      run: |
        npm run lint
        cd server && npm run lint

    - name: Run tests
      run: |
        cd server && npm test
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

    - name: Build application
      run: |
        npm run build
        cd server && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v3

    - name: Deploy to production server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /opt/abyssal-security
          git pull origin main
          npm ci --production
          cd server && npm ci --production
          npm run build
          cd ..
          npm run build
          pm2 reload ecosystem.config.js --env production
```

### Deployment Script
```bash
# scripts/deploy.sh
#!/bin/bash
set -e

echo "Starting deployment..."

# Backup current version
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /opt/abyssal-security/backups/pre_deploy_$DATE.tar.gz -C /opt/abyssal-security .

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production
cd server && npm ci --production && cd ..

# Build application
npm run build
cd server && npm run build && cd ..

# Run database migrations
cd server && npm run db:migrate:deploy && cd ..

# Restart application
pm2 reload ecosystem.config.js --env production

# Health check
sleep 10
curl -f http://localhost:3001/health || (pm2 logs --lines 50 && exit 1)

echo "Deployment completed successfully!"
```

---

## Post-Deployment Verification

### Health Checks
```bash
# Application health
curl -f https://client.abyssalsecurity.com/health

# Database connectivity
psql -h localhost -U abyssal_app -d abyssal_security_prod -c "SELECT 1;"

# SSL certificate validity
openssl s_client -connect client.abyssalsecurity.com:443 -servername client.abyssalsecurity.com

# Performance test
curl -o /dev/null -s -w "%{time_total}\n" https://client.abyssalsecurity.com/
```

### Monitoring Setup Verification
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs --lines 100

# Check system resources
htop
df -h
free -h

# Check network connectivity
netstat -tlnp | grep :3001
```

### Security Verification
```bash
# Check firewall status
sudo ufw status

# Check SSL configuration
curl -I https://client.abyssalsecurity.com/

# Check for vulnerabilities
npm audit
```

---

## Rollback Procedures

### Quick Rollback
```bash
# scripts/rollback.sh
#!/bin/bash
set -e

if [ $# -ne 1 ]; then
    echo "Usage: $0 <commit_hash_or_backup_file>"
    exit 1
fi

TARGET=$1

echo "Starting rollback to $TARGET..."

# Stop application
pm2 stop abyssal-security-api

# Rollback code
if [[ $TARGET =~ ^[a-f0-9]{7,40}$ ]]; then
    # Git commit hash
    git reset --hard $TARGET
else
    # Backup file
    tar -xzf $TARGET -C /opt/abyssal-security
fi

# Restore dependencies
npm ci --production
cd server && npm ci --production && cd ..

# Build application
npm run build
cd server && npm run build && cd ..

# Start application
pm2 start abyssal-security-api

# Health check
sleep 10
curl -f http://localhost:3001/health || (echo "Rollback failed!" && exit 1)

echo "Rollback completed successfully!"
```

---

This comprehensive deployment guide covers all aspects of production deployment. Always test deployment procedures in a staging environment first, and ensure you have proper backup and rollback strategies in place before deploying to production.

*Last updated: June 2024*