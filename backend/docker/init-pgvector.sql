-- Habilita la extensión pgvector en la base de datos recién creada,
-- necesaria antes de que Drizzle pueda crear columnas de tipo `vector`.
CREATE EXTENSION IF NOT EXISTS vector;
