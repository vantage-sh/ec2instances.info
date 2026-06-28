package utils

import "sync"

// maxConcurrentFetches bounds how many FunctionGroup functions run at once.
//
// Each FunctionGroup function typically opens its own network/TLS connections
// (per-region AWS SDK clients, HTTP fetchers). Launching one goroutine per
// added function with no cap can open hundreds of simultaneous TLS connections,
// which on a constrained network produces bursts of "TLS handshake timeout" and
// "operation timed out" that exhaust retries and abort the scrape.
//
// 16 is a deliberate middle ground: high enough to keep the scrape fast on a
// healthy CI network (regions/services still overlap heavily), low enough to
// avoid saturating a normal connection. Tune here if pacing needs adjusting.
const maxConcurrentFetches = 16

// FunctionGroup is a group of functions that are called in parallel, with the
// number of simultaneously running functions bounded by maxConcurrentFetches.
type FunctionGroup struct {
	fns []func()
}

// Add adds a function to the group.
func (fg *FunctionGroup) Add(fn func()) {
	fg.fns = append(fg.fns, fn)
}

// Run runs the functions in parallel, with at most maxConcurrentFetches running
// at any given time. It blocks until all functions have completed.
func (fg *FunctionGroup) Run() {
	wg := sync.WaitGroup{}
	wg.Add(len(fg.fns))
	// Buffered channel acts as a counting semaphore: a slot must be acquired
	// before a function runs and is released when it finishes.
	sem := make(chan struct{}, maxConcurrentFetches)
	for _, fn := range fg.fns {
		sem <- struct{}{}
		go func() {
			defer wg.Done()
			defer func() { <-sem }()
			fn()
		}()
	}
	wg.Wait()
}
