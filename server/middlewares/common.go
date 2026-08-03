package middlewares

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RequestID gives every request a stable id that can be saved in audit logs or
// returned to the frontend when troubleshooting.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.NewString()
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

// CORS keeps local Next.js development simple.
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Local development uses separate Next.js and Gin origins, so a broad
		// CORS policy keeps PC/mobile browser testing straightforward.
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

// SlowRequestMarker stores the start time for future logging extensions.
func SlowRequestMarker() gin.HandlerFunc {
	return func(c *gin.Context) {
		// The timestamp is currently metadata only; later logging middleware can
		// calculate duration without touching existing controllers.
		c.Set("started_at", time.Now())
		c.Next()
	}
}
