package controllers

import (
	"product-gallery/conf"
	"product-gallery/services"

	"gorm.io/gorm"
)

// AppContext wires controllers to shared services. Keeping this dependency
// object small makes the Gin route registration readable.
type AppContext struct {
	Config   conf.Config
	DB       *gorm.DB
	Auth     *services.AuthService
	Admins   *services.AdminService
	Users    *services.UserService
	Products *services.ProductService
	Chats    *services.ChatService
	Settings *services.SettingService
	Uploads  *services.UploadService
}
