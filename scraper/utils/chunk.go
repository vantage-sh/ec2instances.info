package utils

// Chunk splits a slice into chunks of a given size.
func Chunk[T any](slice []T, chunkSize int) [][]T {
	chunks := make([][]T, 0, len(slice)/chunkSize+1)
	for i := 0; i < len(slice); i += chunkSize {
		end := min(i+chunkSize, len(slice))
		chunks = append(chunks, slice[i:end])
	}
	return chunks
}
