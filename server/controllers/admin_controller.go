package controllers

import (
	"net/http"

	"product-gallery/utils"

	"github.com/gin-gonic/gin"
)

type AdminController struct {
	app *AppContext
}

// NewAdminController keeps controller construction centralized for router.go.
func NewAdminController(app *AppContext) *AdminController {
	return &AdminController{app: app}
}

// createAdminRequest carries the minimal fields needed to create an ordinary
// administrator. The first stage keeps password storage plaintext by business
// requirement, so controllers only validate presence here.
type createAdminRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// updateAdminRequest is intentionally partial: empty fields mean "no change".
type updateAdminRequest struct {
	Username string `json:"username"`
	Status   string `json:"status"`
}

// resetPasswordRequest is reused by admin and C-end user password reset APIs.
type resetPasswordRequest struct {
	Password string `json:"password"`
}

// List returns paginated administrators for the management console.
func (ctl *AdminController) List(c *gin.Context) {
	page, pageSize, offset := utils.Pagination(c)
	items, total, err := ctl.app.Admins.List(page, pageSize, offset)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "ADMIN_LIST_FAILED", err.Error())
		return
	}
	utils.OK(c, utils.Page{Items: items, Total: total, Page: page, PageSize: pageSize})
}

// Create adds a normal administrator. Super admin creation is handled by the
// database seed path so there is only one bootstrap account.
func (ctl *AdminController) Create(c *gin.Context) {
	var req createAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Username == "" || req.Password == "" {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "账号和密码不能为空")
		return
	}
	admin, err := ctl.app.Admins.Create(req.Username, req.Password)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "ADMIN_CREATE_FAILED", err.Error())
		return
	}
	utils.Created(c, admin)
}

// Update edits the mutable parts of a normal administrator account.
func (ctl *AdminController) Update(c *gin.Context) {
	var req updateAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "请求参数格式不正确")
		return
	}
	admin, err := ctl.app.Admins.Update(c.Param("id"), req.Username, req.Status)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "ADMIN_UPDATE_FAILED", err.Error())
		return
	}
	utils.OK(c, admin)
}

// ResetPassword writes the new plaintext password according to the confirmed
// business rule.
func (ctl *AdminController) ResetPassword(c *gin.Context) {
	var req resetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Password == "" {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "新密码不能为空")
		return
	}
	if err := ctl.app.Admins.ResetPassword(c.Param("id"), req.Password); err != nil {
		utils.Fail(c, http.StatusBadRequest, "RESET_PASSWORD_FAILED", err.Error())
		return
	}
	utils.OK(c, gin.H{"ok": true})
}
