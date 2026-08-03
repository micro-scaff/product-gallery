package controllers

import (
	"net/http"

	"product-gallery/utils"

	"github.com/gin-gonic/gin"
)

type UserController struct {
	app *AppContext
}

// NewUserController wires user-management and C-end profile routes.
func NewUserController(app *AppContext) *UserController {
	return &UserController{app: app}
}

// updateUserRequest changes only the account status.
type updateUserRequest struct {
	Status string `json:"status"`
}

// updateProfileRequest carries C-end editable profile fields.
type updateProfileRequest struct {
	Phone     string `json:"phone"`
	AvatarURL string `json:"avatar_url"`
}

// changePasswordRequest keeps the old password check in the service layer.
type changePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// visitorDeviceRequest stores an anonymous browser identity and optionally
// binds it to a logged-in user.
type visitorDeviceRequest struct {
	DeviceFingerprint string `json:"device_fingerprint"`
	UserID            string `json:"user_id"`
}

// List returns C-end users for the management backend.
func (ctl *UserController) List(c *gin.Context) {
	page, pageSize, offset := utils.Pagination(c)
	items, total, err := ctl.app.Users.List(c.Query("keyword"), page, pageSize, offset)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "USER_LIST_FAILED", err.Error())
		return
	}
	utils.OK(c, utils.Page{Items: items, Total: total, Page: page, PageSize: pageSize})
}

// Detail loads a single C-end user by business ID.
func (ctl *UserController) Detail(c *gin.Context) {
	user, err := ctl.app.Users.Find(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "USER_NOT_FOUND", "用户不存在")
		return
	}
	utils.OK(c, user)
}

// UpdateStatus enables or disables a C-end account.
func (ctl *UserController) UpdateStatus(c *gin.Context) {
	var req updateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Status == "" {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "状态不能为空")
		return
	}
	if err := ctl.app.Users.UpdateStatus(c.Param("id"), req.Status); err != nil {
		utils.Fail(c, http.StatusBadRequest, "USER_UPDATE_FAILED", err.Error())
		return
	}
	utils.OK(c, gin.H{"ok": true})
}

// ResetPassword writes a new plaintext password for the selected C-end user.
func (ctl *UserController) ResetPassword(c *gin.Context) {
	var req resetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Password == "" {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "新密码不能为空")
		return
	}
	if err := ctl.app.Users.ResetPassword(c.Param("id"), req.Password); err != nil {
		utils.Fail(c, http.StatusBadRequest, "RESET_PASSWORD_FAILED", err.Error())
		return
	}
	utils.OK(c, gin.H{"ok": true})
}

// Profile returns the currently logged-in C-end user.
func (ctl *UserController) Profile(c *gin.Context) {
	auth := NewAuthController(ctl.app)
	session, ok := auth.sessionFromHeader(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "未登录")
		return
	}
	user, err := ctl.app.Users.Find(session.ActorID)
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "USER_NOT_FOUND", "用户不存在")
		return
	}
	utils.OK(c, user)
}

// UpdateProfile applies C-end self-service profile edits.
func (ctl *UserController) UpdateProfile(c *gin.Context) {
	auth := NewAuthController(ctl.app)
	session, ok := auth.sessionFromHeader(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "未登录")
		return
	}
	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "请求参数格式不正确")
		return
	}
	user, err := ctl.app.Users.UpdateProfile(session.ActorID, req.Phone, req.AvatarURL)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "PROFILE_UPDATE_FAILED", err.Error())
		return
	}
	utils.OK(c, user)
}

// ChangePassword verifies the current plaintext password before replacing it.
func (ctl *UserController) ChangePassword(c *gin.Context) {
	auth := NewAuthController(ctl.app)
	session, ok := auth.sessionFromHeader(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "未登录")
		return
	}
	var req changePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.NewPassword == "" {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "密码参数不正确")
		return
	}
	if err := ctl.app.Users.ChangePassword(session.ActorID, req.CurrentPassword, req.NewPassword); err != nil {
		utils.Fail(c, http.StatusBadRequest, "CHANGE_PASSWORD_FAILED", "当前密码不正确")
		return
	}
	utils.OK(c, gin.H{"ok": true})
}

// VisitorDevice creates or refreshes the anonymous visitor device record used
// to connect pre-login browsing and later chat/login actions.
func (ctl *UserController) VisitorDevice(c *gin.Context) {
	var req visitorDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.DeviceFingerprint == "" {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "设备 ID 不能为空")
		return
	}
	device, err := ctl.app.Users.TouchVisitor(req.DeviceFingerprint, req.UserID)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "DEVICE_SAVE_FAILED", err.Error())
		return
	}
	utils.OK(c, device)
}
