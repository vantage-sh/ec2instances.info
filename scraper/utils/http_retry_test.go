package utils

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// shrinkBackoff makes the retry delays negligible for tests and restores them
// afterwards, so the retry behaviour can be exercised without real waits.
func shrinkBackoff(t *testing.T) {
	t.Helper()
	origBase, origMax := retryBaseDelay, retryMaxDelay
	retryBaseDelay = time.Millisecond
	retryMaxDelay = 2 * time.Millisecond
	t.Cleanup(func() {
		retryBaseDelay, retryMaxDelay = origBase, origMax
	})
}

// TestFetchWithRetrySucceedsAfterTransientFailures asserts that the loader
// retries through a run of transient failures (503, then a hijacked/closed
// connection) and ultimately succeeds once the server returns 200.
func TestFetchWithRetrySucceedsAfterTransientFailures(t *testing.T) {
	shrinkBackoff(t)

	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := atomic.AddInt32(&calls, 1)
		switch n {
		case 1:
			// Transient server error.
			w.WriteHeader(http.StatusServiceUnavailable)
		case 2:
			// Simulate a dropped connection (mimics TLS handshake timeout /
			// connection reset) by hijacking and closing without a response.
			hj, ok := w.(http.Hijacker)
			if !ok {
				t.Errorf("server does not support hijacking")
				return
			}
			conn, _, err := hj.Hijack()
			if err != nil {
				t.Errorf("hijack failed: %v", err)
				return
			}
			conn.Close()
		default:
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"ok":true}`))
		}
	}))
	defer srv.Close()

	body, err := FetchWithRetry(srv.URL, nil)
	if err != nil {
		t.Fatalf("expected success after retries, got error: %v", err)
	}
	if string(body) != `{"ok":true}` {
		t.Fatalf("unexpected body: %q", string(body))
	}
	if got := atomic.LoadInt32(&calls); got != 3 {
		t.Fatalf("expected 3 attempts (2 transient failures then success), got %d", got)
	}
}

// TestFetchWithRetryGivesUpAfterCap asserts that a persistently failing
// endpoint fails loud after the attempt cap rather than retrying forever or
// returning empty data.
func TestFetchWithRetryGivesUpAfterCap(t *testing.T) {
	shrinkBackoff(t)

	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer srv.Close()

	body, err := FetchWithRetry(srv.URL, nil)
	if err == nil {
		t.Fatalf("expected error after exceeding the retry cap, got nil")
	}
	if body != nil {
		t.Fatalf("expected nil body on failure, got %q", string(body))
	}
	if !strings.Contains(err.Error(), "status code 502") {
		t.Fatalf("expected error to mention the status code and url, got: %v", err)
	}
	if got := atomic.LoadInt32(&calls); got != maxHTTPAttempts {
		t.Fatalf("expected exactly %d attempts, got %d", maxHTTPAttempts, got)
	}
}

// TestFetchWithRetryDoesNotRetryPermanentStatus asserts that a non-retryable
// 4xx fails immediately without burning the retry budget.
func TestFetchWithRetryDoesNotRetryPermanentStatus(t *testing.T) {
	shrinkBackoff(t)

	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	_, err := FetchWithRetry(srv.URL, nil)
	if err == nil {
		t.Fatalf("expected error for 404, got nil")
	}
	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Fatalf("expected exactly 1 attempt for a permanent 404, got %d", got)
	}
}

// TestFetchWithRetrySendsBearerToken asserts the bearer token is forwarded.
func TestFetchWithRetrySendsBearerToken(t *testing.T) {
	shrinkBackoff(t)

	var gotAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{}`))
	}))
	defer srv.Close()

	token := "secret-token"
	if _, err := FetchWithRetry(srv.URL, &token); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotAuth != "Bearer secret-token" {
		t.Fatalf("expected bearer header to be set, got %q", gotAuth)
	}
}

// TestPostFormWithRetrySucceedsAfterTransientFailures asserts that the form POST
// wrapper (used for OAuth token exchanges) retries through transient failures,
// preserves the POST method and form body, and ultimately succeeds.
func TestPostFormWithRetrySucceedsAfterTransientFailures(t *testing.T) {
	shrinkBackoff(t)

	var calls int32
	var gotMethod, gotGrant, gotContentType string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := atomic.AddInt32(&calls, 1)
		switch n {
		case 1:
			w.WriteHeader(http.StatusServiceUnavailable)
		case 2:
			hj, ok := w.(http.Hijacker)
			if !ok {
				t.Errorf("server does not support hijacking")
				return
			}
			conn, _, err := hj.Hijack()
			if err != nil {
				t.Errorf("hijack failed: %v", err)
				return
			}
			conn.Close()
		default:
			gotMethod = r.Method
			gotContentType = r.Header.Get("Content-Type")
			_ = r.ParseForm()
			gotGrant = r.Form.Get("grant_type")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"access_token":"abc"}`))
		}
	}))
	defer srv.Close()

	body, err := PostFormWithRetry(srv.URL, url.Values{"grant_type": {"client_credentials"}})
	if err != nil {
		t.Fatalf("expected success after retries, got error: %v", err)
	}
	if string(body) != `{"access_token":"abc"}` {
		t.Fatalf("unexpected body: %q", string(body))
	}
	if gotMethod != http.MethodPost {
		t.Fatalf("expected POST, got %q", gotMethod)
	}
	if gotContentType != "application/x-www-form-urlencoded" {
		t.Fatalf("expected form content type, got %q", gotContentType)
	}
	if gotGrant != "client_credentials" {
		t.Fatalf("expected form body to be sent, got grant_type %q", gotGrant)
	}
	if got := atomic.LoadInt32(&calls); got != 3 {
		t.Fatalf("expected 3 attempts (2 transient failures then success), got %d", got)
	}
}

// TestPostFormWithRetryGivesUpAfterCap asserts the form POST wrapper fails loud
// after the attempt cap rather than retrying forever or returning empty data.
func TestPostFormWithRetryGivesUpAfterCap(t *testing.T) {
	shrinkBackoff(t)

	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer srv.Close()

	body, err := PostFormWithRetry(srv.URL, url.Values{"grant_type": {"client_credentials"}})
	if err == nil {
		t.Fatalf("expected error after exceeding the retry cap, got nil")
	}
	if body != nil {
		t.Fatalf("expected nil body on failure, got %q", string(body))
	}
	if !strings.Contains(err.Error(), "status code 502") {
		t.Fatalf("expected error to mention the status code and url, got: %v", err)
	}
	if got := atomic.LoadInt32(&calls); got != maxHTTPAttempts {
		t.Fatalf("expected exactly %d attempts, got %d", maxHTTPAttempts, got)
	}
}
