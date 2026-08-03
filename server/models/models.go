package models

import "time"

// Admin represents both the configured super administrator and ordinary
// administrators created from the management backend. Password is intentionally
// plaintext because that is a confirmed business requirement.
type Admin struct {
	ID        string    `json:"id" gorm:"primaryKey;size:64"`
	Role      string    `json:"role" gorm:"size:32;index"`
	Username  string    `json:"username" gorm:"uniqueIndex;size:120"`
	Password  string    `json:"password,omitempty" gorm:"size:255"`
	Status    string    `json:"status" gorm:"size:32;index"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// User is the C-end account. Phone and password are enough for the first login
// flow; avatar_url is filled by the upload endpoint.
type User struct {
	ID          string     `json:"id" gorm:"primaryKey;size:64"`
	Phone       string     `json:"phone" gorm:"uniqueIndex;size:32"`
	Password    string     `json:"password,omitempty" gorm:"size:255"`
	AvatarURL   string     `json:"avatar_url" gorm:"size:500"`
	Status      string     `json:"status" gorm:"size:32;index"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	LastLoginAt *time.Time `json:"last_login_at"`
}

// VisitorDevice stores the FingerprintJS identifier without saving raw browser
// fingerprint material.
type VisitorDevice struct {
	ID                string    `json:"id" gorm:"primaryKey;size:64"`
	DeviceFingerprint string    `json:"device_fingerprint" gorm:"uniqueIndex;size:255"`
	UserID            string    `json:"user_id" gorm:"size:64;index"`
	FirstSeenAt       time.Time `json:"first_seen_at"`
	LastSeenAt        time.Time `json:"last_seen_at"`
}

// Product stores the Markdown source and product lifecycle state.
type Product struct {
	ID           string     `json:"id" gorm:"primaryKey;size:64"`
	Title        string     `json:"title" gorm:"size:255;index"`
	Summary      string     `json:"summary" gorm:"type:text"`
	Price        *float64   `json:"price"`
	CoverURL     string     `json:"cover_url" gorm:"size:500"`
	DetailMD     string     `json:"detail_md" gorm:"type:longtext"`
	OwnerAdminID string     `json:"owner_admin_id" gorm:"size:64;index"`
	Status       string     `json:"status" gorm:"size:32;index"`
	ChatPolicy   string     `json:"chat_policy" gorm:"size:32;index"`
	CreatedBy    string     `json:"created_by" gorm:"size:64;index"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	DeletedAt    *time.Time `json:"deleted_at"`
}

// ChatBinding connects Product Gallery business context with a Flow Talk
// conversation id.
type ChatBinding struct {
	ID                     string    `json:"id" gorm:"primaryKey;size:64"`
	ProductID              string    `json:"product_id" gorm:"size:64;index"`
	ProductTitleSnapshot   string    `json:"product_title_snapshot" gorm:"size:255"`
	VisitorDeviceID        string    `json:"visitor_device_id" gorm:"size:64;index"`
	UserID                 string    `json:"user_id" gorm:"size:64;index"`
	ReceiverAdminID        string    `json:"receiver_admin_id" gorm:"size:64;index"`
	FlowTalkConversationID string    `json:"flow_talk_conversation_id" gorm:"uniqueIndex;size:120"`
	Status                 string    `json:"status" gorm:"size:32;index"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
	LastMessageAt          time.Time `json:"last_message_at"`
}

// SystemSetting stores small global switches such as the chat policy.
type SystemSetting struct {
	Key       string    `json:"key" gorm:"primaryKey;size:120"`
	Value     string    `json:"value" gorm:"type:text"`
	UpdatedBy string    `json:"updated_by" gorm:"size:64"`
	UpdatedAt time.Time `json:"updated_at"`
}

// AuditLog records important mutations. It is intentionally lightweight so it
// can be called from controllers without a complicated event system.
type AuditLog struct {
	ID         string    `json:"id" gorm:"primaryKey;size:64"`
	ActorType  string    `json:"actor_type" gorm:"size:32;index"`
	ActorID    string    `json:"actor_id" gorm:"size:64;index"`
	Action     string    `json:"action" gorm:"size:120;index"`
	TargetType string    `json:"target_type" gorm:"size:80;index"`
	TargetID   string    `json:"target_id" gorm:"size:64;index"`
	Result     string    `json:"result" gorm:"size:32"`
	RequestID  string    `json:"request_id" gorm:"size:120;index"`
	CreatedAt  time.Time `json:"created_at"`
}
