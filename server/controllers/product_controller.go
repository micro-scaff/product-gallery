package controllers

import (
	"net/http"
	"path/filepath"

	"product-gallery/services"
	"product-gallery/utils"

	"github.com/gin-gonic/gin"
)

type ProductController struct {
	app *AppContext
}

// NewProductController builds the product HTTP controller.
func NewProductController(app *AppContext) *ProductController {
	return &ProductController{app: app}
}

// assignOwnerRequest lets a super admin move a product to another receiver.
type assignOwnerRequest struct {
	OwnerAdminID string `json:"owner_admin_id"`
}

// AdminList shows every non-deleted product, including drafts and offline items.
func (ctl *ProductController) AdminList(c *gin.Context) {
	ctl.list(c, true)
}

// ClientList only exposes published products to visitors and C-end users.
func (ctl *ProductController) ClientList(c *gin.Context) {
	ctl.list(c, false)
}

// list shares pagination logic while keeping admin/client visibility separate.
func (ctl *ProductController) list(c *gin.Context, admin bool) {
	page, pageSize, offset := utils.Pagination(c)
	items, total, err := ctl.app.Products.List(admin, page, pageSize, offset)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "PRODUCT_LIST_FAILED", err.Error())
		return
	}
	utils.OK(c, utils.Page{Items: items, Total: total, Page: page, PageSize: pageSize})
}

// AdminDetail returns any non-deleted product for management editing.
func (ctl *ProductController) AdminDetail(c *gin.Context) {
	ctl.detail(c, true)
}

// ClientDetail hides drafts, offline products and deleted products.
func (ctl *ProductController) ClientDetail(c *gin.Context) {
	ctl.detail(c, false)
}

// detail centralizes product visibility and not-found handling.
func (ctl *ProductController) detail(c *gin.Context, admin bool) {
	product, err := ctl.app.Products.Find(c.Param("id"), admin)
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "PRODUCT_NOT_FOUND", "商品不存在或已下架")
		return
	}
	utils.OK(c, product)
}

// Create saves a draft product. Publishing is a separate explicit action.
func (ctl *ProductController) Create(c *gin.Context) {
	var req services.ProductInput
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "请求参数格式不正确")
		return
	}
	product, err := ctl.app.Products.Create(req)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "PRODUCT_CREATE_FAILED", err.Error())
		return
	}
	utils.Created(c, product)
}

// Update applies partial product edits from the management form.
func (ctl *ProductController) Update(c *gin.Context) {
	var req services.ProductInput
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "请求参数格式不正确")
		return
	}
	product, err := ctl.app.Products.Update(c.Param("id"), req)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "PRODUCT_UPDATE_FAILED", err.Error())
		return
	}
	utils.OK(c, product)
}

// Publish makes a product visible on the C-end product list.
func (ctl *ProductController) Publish(c *gin.Context) {
	ctl.setStatus(c, "published")
}

// Offline hides a product from C-end users without deleting management history.
func (ctl *ProductController) Offline(c *gin.Context) {
	ctl.setStatus(c, "offline")
}

// setStatus keeps status transitions small while services own the database call.
func (ctl *ProductController) setStatus(c *gin.Context, status string) {
	if err := ctl.app.Products.SetStatus(c.Param("id"), status); err != nil {
		utils.Fail(c, http.StatusBadRequest, "PRODUCT_STATUS_FAILED", err.Error())
		return
	}
	utils.OK(c, gin.H{"ok": true})
}

// Delete performs a soft delete so existing chat/business history remains valid.
func (ctl *ProductController) Delete(c *gin.Context) {
	if err := ctl.app.Products.SoftDelete(c.Param("id")); err != nil {
		utils.Fail(c, http.StatusBadRequest, "PRODUCT_DELETE_FAILED", err.Error())
		return
	}
	utils.OK(c, gin.H{"ok": true})
}

// AssignOwner changes the default receiver used when new product chats are made.
func (ctl *ProductController) AssignOwner(c *gin.Context) {
	var req assignOwnerRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.OwnerAdminID == "" {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "负责人不能为空")
		return
	}
	if err := ctl.app.Products.AssignOwner(c.Param("id"), req.OwnerAdminID); err != nil {
		utils.Fail(c, http.StatusBadRequest, "ASSIGN_OWNER_FAILED", err.Error())
		return
	}
	utils.OK(c, gin.H{"ok": true})
}

// ConvertDocument stores the uploaded source document and returns starter
// Markdown. Real Word/PDF parsing can be plugged into this endpoint later.
func (ctl *ProductController) ConvertDocument(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "FILE_REQUIRED", "请上传文件")
		return
	}
	userID := c.DefaultPostForm("user_id", "admin")
	url, err := ctl.app.Uploads.Save(c, "document", userID, file)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "UPLOAD_FAILED", err.Error())
		return
	}
	ext := filepath.Ext(file.Filename)
	markdown := "已上传文档：" + file.Filename + "\n\n文件地址：" + url + "\n\n当前首期实现保留原文件并返回可编辑 Markdown，后续可在此处接入 " + ext + " 解析器。"
	utils.OK(c, gin.H{"markdown": markdown, "file_url": url})
}
