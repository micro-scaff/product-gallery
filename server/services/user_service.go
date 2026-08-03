package services

import (
	"time"

	"product-gallery/models"
	"product-gallery/utils"

	"gorm.io/gorm"
)

type UserService struct {
	db *gorm.DB
}

// NewUserService receives the shared GORM connection.
func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

// List supports simple keyword filtering for the management user table.
func (s *UserService) List(keyword string, page int, pageSize int, offset int) ([]models.User, int64, error) {
	var users []models.User
	var total int64
	query := s.db.Model(&models.User{})
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("id LIKE ? OR phone LIKE ?", like, like)
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("created_at desc").Limit(pageSize).Offset(offset).Find(&users).Error
	return users, total, err
}

// Find loads a C-end user by Product Gallery ID.
func (s *UserService) Find(id string) (models.User, error) {
	var user models.User
	err := s.db.First(&user, "id = ?", id).Error
	return user, err
}

// CreateIfMissing is useful for flows that first identify a phone number and
// then need a local account without duplicating users.
func (s *UserService) CreateIfMissing(phone string, password string) (models.User, error) {
	var user models.User
	err := s.db.Where("phone = ?", phone).First(&user).Error
	if err == nil {
		return user, nil
	}
	user = models.User{
		ID:       utils.NewID("usr"),
		Phone:    phone,
		Password: password,
		Status:   "active",
	}
	return user, s.db.Create(&user).Error
}

// UpdateStatus enables/disables a C-end account.
func (s *UserService) UpdateStatus(id string, status string) error {
	return s.db.Model(&models.User{}).Where("id = ?", id).Update("status", status).Error
}

// ResetPassword writes the new plaintext password for a C-end account.
func (s *UserService) ResetPassword(id string, password string) error {
	return s.db.Model(&models.User{}).Where("id = ?", id).Update("password", password).Error
}

// UpdateProfile applies self-service phone/avatar changes.
func (s *UserService) UpdateProfile(id string, phone string, avatarURL string) (models.User, error) {
	user, err := s.Find(id)
	if err != nil {
		return user, err
	}
	if phone != "" {
		user.Phone = phone
	}
	if avatarURL != "" {
		user.AvatarURL = avatarURL
	}
	return user, s.db.Save(&user).Error
}

// ChangePassword verifies the existing plaintext password before writing next.
func (s *UserService) ChangePassword(id string, current string, next string) error {
	user, err := s.Find(id)
	if err != nil {
		return err
	}
	if user.Password != current {
		return gorm.ErrInvalidData
	}
	return s.db.Model(&models.User{}).Where("id = ?", id).Update("password", next).Error
}

// TouchVisitor creates or refreshes an anonymous browser identity. If the same
// device later logs in, userID links pre-login activity to the account.
func (s *UserService) TouchVisitor(deviceFingerprint string, userID string) (models.VisitorDevice, error) {
	now := time.Now()
	var device models.VisitorDevice
	err := s.db.Where("device_fingerprint = ?", deviceFingerprint).First(&device).Error
	if err == nil {
		// Keep the original first_seen_at and only update the rolling presence
		// timestamp plus optional account binding.
		device.LastSeenAt = now
		if device.UserID == "" && userID != "" {
			device.UserID = userID
		}
		return device, s.db.Save(&device).Error
	}
	device = models.VisitorDevice{
		ID:                utils.NewID("dev"),
		DeviceFingerprint: deviceFingerprint,
		UserID:            userID,
		FirstSeenAt:       now,
		LastSeenAt:        now,
	}
	return device, s.db.Create(&device).Error
}
