package main

import (
	"encoding/json"
	"log"

	"github.com/wI2L/jsondiff"
)

func instances2id(instances []json.RawMessage) map[string]json.RawMessage {
	idMap := make(map[string]json.RawMessage)
	for _, instance := range instances {
		var idInStruct struct {
			InstanceType string `json:"instance_type"`
		}
		if err := json.Unmarshal(instance, &idInStruct); err != nil {
			log.Fatal(err)
		}
		if _, ok := idMap[idInStruct.InstanceType]; ok {
			log.Fatalf("Instance type %s is not unique", idInStruct.InstanceType)
		}
		idMap[idInStruct.InstanceType] = instance
	}
	return idMap
}

type EventType string

const (
	EventTypeAdd    EventType = "add"
	EventTypeRemove EventType = "remove"
	EventTypeUpdate EventType = "update"
)

type Event struct {
	EventType    EventType `json:"event_type"`
	InstanceType string    `json:"instance_type"`

	// This is set when a instance is added.
	FullInstance json.RawMessage `json:"full_instance,omitempty"`

	// This is set when a instance is updated.
	JsonDiff json.RawMessage `json:"json_diff,omitempty"`
}

func chainCompare(prevInstances, newInstances []json.RawMessage, runTime int64, tx *TxWrapper) {
	prevIdMap := instances2id(prevInstances)
	newIdMap := instances2id(newInstances)

	for prevInstanceType, prevInstance := range prevIdMap {
		newInstance, ok := newIdMap[prevInstanceType]
		if ok {
			// Perform a diff between the two instances.
			diff, err := jsondiff.CompareJSON(prevInstance, newInstance)
			if err != nil {
				log.Fatal(err)
			}
			if diff != nil {
				diffBytes, err := json.Marshal(diff)
				if err != nil {
					log.Fatal(err)
				}
				tx.WriteToBlockchain(prevInstanceType, runTime, &Event{
					EventType:    EventTypeUpdate,
					InstanceType: prevInstanceType,
					JsonDiff:     diffBytes,
				})
			}
		} else {
			// The instance was removed.
			tx.WriteToBlockchain(prevInstanceType, runTime, &Event{
				EventType:    EventTypeRemove,
				InstanceType: prevInstanceType,
			})
		}
	}

	for newInstanceType, newInstance := range newIdMap {
		if _, ok := prevIdMap[newInstanceType]; !ok {
			tx.WriteToBlockchain(newInstanceType, runTime, &Event{
				EventType:    EventTypeAdd,
				InstanceType: newInstanceType,
				FullInstance: newInstance,
			})
		}
	}
}
