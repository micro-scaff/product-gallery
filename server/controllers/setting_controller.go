package controllers

import (
	"net/http"

	"product-gallery/utils"

	"github.com/gin-gonic/gin"
)

type SettingController struct {
	app *AppContext
}

// NewSettingController builds the management settings controller.
func NewSettingController(app *AppContext) *SettingController {
	return &SettingController{app: app}
}

// chatSettingRequest updates the global chat availability switch.
type chatSettingRequest struct {
	Value     string `json:"value"`
	UpdatedBy string `json:"updated_by"`
}

// Chat returns the global chat policy used when a product inherits the setting.
func (ctl *SettingController) Chat(c *gin.Context) {
	setting, err := ctl.app.Settings.ChatPolicy()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "SETTING_LOAD_FAILED", err.Error())
		return
	}
	utils.OK(c, setting)
}

// UpdateChat persists the global chat policy.
func (ctl *SettingController) UpdateChat(c *gin.Context) {
	var req chatSettingRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Value == "" {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "配置值不能为空")
		return
	}
	setting, err := ctl.app.Settings.UpdateChatPolicy(req.Value, req.UpdatedBy)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "SETTING_UPDATE_FAILED", err.Error())
		return
	}
	utils.OK(c, setting)
}
