package controllers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"product-gallery/models"
	"product-gallery/services"
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

// sendProductChatMessageRequest is the C-end popup payload. VisitorDeviceID is
// required for anonymous visitors so Flow Talk can map the browser to a stable
// demo-provider user.
type sendProductChatMessageRequest struct {
	VisitorDeviceID string `json:"visitor_device_id"`
	UserID          string `json:"user_id"`
	Text            string `json:"text"`
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

// SendForProduct is the temporary local Flow Talk bridge used by the C-end
// popup. It writes the visitor's text into Flow Talk so B-end operators can
// read it from the conversation workspace instead of seeing browser-local text.
func (ctl *ChatController) SendForProduct(c *gin.Context) {
	product, err := ctl.app.Products.Find(c.Param("id"), false)
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "PRODUCT_NOT_FOUND", "商品不存在或已下架")
		return
	}
	var req sendProductChatMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "请求参数格式不正确")
		return
	}
	req.Text = strings.TrimSpace(req.Text)
	req.VisitorDeviceID = strings.TrimSpace(req.VisitorDeviceID)
	if req.Text == "" {
		utils.Fail(c, http.StatusBadRequest, "MESSAGE_REQUIRED", "消息内容不能为空")
		return
	}
	if req.UserID == "" && req.VisitorDeviceID == "" {
		utils.Fail(c, http.StatusBadRequest, "VISITOR_REQUIRED", "游客设备不能为空")
		return
	}

	chat, err := ctl.app.Chats.CreateOrReuse(product, req.VisitorDeviceID, req.UserID)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "CHAT_CREATE_FAILED", err.Error())
		return
	}

	flowMessage, conversationID, err := ctl.sendFlowTalkText(chat, req.Text)
	if err != nil {
		utils.Fail(c, http.StatusBadGateway, "FLOW_TALK_SEND_FAILED", err.Error())
		return
	}
	flowConversationID := strconv.FormatInt(conversationID, 10)
	if err := ctl.app.Chats.AttachFlowTalkConversation(chat.ID, flowConversationID); err == nil {
		chat.FlowTalkConversationID = flowConversationID
		chat.LastMessageAt = time.Now()
	}

	utils.OK(c, gin.H{
		"chat":                      chat,
		"message":                   flowMessage,
		"flow_talk_conversation_id": flowConversationID,
	})
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

type flowTalkEnvelope[T any] struct {
	Code    int    `json:"code"`
	Data    T      `json:"data"`
	Message string `json:"message"`
}

type flowTalkLoginResult struct {
	User struct {
		ID int64 `json:"id"`
	} `json:"user"`
	Token string `json:"token"`
}

type flowTalkConversationResult struct {
	ID int64 `json:"id"`
}

type flowTalkMessageResult struct {
	ID             int64          `json:"id"`
	ConversationID int64          `json:"conversation_id"`
	SenderID       int64          `json:"sender_id"`
	MessageType    string         `json:"message_type"`
	Content        map[string]any `json:"content"`
	Status         string         `json:"status"`
	SentAt         string         `json:"sent_at"`
}

// sendFlowTalkText logs the visitor and receiving admin into Flow Talk's demo
// provider, creates/reuses their direct conversation, then sends the visitor's
// text as a real Flow Talk message.
func (ctl *ChatController) sendFlowTalkText(chat models.ChatBinding, text string) (flowTalkMessageResult, int64, error) {
	baseURL := strings.TrimRight(ctl.app.Config.FlowTalk.BaseURL, "/")
	provider := ctl.app.Config.FlowTalk.Provider

	visitorToken := flowTalkVisitorAccessToken(chat.VisitorDeviceID)
	if chat.UserID != "" {
		visitorToken = flowTalkAccessToken(services.Session{
			ActorID:   chat.UserID,
			ActorType: "user",
			Role:      "user",
		})
	}
	adminToken := flowTalkAccessToken(services.Session{
		ActorID:   chat.ReceiverAdminID,
		ActorType: "admin",
		Role:      "admin",
	})

	visitor, err := flowTalkExternalLogin(baseURL, provider, visitorToken)
	if err != nil {
		return flowTalkMessageResult{}, 0, fmt.Errorf("游客登录 Flow Talk 失败: %w", err)
	}
	admin, err := flowTalkExternalLogin(baseURL, provider, adminToken)
	if err != nil {
		return flowTalkMessageResult{}, 0, fmt.Errorf("管理员登录 Flow Talk 失败: %w", err)
	}
	conversation, err := flowTalkCreateDirect(baseURL, visitor.Token, admin.User.ID)
	if err != nil {
		return flowTalkMessageResult{}, 0, fmt.Errorf("创建 Flow Talk 单聊失败: %w", err)
	}
	message, err := flowTalkSendText(baseURL, visitor.Token, conversation.ID, text)
	if err != nil {
		return flowTalkMessageResult{}, 0, fmt.Errorf("发送 Flow Talk 消息失败: %w", err)
	}
	return message, conversation.ID, nil
}

func flowTalkExternalLogin(baseURL string, provider string, accessToken string) (flowTalkLoginResult, error) {
	return flowTalkPost[flowTalkLoginResult](baseURL, "/api/auth/external", "", gin.H{
		"provider":     provider,
		"access_token": accessToken,
	})
}

func flowTalkCreateDirect(baseURL string, token string, targetUserID int64) (flowTalkConversationResult, error) {
	return flowTalkPost[flowTalkConversationResult](baseURL, "/api/conversations/direct", token, gin.H{
		"target_user_id": targetUserID,
	})
}

func flowTalkSendText(baseURL string, token string, conversationID int64, text string) (flowTalkMessageResult, error) {
	return flowTalkPost[flowTalkMessageResult](baseURL, "/api/conversations/messages", token, gin.H{
		"conversation_id": conversationID,
		"client_msg_id":   "pg-c-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		"message_type":    "text",
		"content": gin.H{
			"text": text,
		},
	})
}

func flowTalkPost[T any](baseURL string, path string, token string, body any) (T, error) {
	var result T
	payload, err := json.Marshal(body)
	if err != nil {
		return result, err
	}
	request, err := http.NewRequest(http.MethodPost, baseURL+path, bytes.NewReader(payload))
	if err != nil {
		return result, err
	}
	request.Header.Set("Content-Type", "application/json")
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}

	client := http.Client{Timeout: 8 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return result, err
	}
	defer response.Body.Close()

	raw, err := io.ReadAll(response.Body)
	if err != nil {
		return result, err
	}
	var envelope flowTalkEnvelope[T]
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return result, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 || envelope.Code >= 400 {
		if envelope.Message == "" {
			envelope.Message = "Flow Talk 请求失败"
		}
		return result, errors.New(envelope.Message)
	}
	return envelope.Data, nil
}
