package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// OK wraps every successful response in the agreed {"data": ...} envelope.
func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, gin.H{"data": data})
}

// Created is used by create endpoints while keeping the same response shape.
func Created(c *gin.Context, data any) {
	c.JSON(http.StatusCreated, gin.H{"data": data})
}

// Fail wraps errors in the agreed error envelope. Controllers use short error
// codes so the frontend can map them to stable user-facing copy.
func Fail(c *gin.Context, status int, code string, message string) {
	c.JSON(status, gin.H{
		"error": gin.H{
			"code":    code,
			"message": message,
		},
	})
}

// Page describes the common paginated response payload.
type Page struct {
	Items    any   `json:"items"`
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
}
