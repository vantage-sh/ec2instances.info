package awsutils

import (
	"log"
	"strconv"
)

// Floaty makes sure a string is a float64, and crashes if it's not
func Floaty(s string) float64 {
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		log.Fatalln("Failed to parse float", s)
	}
	return f
}
