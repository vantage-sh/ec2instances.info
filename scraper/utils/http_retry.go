package utils

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// The scraper fetches hundreds of pricing JSON/HTML files in parallel (see
// FunctionGroup). Under that concurrency a single transient failure (a TLS
// handshake timeout, a connection reset, a brief 5xx/429) used to propagate up
// and abort the entire scrape. The helpers below add a bounded retry with
// backoff and a tuned, connection-pooling client so transient failures are
// absorbed while persistent failures still fail loud after the cap.

const (
	// maxHTTPAttempts bounds the total number of attempts per URL. We never
	// retry forever: after this many failures we return the last error so the
	// caller fails loud rather than hanging or returning empty data.
	maxHTTPAttempts = 6

	// perAttemptTimeout is the overall ceiling for a single attempt (matches the
	// previous 15-minute JSON context). A pricing file can be large, so this is
	// generous; the transport-level timeouts below catch fast-failing handshakes.
	perAttemptTimeout = 15 * time.Minute
)

// retryBaseDelay / retryMaxDelay define an exponential backoff with a cap, so a
// flaky endpoint backs off but a slow-recovering one is still retried promptly
// within the cap. They are vars (not consts) only so tests can shrink them.
var (
	retryBaseDelay = 2 * time.Second
	retryMaxDelay  = 30 * time.Second
)

// sharedHTTPClient is package-level so connections are pooled across the many
// parallel fetches instead of re-handshaking TLS for every file. The transport
// timeouts are tuned up from net/http defaults (default TLSHandshakeTimeout is
// 10s, which the upstream pricing endpoints exceeded under load).
var sharedHTTPClient = &http.Client{
	Timeout: perAttemptTimeout,
	Transport: &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		MaxIdleConns:          200,
		MaxIdleConnsPerHost:   50,
		MaxConnsPerHost:       50,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   30 * time.Second,
		ResponseHeaderTimeout: 60 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		ForceAttemptHTTP2:     true,
	},
}

// retryableStatus reports whether an HTTP status code is worth retrying.
// 5xx and 429 are transient; other 4xx are caller/permanent errors.
func retryableStatus(code int) bool {
	return code == http.StatusTooManyRequests || code >= 500
}

// backoffFor returns the exponential-with-cap delay before the given (1-based)
// attempt's retry.
func backoffFor(attempt int) time.Duration {
	delay := retryBaseDelay << (attempt - 1)
	if delay > retryMaxDelay || delay <= 0 {
		delay = retryMaxDelay
	}
	return delay
}

// FetchWithRetry performs a GET against url with a bounded retry/backoff,
// retrying on transient network errors and on retryable HTTP statuses (5xx,
// 429). The provided bearerToken, when non-nil, is sent as a Bearer header.
//
// On success it returns the fully-read response body. On failure after the cap
// it returns the last error (never nil body with nil error), so callers fail
// loud instead of proceeding with empty data.
func FetchWithRetry(urlStr string, bearerToken *string) ([]byte, error) {
	return retryLoop(urlStr, func() ([]byte, error) {
		return doOnce(urlStr, bearerToken)
	})
}

// PostFormWithRetry performs an application/x-www-form-urlencoded POST against
// url with the same bounded retry/backoff and shared client as FetchWithRetry.
// It exists so OAuth token exchanges (a transient timeout on which would
// otherwise kill the whole scrape) survive transient failures. Token endpoints
// are idempotent for these credential grants, so retrying the POST is safe.
//
// On success it returns the response body; on failure after the cap it returns
// the last error so callers fail loud rather than proceeding without a token.
func PostFormWithRetry(urlStr string, data url.Values) ([]byte, error) {
	return retryLoop(urlStr, func() ([]byte, error) {
		return doPostFormOnce(urlStr, data)
	})
}

// retryLoop runs do with the bounded retry/backoff policy shared by every
// fetcher, so there is a single backoff implementation. urlStr is used only for
// log context. Permanent errors short-circuit the retry budget; otherwise the
// last error is returned after maxHTTPAttempts.
func retryLoop(urlStr string, do func() ([]byte, error)) ([]byte, error) {
	var lastErr error

	for attempt := 1; attempt <= maxHTTPAttempts; attempt++ {
		if attempt > 1 {
			delay := backoffFor(attempt - 1)
			log.Printf("Failed to load %s, retrying in %s... (attempt %d/%d): %v",
				urlStr, delay, attempt, maxHTTPAttempts, lastErr)
			time.Sleep(delay)
		}

		body, err := do()
		if err == nil {
			return body, nil
		}
		lastErr = err

		// Permanent errors (non-retryable HTTP status, bad request construction)
		// are returned immediately rather than burning the retry budget.
		var perr permanentError
		if errors.As(err, &perr) {
			return nil, perr.err
		}
	}

	return nil, lastErr
}

// permanentError wraps an error that must not be retried.
type permanentError struct {
	err error
}

func (p permanentError) Error() string { return p.err.Error() }
func (p permanentError) Unwrap() error { return p.err }

// doOnce performs a single GET attempt and returns the body on a 200 response.
// Retryable failures are returned as plain errors; non-retryable HTTP statuses
// are wrapped in permanentError so the retry loop stops early.
func doOnce(url string, bearerToken *string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), perAttemptTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		// A malformed URL will never succeed; don't retry.
		return nil, permanentError{err: err}
	}
	if bearerToken != nil {
		req.Header.Set("Authorization", "Bearer "+*bearerToken)
	}

	resp, err := sharedHTTPClient.Do(req)
	if err != nil {
		// Transport-level errors (TLS handshake timeout, connection reset, EOF,
		// timeouts) are transient and worth retrying.
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		statusErr := &httpStatusError{url: url, code: resp.StatusCode, body: string(body)}
		if retryableStatus(resp.StatusCode) {
			return nil, statusErr
		}
		return nil, permanentError{err: statusErr}
	}

	return io.ReadAll(resp.Body)
}

// doPostFormOnce performs a single form POST attempt, mirroring doOnce's
// transient-vs-permanent error classification so retryLoop treats both fetch
// shapes identically.
func doPostFormOnce(urlStr string, data url.Values) ([]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), perAttemptTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, urlStr, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, permanentError{err: err}
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := sharedHTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		statusErr := &httpStatusError{url: urlStr, code: resp.StatusCode, body: string(body)}
		if retryableStatus(resp.StatusCode) {
			return nil, statusErr
		}
		return nil, permanentError{err: statusErr}
	}

	return io.ReadAll(resp.Body)
}

// httpStatusError reports a non-200 HTTP response, including the URL and a
// snippet of the body for diagnostics.
type httpStatusError struct {
	url  string
	code int
	body string
}

func (e *httpStatusError) Error() string {
	return fmt.Sprintf("status code %d for url %s: %s", e.code, e.url, e.body)
}
