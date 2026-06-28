package utils

import (
	"sync/atomic"
	"testing"
	"time"
)

// TestFunctionGroupRunsAll verifies that every added function is executed
// exactly once.
func TestFunctionGroupRunsAll(t *testing.T) {
	const n = 100
	var executed int64

	fg := FunctionGroup{}
	for i := 0; i < n; i++ {
		fg.Add(func() {
			atomic.AddInt64(&executed, 1)
		})
	}
	fg.Run()

	if got := atomic.LoadInt64(&executed); got != n {
		t.Fatalf("expected %d functions to run, got %d", n, got)
	}
}

// TestFunctionGroupBoundsConcurrency verifies that no more than
// maxConcurrentFetches functions run simultaneously.
func TestFunctionGroupBoundsConcurrency(t *testing.T) {
	const n = 200
	var current int64
	var maxObserved int64

	fg := FunctionGroup{}
	for i := 0; i < n; i++ {
		fg.Add(func() {
			c := atomic.AddInt64(&current, 1)
			// Track the high-water mark of concurrent executions.
			for {
				m := atomic.LoadInt64(&maxObserved)
				if c <= m || atomic.CompareAndSwapInt64(&maxObserved, m, c) {
					break
				}
			}
			// Hold the slot briefly so concurrent functions overlap and the
			// semaphore is actually exercised.
			time.Sleep(2 * time.Millisecond)
			atomic.AddInt64(&current, -1)
		})
	}
	fg.Run()

	if got := atomic.LoadInt64(&maxObserved); got > maxConcurrentFetches {
		t.Fatalf("observed %d concurrent executions, exceeds cap of %d", got, maxConcurrentFetches)
	}
	if got := atomic.LoadInt64(&maxObserved); got == 0 {
		t.Fatalf("no functions appear to have run concurrently")
	}
}
