package controllers

import (
	"net/http"

	"product-gallery/utils"

	"github.com/gin-gonic/gin"
)

type ChatController struct {
	app *AppContext
}

// NewChatController wires chat routes to the shared app context.
func NewChatController(app *AppContext) *ChatController {
	return &ChatController{app: app}
}

// createChatRequest identifies either a logged-in user or an anonymous visitor
// device. At least one should be present in normal C-end usage.
type createChatRequest struct {
	VisitorDeviceID string `json:"visitor_device_id"`
	UserID          string `json:"user_id"`
}

// transferChatRequest moves a conversation to a different receiver admin.
type transferChatRequest struct {
	ReceiverAdminID string `json:"receiver_admin_id"`
}

// List returns Product Gallery chat bindings, not the Flow Talk message list.
func (ctl *ChatController) List(c *gin.Context) {
	page, pageSize, offset := utils.Pagination(c)
	items, total, err := ctl.app.Chats.List(page, pageSize, offset)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "CHAT_LIST_FAILED", err.Error())
		return
	}
	utils.OK(c, utils.Page{Items: items, Total: total, Page: page, PageSize: pageSize})
}

// Detail returns the business context attached to a chat binding.
func (ctl *ChatController) Detail(c *gin.Context) {
	chat, err := ctl.app.Chats.Find(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "CHAT_NOT_FOUND", "会话不存在")
		return
	}
	utils.OK(c, chat)
}

// CreateForProduct creates or reuses a product consultation binding before the
// frontend opens the actual Flow Talk conversation.
func (ctl *ChatController) CreateForProduct(c *gin.Context) {
	product, err := ctl.app.Products.Find(c.Param("id"), false)
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "PRODUCT_NOT_FOUND", "商品不存在或已下架")
		return
	}
	var req createChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "请求参数格式不正确")
		return
	}
	chat, err := ctl.app.Chats.CreateOrReuse(product, req.VisitorDeviceID, req.UserID)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "CHAT_CREATE_FAILED", err.Error())
		return
	}
	utils.OK(c, chat)
}

// Transfer changes the receiving administrator for future handling.
func (ctl *ChatController) Transfer(c *gin.Context) {
	var req transferChatRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.ReceiverAdminID == "" {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "接待管理员不能为空")
		return
	}
	if err := ctl.app.Chats.Transfer(c.Param("id"), req.ReceiverAdminID); err != nil {
		utils.Fail(c, http.StatusBadRequest, "CHAT_TRANSFER_FAILED", err.Error())
		return
	}
	utils.OK(c, gin.H{"ok": true})
}

// MarkRead is kept as an API placeholder so the frontend can wire the action
// now; unread counters can be backed by Flow Talk later.
func (ctl *ChatController) MarkRead(c *gin.Context) {
	utils.OK(c, gin.H{"ok": true})
}
