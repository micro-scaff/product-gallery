package main

import (
	"log"

	"product-gallery/conf"
	"product-gallery/controllers"
	"product-gallery/database"
	"product-gallery/middlewares"
	"product-gallery/routers"
	"product-gallery/services"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load local configuration first so database, uploads and Flow Talk settings
	// are available before controllers are constructed.
	config := conf.Load()

	db, err := database.Connect(config)
	if err != nil {
		log.Fatal("connect database failed: ", err)
	}

	// Services own business rules and database access. Controllers stay thin:
	// parse request -> call service -> return a unified response envelope.
	adminService := services.NewAdminService(db)
	app := &controllers.AppContext{
		Config:   config,
		DB:       db,
		Auth:     services.NewAuthService(db),
		Admins:   adminService,
		Users:    services.NewUserService(db),
		Products: services.NewProductService(db),
		Chats:    services.NewChatService(db, adminService),
		Settings: services.NewSettingService(db),
		Uploads:  services.NewUploadService("./static"),
	}

	// gin.Default mirrors the referenced demo and includes Logger + Recovery.
	r := gin.Default()
	// Keep local frontend integration friction low while still adding request
	// ids for debugging and future audit-log correlation.
	r.Use(middlewares.RequestID(), middlewares.CORS(), middlewares.SlowRequestMarker())

	// All HTTP routes are declared in routers.Register so the API surface is
	// easy to compare with IMPLEMENTATION.md.
	routers.Register(r, app)

	if err := r.Run(":" + config.App.Port); err != nil {
		log.Fatal("start server failed: ", err)
	}
}
