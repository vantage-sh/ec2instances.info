package gcp

import "testing"

// TestGPUMemoryByModel verifies that every GPU model string the Compute Engine
// API currently returns as a guestAcceleratorType maps to the correct per-GPU
// memory (GiB) from the official Google Cloud GPU documentation. Without this
// map the GPU_memory column was empty for every GCP GPU instance.
func TestGPUMemoryByModel(t *testing.T) {
	cases := map[string]int{
		"nvidia-h200-141gb":       141,
		"nvidia-h100-80gb":        80,
		"nvidia-h100-mega-80gb":   80,
		"nvidia-a100-80gb":        80,
		"nvidia-tesla-a100":       40,
		"nvidia-l4":               24,
		"nvidia-b200":             180,
		"nvidia-gb200":            186,
		"nvidia-rtx-pro-6000":     96,
		"nvidia-rtx-pro-6000-vws": 96,
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

// TestDetermineMachineFamily covers every currently-shipping GCP machine
// series, including the ones previously missing from the prefix list (C4D,
// C4N, H4D, M4N, A4, A4X, G4). Series without an explicit prefix must fall
// back to General purpose.
func TestDetermineMachineFamily(t *testing.T) {
	cases := map[string]string{
		// General purpose
		"e2-standard-4":  "General purpose",
		"n1-standard-8":  "General purpose",
		"n2-standard-8":  "General purpose",
		"n2d-standard-8": "General purpose",
		"n4-standard-8":  "General purpose",
		"n4a-standard-8": "General purpose",
		"n4d-standard-8": "General purpose",
		"t2a-standard-8": "General purpose",
		"t2d-standard-8": "General purpose",
		// Compute optimized
		"c2-standard-8":    "Compute optimized",
		"c2d-standard-8":   "Compute optimized",
		"c3-standard-8":    "Compute optimized",
		"c3d-standard-8":   "Compute optimized",
		"c4-standard-8":    "Compute optimized",
		"c4a-standard-8":   "Compute optimized",
		"c4d-standard-8":   "Compute optimized",
		"h3-standard-88":   "Compute optimized",
		"h4d-standard-192": "Compute optimized",
		// Network optimized
		"c4n-standard-8": "Network optimized",
		// Memory optimized (highmem/megamem/ultramem variants match the
		// contains checks; prefixes cover the rest)
		"c4d-highmem-8":   "Memory optimized",
		"m1-megamem-96":   "Memory optimized",
		"m2-ultramem-208": "Memory optimized",
		"m3-megamem-64":   "Memory optimized",
		"m4-hypermem-16":  "Memory optimized",
		"m4n-hypermem-16": "Memory optimized",
		"x4-megamem-960":  "Memory optimized",
		// Accelerator optimized
		"a2-highgpu-1g":  "Accelerator optimized",
		"a3-highgpu-8g":  "Accelerator optimized",
		"a4-highgpu-8g":  "Accelerator optimized",
		"a4x-highgpu-4g": "Accelerator optimized",
		"g2-standard-4":  "Accelerator optimized",
		"g4-standard-48": "Accelerator optimized",
		// Storage optimized (real Z3 shapes are all z3-highmem-*, so the z3-
		// prefix must be checked ahead of the highmem rule above)
		"z3-highmem-88-highlssd":        "Storage optimized",
		"z3-highmem-192-highlssd-metal": "Storage optimized",
	}

	for name, want := range cases {
		if got := determineMachineFamily(name); got != want {
			t.Errorf("determineMachineFamily(%q) = %q, want %q", name, got, want)
		}
	}
}

// TestParseMachineTypeFromSKU verifies SKU display-name parsing, in
// particular the family tokens that were previously missing from
// machineTypeRegex (which caused whole series to be dropped from the dataset
// for lack of pricing) and the legacy C2/M1 naming fallback.
func TestParseMachineTypeFromSKU(t *testing.T) {
	cases := []struct {
		display      string
		wantFamily   string
		wantResource string
		wantSpot     bool
	}{
		{"N1 Predefined Instance Ram running in Zurich", "N1", "ram", false},
		{"Spot Preemptible E2 Instance Core running in Paris", "E2", "core", true},
		{"C4A Arm Instance Core running in Northern Virginia", "C4A", "core", false},
		{"C4D Instance Core running in Americas", "C4D", "core", false},
		{"C4D Instance Ram running in Tokyo", "C4D", "ram", false},
		{"C4N Instance Core running in Iowa", "C4N", "core", false},
		{"N4A Instance Ram running in Iowa", "N4A", "ram", false},
		{"M4N Instance Core running in Frankfurt", "M4N", "core", false},
		{"H4D Instance Core running in Iowa", "H4D", "core", false},
		{"X4 Instance Ram running in Frankfurt", "X4", "ram", false},
		// a2/a3/g2 remain in the allowlist (pre-existing upstream coverage).
		{"A2 Instance Core running in Iowa", "A2", "core", false},
		{"A3 Instance Ram running in Iowa", "A3", "ram", false},
		{"G2 Instance Ram running in Iowa", "G2", "ram", false},
		// g4/a4/a4x are deliberately excluded: their GPU charge is not assembled,
		// so they must parse to no family (dropping the shape) rather than publish
		// a core+RAM-only price.
		{"G4 Instance Ram running in Iowa", "", "", false},
		{"Spot Preemptible G4 Instance Core running in Iowa", "", "", true},
		{"A4 Instance Core running in Iowa", "", "", false},
		{"A4X Instance Core running in Iowa", "", "", false},
		// Legacy first-generation naming with no family token.
		{"Compute optimized Core running in Americas", "C2", "core", false},
		{"Compute optimized Ram running in Americas", "C2", "ram", false},
		{"Spot Preemptible Compute optimized Core running in Paris", "C2", "core", true},
		// C2's per-region SKUs (the newer me-*/europe-*/africa-south1 regions)
		// add an "Instance" token the multi-regional form omits; both map to C2.
		{"Compute optimized Instance Core running in Madrid", "C2", "core", false},
		{"Compute optimized Instance Ram running in Mexico", "C2", "ram", false},
		{"Spot Preemptible Compute optimized Instance Core running in Johannesburg", "C2", "core", true},
		{"Memory-optimized Instance Core running in Northern Virginia", "M1", "core", false},
		{"Memory-optimized Instance Ram running in Tokyo", "M1", "ram", false},
		// The M2 surcharge SKU must not be attributed to M1 baseline rates.
		{"Memory Optimized Upgrade Premium for Memory-optimized Instance Core running in Singapore", "", "", false},
		// m4-ultramem-224 bills from its own dedicated SKU pair; the plain M4
		// SKU shared by every other M4 shape must not be conflated with it.
		{"M4Ultramem224 Instance Core running in Americas", "M4ULTRAMEM224", "core", false},
		{"M4Ultramem224 Instance Ram running in Americas", "M4ULTRAMEM224", "ram", false},
		{"Spot Preemptible M4Ultramem224 Instance Core running in Frankfurt", "M4ULTRAMEM224", "core", true},
		{"M4 Instance Core running in Americas", "M4", "core", false},
		{"M4 Instance Ram running in Americas", "M4", "ram", false},
	}

	for _, tc := range cases {
		family, resource, _, isSpot, _ := parseMachineTypeFromSKU(SKU{DisplayName: tc.display})
		if family != tc.wantFamily || resource != tc.wantResource || isSpot != tc.wantSpot {
			t.Errorf("parseMachineTypeFromSKU(%q) = (%q, %q, spot=%v), want (%q, %q, spot=%v)",
				tc.display, family, resource, isSpot,
				tc.wantFamily, tc.wantResource, tc.wantSpot)
		}
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

// TestGPUSpec covers the machine-specs GPU derivation: the fractional-slice G4
// shapes report count 1 with their documented per-slice memory, whole-GPU shapes
// multiply the API count by per-GPU memory, and A4X Max's GB300 (279 GB/GPU)
// yields the documented 1,116 GB total.
func TestGPUSpec(t *testing.T) {
	if got := gpuMemoryByModel["nvidia-gb300"]; got != 279 {
		t.Errorf("gpuMemoryByModel[nvidia-gb300] = %d, want 279", got)
	}

	cases := []struct {
		name       string
		machine    string
		model      string
		count      int
		wantGPU    float64
		wantMemory int
	}{
		{"g4-standard-6 is 1/8 GPU", "g4-standard-6", "nvidia-rtx-pro-6000", 1, 0.125, 12},
		{"g4-standard-12 is 1/4 GPU", "g4-standard-12", "nvidia-rtx-pro-6000", 1, 0.25, 24},
		{"g4-standard-24 is 1/2 GPU", "g4-standard-24", "nvidia-rtx-pro-6000", 1, 0.5, 48},
		{"g4-standard-48 is one whole GPU", "g4-standard-48", "nvidia-rtx-pro-6000", 1, 1, 96},
		{"g4-standard-96 is two whole GPUs", "g4-standard-96", "nvidia-rtx-pro-6000", 2, 2, 192},
		{"a4x max is four GB300 GPUs", "a4x-maxgpu-4g-metal", "nvidia-gb300", 4, 4, 1116},
		{"a2 standard eight A100s (int not truncated)", "a2-highgpu-8g", "nvidia-tesla-a100", 8, 8, 320},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			gpu, mem := gpuSpec(c.machine, c.model, c.count)
			if gpu != c.wantGPU || mem != c.wantMemory {
				t.Errorf("gpuSpec(%q, %q, %d) = (%v, %d), want (%v, %d)",
					c.machine, c.model, c.count, gpu, mem, c.wantGPU, c.wantMemory)
			}
		})
	}
}
