package conf

import (
	"bufio"
	"os"
	"strings"
)

// Config keeps the local development settings in one place.
//
// The project intentionally starts with explicit local values because the
// first implementation target is a developer machine. When deployment becomes
// concrete, this struct can be filled from environment variables or a config
// file without changing controllers or services.
type Config struct {
	App      AppConfig
	Database DatabaseConfig
	FlowTalk FlowTalkConfig
}

// AppConfig controls the HTTP server.
type AppConfig struct {
	Port string
}

// DatabaseConfig describes the local MySQL connection.
type DatabaseConfig struct {
	Host     string
	Port     string
	Username string
	Password string
	Database string
}

// FlowTalkConfig stores the minimal external identity settings used by the
// token placeholder endpoint. Real Flow Talk verification can later reuse the
// same provider value.
type FlowTalkConfig struct {
	Provider            string
	BaseURL             string
	DemoPeerAccessToken string
}

// Load returns the confirmed first-stage local configuration.
func Load() Config {
	fileValues := readAppINI("conf/app.ini")
	config := Config{
		App: AppConfig{
			// 8080 is reserved by the local flow-talk-server. Product Gallery
			// uses 18080 by default so both services can run together during
			// local integration testing. APP_PORT remains available when a
			// developer wants to override the business API port.
			Port: firstNonEmpty(os.Getenv("APP_PORT"), firstNonEmpty(fileValues["app.port"], "18080")),
		},
		Database: DatabaseConfig{
			Host:     firstNonEmpty(fileValues["database.host"], "127.0.0.1"),
			Port:     firstNonEmpty(fileValues["database.port"], "3306"),
			Username: firstNonEmpty(fileValues["database.username"], "root"),
			Password: firstNonEmpty(fileValues["database.password"], "admin"),
			Database: firstNonEmpty(fileValues["database.database"], "product_gallery"),
		},
		FlowTalk: FlowTalkConfig{
			Provider:            firstNonEmpty(fileValues["flow_talk.provider"], "demo"),
			BaseURL:             firstNonEmpty(fileValues["flow_talk.base_url"], "http://127.0.0.1:8080"),
			DemoPeerAccessToken: firstNonEmpty(fileValues["flow_talk.demo_peer_access_token"], "product-gallery-demo-client"),
		},
	}
	return config
}

func firstNonEmpty(value string, fallback string) string {
	if value != "" {
		return value
	}
	return fallback
}

// readAppINI is a tiny INI reader for the current local-only configuration.
// It supports the simple "[section] key = value" format used by conf/app.ini
// and deliberately ignores malformed lines so local comments do not break boot.
func readAppINI(path string) map[string]string {
	values := make(map[string]string)
	file, err := os.Open(path)
	if err != nil {
		return values
	}
	defer file.Close()

	section := ""
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, ";") || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasPrefix(line, "[") && strings.Contains(line, "]") {
			// Section names are folded into the final map key, for example
			// [flow_talk] provider becomes flow_talk.provider.
			section = strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(line, "["), "]"))
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if section != "" && key != "" {
			values[section+"."+key] = value
		}
	}
	return values
}

// DSN builds a MySQL DSN for GORM.
func (c DatabaseConfig) DSN() string {
	return c.Username + ":" + c.Password + "@tcp(" + c.Host + ":" + c.Port + ")/" + c.Database + "?charset=utf8mb4&parseTime=True&loc=Local"
}
