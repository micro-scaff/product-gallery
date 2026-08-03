package services

import (
	"errors"
	"sync"
	"time"

	"product-gallery/models"
	"product-gallery/utils"

	"gorm.io/gorm"
)

// Session is a deliberately simple in-memory login session. It keeps the first
// stage readable and avoids bringing in heavyweight auth while the product is
// still local-only.
type Session struct {
	Token     string    `json:"token"`
	ActorID   string    `json:"actor_id"`
	ActorType string    `json:"actor_type"`
	Role      string    `json:"role"`
	ExpiresAt time.Time `json:"expires_at"`
}

// AuthService handles plaintext-password login and token lookup.
type AuthService struct {
	db       *gorm.DB
	mu       sync.RWMutex
	sessions map[string]Session
}

func NewAuthService(db *gorm.DB) *AuthService {
	return &AuthService{
		db:       db,
		sessions: make(map[string]Session),
	}
}

// AdminLogin compares plaintext credentials and returns a local session.
func (s *AuthService) AdminLogin(username string, password string) (Session, models.Admin, error) {
	var admin models.Admin
	if err := s.db.Where("username = ?", username).First(&admin).Error; err != nil {
		return Session{}, admin, errors.New("账号或密码错误")
	}
	if admin.Status != "active" || admin.Password != password {
		return Session{}, admin, errors.New("账号或密码错误")
	}
	session := s.newSession(admin.ID, "admin", admin.Role)
	return session, admin, nil
}

// UserLogin does the same for C-end users and records last_login_at.
func (s *AuthService) UserLogin(phone string, password string) (Session, models.User, error) {
	var user models.User
	if err := s.db.Where("phone = ?", phone).First(&user).Error; err != nil {
		return Session{}, user, errors.New("手机号或密码错误")
	}
	if user.Status != "active" || user.Password != password {
		return Session{}, user, errors.New("手机号或密码错误")
	}
	now := time.Now()
	user.LastLoginAt = &now
	_ = s.db.Save(&user).Error
	session := s.newSession(user.ID, "user", "user")
	return session, user, nil
}

// Logout removes a token from the in-memory session map.
func (s *AuthService) Logout(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, token)
}

// Find validates token existence and expiration.
func (s *AuthService) Find(token string) (Session, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	session, ok := s.sessions[token]
	if !ok || time.Now().After(session.ExpiresAt) {
		return Session{}, false
	}
	return session, true
}

// newSession creates and stores a 24-hour local session token.
func (s *AuthService) newSession(actorID string, actorType string, role string) Session {
	session := Session{
		Token:     utils.NewID("tok"),
		ActorID:   actorID,
		ActorType: actorType,
		Role:      role,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[session.Token] = session
	return session
}
