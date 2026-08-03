package database

import (
	"errors"

	"product-gallery/conf"
	"product-gallery/models"
	"product-gallery/utils"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// Connect opens the local MySQL database and runs the first-stage migrations.
func Connect(config conf.Config) (*gorm.DB, error) {
	// GORM receives a DSN from conf so credentials stay outside controllers.
	db, err := gorm.Open(mysql.Open(config.Database.DSN()), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	// AutoMigrate is enough for the local first-stage project. If production
	// migration control is needed later, this is the single point to replace.
	if err := db.AutoMigrate(
		&models.Admin{},
		&models.User{},
		&models.VisitorDevice{},
		&models.Product{},
		&models.ChatBinding{},
		&models.SystemSetting{},
		&models.AuditLog{},
	); err != nil {
		return nil, err
	}
	if err := seedDefaults(db); err != nil {
		return nil, err
	}
	return db, nil
}

// seedDefaults ensures a fresh database can boot immediately with the known
// super admin and a global chat switch.
func seedDefaults(db *gorm.DB) error {
	var admin models.Admin
	err := db.Where("role = ?", "super_admin").First(&admin).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Password is intentionally stored as plaintext per business requirement.
		admin = models.Admin{
			ID:       utils.NewID("adm"),
			Role:     "super_admin",
			Username: "admin",
			Password: "product-gallery",
			Status:   "active",
		}
		if err := db.Create(&admin).Error; err != nil {
			return err
		}
	} else if err != nil {
		return err
	}

	var setting models.SystemSetting
	err = db.Where("`key` = ?", "chat.global_policy").First(&setting).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		// New installations allow chat by default; individual products can still
		// disable chat through product.chat_policy.
		setting = models.SystemSetting{
			Key:   "chat.global_policy",
			Value: "enabled",
		}
		return db.Create(&setting).Error
	}
	return err
}
