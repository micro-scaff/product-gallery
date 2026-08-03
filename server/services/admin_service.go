package services

import (
	"errors"

	"product-gallery/models"
	"product-gallery/utils"

	"gorm.io/gorm"
)

type AdminService struct {
	db *gorm.DB
}

// NewAdminService receives the shared GORM connection.
func NewAdminService(db *gorm.DB) *AdminService {
	return &AdminService{db: db}
}

// List returns administrators in newest-first order for the management table.
func (s *AdminService) List(page int, pageSize int, offset int) ([]models.Admin, int64, error) {
	var admins []models.Admin
	var total int64
	query := s.db.Model(&models.Admin{})
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("created_at desc").Limit(pageSize).Offset(offset).Find(&admins).Error
	return admins, total, err
}

// Create always creates an ordinary admin; the super admin is seeded separately.
func (s *AdminService) Create(username string, password string) (models.Admin, error) {
	admin := models.Admin{
		ID:       utils.NewID("adm"),
		Role:     "admin",
		Username: username,
		Password: password,
		Status:   "active",
	}
	return admin, s.db.Create(&admin).Error
}

// Update prevents editing the bootstrap super admin from the management UI.
func (s *AdminService) Update(id string, username string, status string) (models.Admin, error) {
	var admin models.Admin
	if err := s.db.First(&admin, "id = ?", id).Error; err != nil {
		return admin, err
	}
	if admin.Role == "super_admin" {
		return admin, errors.New("超级管理员不允许在后台编辑")
	}
	if username != "" {
		admin.Username = username
	}
	if status != "" {
		admin.Status = status
	}
	return admin, s.db.Save(&admin).Error
}

// ResetPassword updates plaintext password storage by explicit requirement.
func (s *AdminService) ResetPassword(id string, password string) error {
	return s.db.Model(&models.Admin{}).Where("id = ? AND role <> ?", id, "super_admin").Update("password", password).Error
}

// SuperAdminID is used as the fallback receiver for product consultations.
func (s *AdminService) SuperAdminID() string {
	var admin models.Admin
	if err := s.db.Where("role = ?", "super_admin").First(&admin).Error; err != nil {
		return ""
	}
	return admin.ID
}
