package controllers

import (
	"net/http"

	"product-gallery/utils"

	"github.com/gin-gonic/gin"
)

type UploadController struct {
	app *AppContext
}

// NewUploadController builds a controller around the upload service.
func NewUploadController(app *AppContext) *UploadController {
	return &UploadController{app: app}
}

// Upload saves files below server/static/{file_type}/{file_name}-{user_id} and
// returns the public /static URL for database fields or Markdown content.
func (ctl *UploadController) Upload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "FILE_REQUIRED", "请上传文件")
		return
	}
	fileType := c.DefaultPostForm("file_type", "document")
	userID := c.DefaultPostForm("user_id", "anonymous")
	url, err := ctl.app.Uploads.Save(c, fileType, userID, file)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "UPLOAD_FAILED", err.Error())
		return
	}
	utils.OK(c, gin.H{"url": url})
}
