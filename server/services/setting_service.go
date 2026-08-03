package services

import (
	"product-gallery/models"

	"gorm.io/gorm"
)

type SettingService struct {
	db *gorm.DB
}

// NewSettingService receives the shared GORM connection.
func NewSettingService(db *gorm.DB) *SettingService {
	return &SettingService{db: db}
}

// ChatPolicy returns the global chat switch seeded during database startup.
func (s *SettingService) ChatPolicy() (models.SystemSetting, error) {
	var setting models.SystemSetting
	err := s.db.First(&setting, "`key` = ?", "chat.global_policy").Error
	return setting, err
}

// UpdateChatPolicy upserts the chat switch using key as the primary key.
func (s *SettingService) UpdateChatPolicy(value string, updatedBy string) (models.SystemSetting, error) {
	setting := models.SystemSetting{
		Key:       "chat.global_policy",
		Value:     value,
		UpdatedBy: updatedBy,
	}
	err := s.db.Save(&setting).Error
	return setting, err
}
