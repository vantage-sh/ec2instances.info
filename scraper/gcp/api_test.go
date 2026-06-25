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
