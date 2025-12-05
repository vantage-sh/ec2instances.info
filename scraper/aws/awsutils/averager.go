package awsutils

import "encoding/json"

// Averager takes a comparable of T and computes the average as the JSON output.
type Averager[T comparable] []T

// Value computes the average of the values stored in the Averager.
func (a Averager[T]) Value() T {
	if len(a) == 0 {
		var empty T
		return empty
	}
	m := map[T]int{}
	for _, v := range a {
		m[v]++
	}
	current := 0
	var max T
	for k, v := range m {
		if v > current {
			current = v
			max = k
		}
	}
	return max
}

// MarshalJSON implements the json.Marshaler interface.
func (a Averager[T]) MarshalJSON() ([]byte, error) {
	v := a.Value()
	return json.Marshal(v)
}

// UnmarshalJSON implements the json.Unmarshaler interface.
func (a *Averager[T]) UnmarshalJSON(data []byte) error {
	var v T
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	*a = append(*a, v)
	return nil
}
