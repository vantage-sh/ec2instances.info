package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"slices"
	"time"
)

type chainSeed struct {
	RunTime   int64             `json:"run_time"`
	Instances []json.RawMessage `json:"instances"`
}

type gpuInstance struct {
	GPU      *float64 `json:"GPU"`
	GPUModel *string  `json:"GPU_model"`
}

func main() {
	// Get the arguments for the CLI.
	args := os.Args[1:]
	if len(args) != 3 {
		log.Fatal("Usage: diff-writer <connection-string> <key> <instances-file>")
	}

	// Make the transaction wrapper.
	tx, err := NewTxWrapperFromConnectionString(args[0])
	if err != nil {
		log.Fatal(err)
	}
	defer tx.Rollback()

	// Get the run time in one place so that everything is consistent.
	runTime := time.Now().Unix()

	// Try reading the seed from the database.
	var seed *chainSeed
	prevChainFound, err := tx.KVRead(args[1], &seed)
	if err != nil {
		log.Fatal(err)
	}

	// Try reading the instances from the file.
	instancesBytes, err := os.ReadFile(args[2])
	if err != nil {
		log.Fatal(err)
	}

	// Parse the instances.
	var instances []json.RawMessage
	if err := json.Unmarshal(instancesBytes, &instances); err != nil {
		log.Fatal(err)
	}

	// Log and handle any instances with GPUs that don't have a GPU model.
	toKill := []int{}
	for i, instance := range instances {
		var gpuInstance gpuInstance
		if err := json.Unmarshal(instance, &gpuInstance); err != nil {
			log.Fatal(err)
		}

		// Check if this is relevant.
		if gpuInstance.GPU != nil && *gpuInstance.GPU > 0 {
			if gpuInstance.GPUModel == nil {
				toKill = append(toKill, i)
				log.Printf("Instance %s has a GPU but no GPU model, not adding to chain yet.", instance)
			}
		}
	}

	// If relevant, remake the slice without the instances that need to be killed.
	if len(toKill) > 0 {
		newInstances := make([]json.RawMessage, 0, len(instances)-len(toKill))
		for i, instance := range instances {
			if !slices.Contains(toKill, i) {
				newInstances = append(newInstances, instance)
			}
		}
		instances = newInstances
	}

	if prevChainFound {
		// Compare the instances to the previous chain.
		chainCompare(args[1], seed.Instances, instances, runTime, tx)
	}

	// Write the new chain to the database.
	err = tx.KVWrite(args[1], &chainSeed{
		RunTime:   runTime,
		Instances: instances,
	})
	if err != nil {
		log.Fatal(err)
	}

	// Commit the transaction.
	if err := tx.Commit(); err != nil {
		log.Fatal(err)
	}
	fmt.Println("Done!")
}
