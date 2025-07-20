package utils

import "sync"

// BlockUntilDone is a function that blocks until the process is done.
// After that, access is freely given.
func BlockUntilDone[T any](hn func() T) func() T {
	mu := sync.RWMutex{}
	mu.Lock()

	var val T
	go func() {
		val = hn()
		mu.Unlock()
	}()

	return func() T {
		mu.RLock()
		defer mu.RUnlock()
		return val
	}
}
