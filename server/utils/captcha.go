package utils

import (
	"github.com/mojocn/base64Captcha"
)

var captchaStore = base64Captcha.DefaultMemStore

// MakeCaptcha returns a captcha id and a base64 image. The implementation
// mirrors the referenced Gin MVC captcha demo while keeping the response shape
// consistent with this project.
func MakeCaptcha() (string, string, error) {
	driver := base64Captcha.NewDriverDigit(44, 120, 4, 0.7, 80)
	captcha := base64Captcha.NewCaptcha(driver, captchaStore)
	id, image, _, err := captcha.Generate()
	return id, image, err
}

// VerifyCaptcha validates and clears the captcha value.
func VerifyCaptcha(id string, value string) bool {
	return captchaStore.Verify(id, value, true)
}
