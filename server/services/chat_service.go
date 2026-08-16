package services

import (
	"time"

	"product-gallery/models"
	"product-gallery/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ChatService struct {
	db           *gorm.DB
	adminService *AdminService
}

// NewChatService needs AdminService so it can choose a fallback receiver.
func NewChatService(db *gorm.DB, adminService *AdminService) *ChatService {
	return &ChatService{db: db, adminService: adminService}
}

// List returns Product Gallery chat bindings ordered by latest activity.
func (s *ChatService) List(page int, pageSize int, offset int) ([]models.ChatBinding, int64, error) {
	var chats []models.ChatBinding
	var total int64
	query := s.db.Model(&models.ChatBinding{})
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("last_message_at desc").Limit(pageSize).Offset(offset).Find(&chats).Error
	return chats, total, err
}

// Find loads one chat binding by Product Gallery ID.
func (s *ChatService) Find(id string) (models.ChatBinding, error) {
	var chat models.ChatBinding
	err := s.db.First(&chat, "id = ?", id).Error
	return chat, err
}

// CreateOrReuse prevents duplicate open consultations for the same product and
// visitor/user. FlowTalkConversationID is a placeholder until Flow Talk creates
// the actual conversation during integration.
func (s *ChatService) CreateOrReuse(product models.Product, visitorDeviceID string, userID string) (models.ChatBinding, error) {
	var chat models.ChatBinding
	query := s.db.Where("product_id = ? AND status <> ?", product.ID, "closed")
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	} else {
		query = query.Where("visitor_device_id = ?", visitorDeviceID)
	}
	if err := query.First(&chat).Error; err == nil {
		return chat, nil
	}

	receiver := product.OwnerAdminID
	if receiver == "" {
		// If the product does not specify an owner, route to the bootstrap super
		// admin so new consultations are still visible in the management console.
		receiver = s.adminService.SuperAdminID()
	}
	now := time.Now()
	chat = models.ChatBinding{
		ID:                     utils.NewID("cht"),
		ProductID:              product.ID,
		ProductTitleSnapshot:   product.Title,
		VisitorDeviceID:        visitorDeviceID,
		UserID:                 userID,
		ReceiverAdminID:        receiver,
		FlowTalkConversationID: "flow_" + uuid.NewString(),
		Status:                 "open",
		LastMessageAt:          now,
	}
	return chat, s.db.Create(&chat).Error
}

// Transfer changes the receiver of an existing chat binding.
func (s *ChatService) Transfer(id string, receiverAdminID string) error {
	return s.db.Model(&models.ChatBinding{}).Where("id = ?", id).Update("receiver_admin_id", receiverAdminID).Error
}

// AttachFlowTalkConversation stores the real Flow Talk conversation id after
// the temporary local bridge creates a direct conversation and sends a message.
func (s *ChatService) AttachFlowTalkConversation(id string, conversationID string) error {
	return s.db.Model(&models.ChatBinding{}).Where("id = ?", id).Updates(map[string]any{
		"flow_talk_conversation_id": conversationID,
		"last_message_at":           time.Now(),
	}).Error
}
