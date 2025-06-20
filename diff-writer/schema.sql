CREATE TABLE kv (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    initial_value JSONB NOT NULL
);

CREATE TABLE modification_chain (
    key TEXT NOT NULL,
    run_time BIGINT NOT NULL,
    event JSONB NOT NULL
);

CREATE INDEX modification_chain_key_run_time_index ON modification_chain (key, run_time);
