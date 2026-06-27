package gcp

import "testing"

// TestGPUMemoryByModel verifies that every GPU model string the Compute Engine
// API currently returns as a guestAcceleratorType maps to the correct per-GPU
// memory (GiB) from the official Google Cloud GPU documentation. Without this
// map the GPU_memory column was empty for every GCP GPU instance.
func TestGPUMemoryByModel(t *testing.T) {
	cases := map[string]int{
		"nvidia-h200-141gb":     141,
		"nvidia-h100-80gb":      80,
		"nvidia-h100-mega-80gb": 80,
		"nvidia-a100-80gb":      80,
		"nvidia-tesla-a100":     40,
		"nvidia-l4":             24,
	}
	for model, want := range cases {
		if got := gpuMemoryByModel[model]; got != want {
			t.Errorf("gpuMemoryByModel[%q] = %d, want %d", model, got, want)
		}
	}

	// Unknown models must return the zero value so the field is omitted rather
	// than fabricated.
	if got := gpuMemoryByModel["nvidia-unknown-future"]; got != 0 {
		t.Errorf("unknown model memory = %d, want 0", got)
	}
}

func TestTotalGPUMemory(t *testing.T) {
	cases := []struct {
		name     string
		count    int
		model    string
		expected int
	}{
		{
			name:     "single A100 40GB",
			count:    1,
			model:    "nvidia-tesla-a100",
			expected: 40,
		},
		{
			name:     "eight A100 40GB GPUs",
			count:    8,
			model:    "nvidia-tesla-a100",
			expected: 320,
		},
		{
			name:     "eight H200 141GB GPUs",
			count:    8,
			model:    "nvidia-h200-141gb",
			expected: 1128,
		},
		{
			name:     "unknown future model",
			count:    8,
			model:    "nvidia-unknown-future",
			expected: 0,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := totalGPUMemory(c.count, c.model)
			if got != c.expected {
				t.Errorf("totalGPUMemory(%d, %q) = %d, want %d", c.count, c.model, got, c.expected)
			}
		})
	}
}
