package controllers

import (
	"net/http"
	"strings"

	"product-gallery/services"
	"product-gallery/utils"

	"github.com/gin-gonic/gin"
)

type AuthController struct {
	app *AppContext
}

// NewAuthController builds an auth controller with access to shared services.
func NewAuthController(app *AppContext) *AuthController {
	return &AuthController{app: app}
}

// adminLoginRequest is the management-side login payload.
type adminLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// userLoginRequest supports both logged-in C-end users and visitor-device
// binding. The captcha fields are optional in early local integration.
type userLoginRequest struct {
	Phone             string `json:"phone"`
	Password          string `json:"password"`
	CaptchaID         string `json:"captcha_id"`
	CaptchaValue      string `json:"captcha_value"`
	DeviceFingerprint string `json:"device_fingerprint"`
}

// Captcha returns a base64 image captcha for the C-end login page.
func (ctl *AuthController) Captcha(c *gin.Context) {
	id, image, err := utils.MakeCaptcha()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "CAPTCHA_FAILED", err.Error())
		return
	}
	utils.OK(c, gin.H{"captcha_id": id, "captcha_image": image})
}

// AdminLogin validates a plaintext password and creates an in-memory session.
func (ctl *AuthController) AdminLogin(c *gin.Context) {
	var req adminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "请求参数格式不正确")
		return
	}
	session, admin, err := ctl.app.Auth.AdminLogin(req.Username, req.Password)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "LOGIN_FAILED", err.Error())
		return
	}
	utils.OK(c, gin.H{"session": session, "admin": admin})
}

// AdminMe returns the session stored behind the Bearer token.
func (ctl *AuthController) AdminMe(c *gin.Context) {
	session, ok := ctl.sessionFromHeader(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "未登录")
		return
	}
	utils.OK(c, session)
}

// AdminLogout deletes the in-memory token if it exists.
func (ctl *AuthController) AdminLogout(c *gin.Context) {
	token := bearerToken(c)
	if token != "" {
		ctl.app.Auth.Logout(token)
	}
	utils.OK(c, gin.H{"ok": true})
}

// ClientLogin mirrors admin login for C-end users and optionally binds the
// current browser device fingerprint to the logged-in user.
func (ctl *AuthController) ClientLogin(c *gin.Context) {
	var req userLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "INVALID_BODY", "请求参数格式不正确")
		return
	}
	if req.CaptchaID != "" && !utils.VerifyCaptcha(req.CaptchaID, req.CaptchaValue) {
		utils.Fail(c, http.StatusBadRequest, "CAPTCHA_INVALID", "验证码错误")
		return
	}
	session, user, err := ctl.app.Auth.UserLogin(req.Phone, req.Password)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "LOGIN_FAILED", err.Error())
		return
	}
	if req.DeviceFingerprint != "" {
		_, _ = ctl.app.Users.TouchVisitor(req.DeviceFingerprint, user.ID)
	}
	utils.OK(c, gin.H{"session": session, "user": user})
}

// ClientMe loads the C-end user represented by the current session.
func (ctl *AuthController) ClientMe(c *gin.Context) {
	session, ok := ctl.sessionFromHeader(c)
	if !ok || session.ActorType != "user" {
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

// ClientLogout invalidates a C-end session token.
func (ctl *AuthController) ClientLogout(c *gin.Context) {
	token := bearerToken(c)
	if token != "" {
		ctl.app.Auth.Logout(token)
	}
	utils.OK(c, gin.H{"ok": true})
}

// FlowTalkToken hands the frontend enough information to exchange the current
// Product Gallery identity for a Flow Talk JWT. In the temporary local plan the
// provider is "demo" and the Flow Talk server trusts any stable non-empty token.
func (ctl *AuthController) FlowTalkToken(c *gin.Context) {
	session, ok := ctl.sessionFromHeader(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "未登录")
		return
	}
	utils.OK(c, gin.H{
		"provider":               ctl.app.Config.FlowTalk.Provider,
		"token":                  flowTalkAccessToken(session),
		"actor":                  session.ActorID,
		"type":                   session.ActorType,
		"base_url":               ctl.app.Config.FlowTalk.BaseURL,
		"demo_peer_access_token": ctl.app.Config.FlowTalk.DemoPeerAccessToken,
	})
}

// sessionFromHeader extracts and validates the local Product Gallery session.
func (ctl *AuthController) sessionFromHeader(c *gin.Context) (services.Session, bool) {
	token := bearerToken(c)
	if token == "" {
		return services.Session{}, false
	}
	return ctl.app.Auth.Find(token)
}

// bearerToken strips the Authorization header down to the raw token value.
func bearerToken(c *gin.Context) string {
	header := c.GetHeader("Authorization")
	if strings.HasPrefix(header, "Bearer ") {
		return strings.TrimPrefix(header, "Bearer ")
	}
	return ""
}

// flowTalkAccessToken creates a deterministic external token for Flow Talk's
// demo provider. The same Product Gallery identity must always map to the same
// Flow Talk external_id, otherwise chat history would fragment across users.
func flowTalkAccessToken(session services.Session) string {
	// Flow Talk 的 demo provider 会把 access_token 加上 "demo_" 前缀后写入
	// users.username，而 Flow Talk 当前 username 最大长度是 64。这里保留项目、
	// 身份类型和内部 ID 作为稳定映射键，同时不拼接 role，避免管理员角色名让
	// token 超长导致 /api/auth/external 返回“参数校验失败”。
	parts := []string{"pg", session.ActorType, session.ActorID}
	token := strings.Join(parts, "-")
	replacer := strings.NewReplacer(":", "-", " ", "-", "_", "-")
	return replacer.Replace(token)
}
