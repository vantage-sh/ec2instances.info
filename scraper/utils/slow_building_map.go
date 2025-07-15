package utils

import (
	"maps"
	"sync"
	"time"
)

// SlowBuildingMap is a map that is built slowly in the background.
// When a item is got, it will wait for the key to appear or for the map to be built.
type SlowBuildingMap[K comparable, V any] struct {
	mu   sync.RWMutex
	map_ map[K]V
	done bool
}

// Get returns the value for the key.
func (m *SlowBuildingMap[K, V]) Get(key K) (V, bool) {
	for {
		m.mu.RLock()
		val, ok := m.map_[key]

		if m.done {
			m.mu.RUnlock()
			return val, ok
		}

		m.mu.RUnlock()

		if ok {
			return val, true
		}

		time.Sleep(10 * time.Millisecond)
	}
}

// NewSlowBuildingMap returns a new SlowBuildingMap.
func NewSlowBuildingMap[K comparable, V any](
	builder func(pushChunk func(map[K]V)),
) *SlowBuildingMap[K, V] {
	x := &SlowBuildingMap[K, V]{
		map_: make(map[K]V),
	}
	go func() {
		builder(func(chunk map[K]V) {
			x.mu.Lock()
			maps.Copy(x.map_, chunk)
			x.mu.Unlock()
		})
		x.mu.Lock()
		x.done = true
		x.mu.Unlock()
	}()
	return x
}
