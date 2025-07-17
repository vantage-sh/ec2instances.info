package utils

import "sync"

// FunctionGroup is a group of functions that are called in parallel.
type FunctionGroup struct {
	fns []func()
}

// Add adds a function to the group.
func (fg *FunctionGroup) Add(fn func()) {
	fg.fns = append(fg.fns, fn)
}

// Run runs the functions in parallel.
func (fg *FunctionGroup) Run() {
	wg := sync.WaitGroup{}
	wg.Add(len(fg.fns))
	for _, fn := range fg.fns {
		go func() {
			defer wg.Done()
			fn()
		}()
	}
	wg.Wait()
}
