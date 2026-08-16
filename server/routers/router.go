package routers

import (
	"product-gallery/controllers"

	"github.com/gin-gonic/gin"
)

// Register mounts every route in one place. Controllers remain small and the
// API surface can be compared directly with IMPLEMENTATION.md.
func Register(r *gin.Engine, app *controllers.AppContext) {
	// Controllers are created once and reused by route handlers. They are light
	// wrappers around services, so keeping them here makes the route map compact.
	auth := controllers.NewAuthController(app)
	admins := controllers.NewAdminController(app)
	users := controllers.NewUserController(app)
	products := controllers.NewProductController(app)
	chats := controllers.NewChatController(app)
	settings := controllers.NewSettingController(app)
	uploads := controllers.NewUploadController(app)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"data": gin.H{"status": "ok"}})
	})
	// Uploaded files are saved under ./static and exposed from /static.
	r.Static("/static", "./static")

	api := r.Group("/api")
	{
		// Management routes are grouped under /api/admin. The frontend performs
		// most role-based page gating in the first stage, while critical writes
		// still keep basic parameter and business validation server-side.
		admin := api.Group("/admin")
		{
			admin.POST("/auth/login", auth.AdminLogin)
			admin.POST("/auth/logout", auth.AdminLogout)
			admin.GET("/auth/me", auth.AdminMe)
			admin.GET("/admins", admins.List)
			admin.POST("/admins", admins.Create)
			admin.PATCH("/admins/:id", admins.Update)
			admin.POST("/admins/:id/reset-password", admins.ResetPassword)
			admin.GET("/users", users.List)
			admin.GET("/users/:id", users.Detail)
			admin.PATCH("/users/:id", users.UpdateStatus)
			admin.POST("/users/:id/reset-password", users.ResetPassword)
			admin.GET("/products", products.AdminList)
			admin.POST("/products", products.Create)
			admin.GET("/products/:id", products.AdminDetail)
			admin.PATCH("/products/:id", products.Update)
			admin.POST("/products/:id/publish", products.Publish)
			admin.POST("/products/:id/offline", products.Offline)
			admin.DELETE("/products/:id", products.Delete)
			admin.POST("/products/:id/assign-owner", products.AssignOwner)
			admin.POST("/products/:id/convert-document", products.ConvertDocument)
			admin.GET("/settings/chat", settings.Chat)
			admin.PATCH("/settings/chat", settings.UpdateChat)
			admin.GET("/chats", chats.List)
			admin.GET("/chats/:id", chats.Detail)
			admin.POST("/chats/:id/transfer", chats.Transfer)
			admin.POST("/chats/:id/read", chats.MarkRead)
			admin.POST("/flow-talk/token", auth.FlowTalkToken)
			admin.POST("/uploads", uploads.Upload)
		}

		// C-end routes are grouped under /api/client and are safe for product
		// browsing before login. Profile and chat token routes still read the
		// Bearer session where needed.
		client := api.Group("/client")
		{
			client.POST("/visitor-device", users.VisitorDevice)
			client.GET("/captcha", auth.Captcha)
			client.POST("/auth/login", auth.ClientLogin)
			client.POST("/auth/logout", auth.ClientLogout)
			client.GET("/auth/me", auth.ClientMe)
			client.GET("/products", products.ClientList)
			client.GET("/products/:id", products.ClientDetail)
			client.GET("/profile", users.Profile)
			client.PATCH("/profile", users.UpdateProfile)
			client.POST("/profile/change-password", users.ChangePassword)
			client.POST("/products/:id/chat", chats.CreateForProduct)
			client.POST("/products/:id/chat/messages", chats.SendForProduct)
			client.GET("/chats/:id", chats.Detail)
			client.POST("/flow-talk/token", auth.FlowTalkToken)
			client.POST("/uploads", uploads.Upload)
		}
	}
}
