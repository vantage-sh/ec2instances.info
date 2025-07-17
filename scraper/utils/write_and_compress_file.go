package utils

import (
	"compress/gzip"
	"log"
	"os"

	"github.com/andybalholm/brotli"
)

// WriteAndCompressFile writes a file and then compresses it to a .gz and .br file.
func WriteAndCompressFile(path string, data []byte) {
	var fg FunctionGroup

	// Standard write
	fg.Add(func() {
		err := os.WriteFile(path, data, 0644)
		if err != nil {
			log.Fatal("Failed to write file "+path, err)
		}
	})

	// Gzip
	fg.Add(func() {
		var err error
		gzPath := path + ".gz"
		gzFile, err := os.Create(gzPath)
		if err != nil {
			log.Fatal("Failed to create gzip file "+gzPath, err)
		}
		defer gzFile.Close()
		gzWriter := gzip.NewWriter(gzFile)
		_, err = gzWriter.Write(data)
		if err != nil {
			log.Fatal("Failed to write to gzip file "+gzPath, err)
		}
		err = gzWriter.Close()
		if err != nil {
			log.Fatal("Failed to close gzip file "+gzPath, err)
		}
	})

	// Brotli
	fg.Add(func() {
		var err error
		brPath := path + ".br"
		brFile, err := os.Create(brPath)
		if err != nil {
			log.Fatal("Failed to create brotli file "+brPath, err)
		}
		defer brFile.Close()
		brWriter := brotli.NewWriter(brFile)
		_, err = brWriter.Write(data)
		if err != nil {
			log.Fatal("Failed to write to brotli file "+brPath, err)
		}
		err = brWriter.Close()
		if err != nil {
			log.Fatal("Failed to close brotli file "+brPath, err)
		}
	})

	fg.Run()
}
