package services

import (
	"errors"
	"mime/multipart"
	"os"
	"path/filepath"

	"product-gallery/utils"

	"github.com/gin-gonic/gin"
)

type UploadService struct {
	staticRoot string
}

// NewUploadService stores the filesystem root used by Gin's static route.
func NewUploadService(staticRoot string) *UploadService {
	return &UploadService{staticRoot: staticRoot}
}

// Save stores a multipart file under server/static/{file_type}/{file_name}-{user_id}.
// The function is intentionally explicit so the storage rule is easy to audit.
func (s *UploadService) Save(c *gin.Context, fileType string, userID string, file *multipart.FileHeader) (string, error) {
	if fileType == "" || userID == "" {
		return "", errors.New("file_type 和 user_id 不能为空")
	}
	// Keep the original filename visible to managers while removing path tricks
	// such as "../" and control characters.
	safeName := utils.SafeFileName(file.Filename)
	storedName := safeName + "-" + userID
	dir := filepath.Join(s.staticRoot, fileType)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	target := filepath.Join(dir, storedName)
	if _, err := os.Stat(target); err == nil {
		// Avoid silent overwrite. The generated suffix still includes userID so
		// uploaded files stay traceable to their actor.
		storedName = safeName + "-" + utils.NewID(userID)
		target = filepath.Join(dir, storedName)
	}
	if err := c.SaveUploadedFile(file, target); err != nil {
		return "", err
	}
	return utils.PublicStaticURL(fileType, storedName), nil
}
