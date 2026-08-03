package services

import (
	"time"

	"product-gallery/models"
	"product-gallery/utils"

	"gorm.io/gorm"
)

type ProductService struct {
	db *gorm.DB
}

// NewProductService receives the shared database connection.
func NewProductService(db *gorm.DB) *ProductService {
	return &ProductService{db: db}
}

// ProductInput is shared by create/update endpoints. Pointer price lets the
// service distinguish "not provided" from an explicit zero price.
type ProductInput struct {
	Title        string   `json:"title"`
	Summary      string   `json:"summary"`
	Price        *float64 `json:"price"`
	CoverURL     string   `json:"cover_url"`
	DetailMD     string   `json:"detail_md"`
	OwnerAdminID string   `json:"owner_admin_id"`
	ChatPolicy   string   `json:"chat_policy"`
	CreatedBy    string   `json:"created_by"`
}

// List applies different visibility rules for admin and C-end callers.
func (s *ProductService) List(admin bool, page int, pageSize int, offset int) ([]models.Product, int64, error) {
	var products []models.Product
	var total int64
	query := s.db.Model(&models.Product{}).Where("status <> ?", "deleted")
	if !admin {
		query = query.Where("status = ?", "published")
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("updated_at desc").Limit(pageSize).Offset(offset).Find(&products).Error
	return products, total, err
}

// Find enforces the same visibility rule for detail pages.
func (s *ProductService) Find(id string, admin bool) (models.Product, error) {
	var product models.Product
	query := s.db.Where("id = ? AND status <> ?", id, "deleted")
	if !admin {
		query = query.Where("status = ?", "published")
	}
	err := query.First(&product).Error
	return product, err
}

// Create starts every product as a draft so publishing remains deliberate.
func (s *ProductService) Create(input ProductInput) (models.Product, error) {
	chatPolicy := input.ChatPolicy
	if chatPolicy == "" {
		// "inherit" lets global chat settings control the product until a manager
		// chooses an explicit product-level policy.
		chatPolicy = "inherit"
	}
	product := models.Product{
		ID:           utils.NewID("prd"),
		Title:        input.Title,
		Summary:      input.Summary,
		Price:        input.Price,
		CoverURL:     input.CoverURL,
		DetailMD:     input.DetailMD,
		OwnerAdminID: input.OwnerAdminID,
		Status:       "draft",
		ChatPolicy:   chatPolicy,
		CreatedBy:    input.CreatedBy,
	}
	return product, s.db.Create(&product).Error
}

// Update is partial: empty strings mean "keep current value" for text fields.
func (s *ProductService) Update(id string, input ProductInput) (models.Product, error) {
	product, err := s.Find(id, true)
	if err != nil {
		return product, err
	}
	if input.Title != "" {
		product.Title = input.Title
	}
	if input.Summary != "" {
		product.Summary = input.Summary
	}
	if input.Price != nil {
		product.Price = input.Price
	}
	if input.CoverURL != "" {
		product.CoverURL = input.CoverURL
	}
	if input.DetailMD != "" {
		product.DetailMD = input.DetailMD
	}
	if input.OwnerAdminID != "" {
		product.OwnerAdminID = input.OwnerAdminID
	}
	if input.ChatPolicy != "" {
		product.ChatPolicy = input.ChatPolicy
	}
	return product, s.db.Save(&product).Error
}

// SetStatus handles publish/offline state changes.
func (s *ProductService) SetStatus(id string, status string) error {
	return s.db.Model(&models.Product{}).Where("id = ?", id).Update("status", status).Error
}

// SoftDelete marks the product deleted while preserving related rows.
func (s *ProductService) SoftDelete(id string) error {
	now := time.Now()
	return s.db.Model(&models.Product{}).Where("id = ?", id).Updates(map[string]any{
		"status":     "deleted",
		"deleted_at": &now,
	}).Error
}

// AssignOwner stores the default receiver admin for new consultations.
func (s *ProductService) AssignOwner(id string, ownerAdminID string) error {
	return s.db.Model(&models.Product{}).Where("id = ?", id).Update("owner_admin_id", ownerAdminID).Error
}
