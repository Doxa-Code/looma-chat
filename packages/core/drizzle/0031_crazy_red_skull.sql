CREATE INDEX IF NOT EXISTS products_embedding_hnsw
ON products
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

CREATE INDEX IF NOT EXISTS products_workspace_idx
ON products(workspace_id);

CREATE INDEX IF NOT EXISTS products_description_fts
ON products USING gin(to_tsvector('portuguese', description));

CREATE INDEX IF NOT EXISTS products_price_idx
ON products(price);