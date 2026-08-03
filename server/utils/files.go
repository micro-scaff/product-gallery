package utils

import (
	"path/filepath"
	"strings"
	"unicode"
)

// SafeFileName strips path information and characters that should never be
// persisted as part of a server-side file path.
func SafeFileName(name string) string {
	base := filepath.Base(name)
	base = strings.TrimSpace(base)
	var builder strings.Builder
	for _, r := range base {
		if r == '/' || r == '\\' || unicode.IsControl(r) {
			continue
		}
		builder.WriteRune(r)
	}
	clean := strings.TrimSpace(builder.String())
	if clean == "" || clean == "." {
		return "upload"
	}
	return clean
}

// PublicStaticURL turns a static file path into the URL stored in the database.
func PublicStaticURL(fileType string, storedName string) string {
	return "/static/" + fileType + "/" + storedName
}
