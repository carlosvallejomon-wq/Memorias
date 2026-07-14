version: '3.9'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: memorias_vivas_db
    environment:
      POSTGRES_DB: memorias_vivas
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: memorias_vivas_redis
    ports:
      - "6379:6379"

volumes:
  postgres_data: