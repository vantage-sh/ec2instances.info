package main

import (
	"context"

	"github.com/jackc/pgx/v5"
)

const (
	kvReadQuery  = "SELECT value FROM kv WHERE key = $1"
	kvWriteQuery = "INSERT INTO kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2"

	modChainWriteQuery = "INSERT INTO modification_chain (key, run_time, event) VALUES ($1, $2, $3)"
)

// TxWrapper is a wrapper around a pgx.Tx that provides a simple interface for writing to the database.
type TxWrapper struct {
	tx pgx.Tx
}

// Commit commits the underlying transaction.
func (w *TxWrapper) Commit() error {
	return w.tx.Commit(context.Background())
}

// Rollback rolls back the underlying transaction.
func (w *TxWrapper) Rollback() error {
	return w.tx.Rollback(context.Background())
}

// KVRead reads a key-value pair from the database. Returns false if there's no rows.
func (w *TxWrapper) KVRead(key string, scanValue any) (found bool, err error) {
	row := w.tx.QueryRow(context.Background(), kvReadQuery, key)
	err = row.Scan(scanValue)
	if err == pgx.ErrNoRows {
		return false, nil
	}
	return true, err
}

// KVWrite writes a key-value pair to the database.
func (w *TxWrapper) KVWrite(key string, value any) error {
	_, err := w.tx.Exec(context.Background(), kvWriteQuery, key, value)
	return err
}

// WriteToBlockchain writes a event to the database.
func (w *TxWrapper) WriteToBlockchain(key string, runTime int64, event any) error {
	_, err := w.tx.Exec(context.Background(), modChainWriteQuery, key, runTime, event)
	return err
}

// NewTxWrapperFromConnectionString creates a new TxWrapper from a connection string.
func NewTxWrapperFromConnectionString(connectionString string) (*TxWrapper, error) {
	conn, err := pgx.Connect(context.Background(), connectionString)
	if err != nil {
		return nil, err
	}
	tx, err := conn.Begin(context.Background())
	if err != nil {
		return nil, err
	}
	return &TxWrapper{tx: tx}, nil
}
