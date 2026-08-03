package utils

import "github.com/google/uuid"

// NewID centralizes id generation so models and placeholder tokens are easy to
// read in controllers and services.
func NewID(prefix string) string {
	return prefix + "_" + uuid.NewString()
}
