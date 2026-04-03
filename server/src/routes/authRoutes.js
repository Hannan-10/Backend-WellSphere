const express = require('express')
const authController = require('../controllers/authController')
const otpController = require('../controllers/otpController')
const { requireAuth } = require('../middlewares/requireAuth')

const router = express.Router()

router.post('/sign-up', authController.signUp)
router.post('/sign-in', authController.signIn)
router.post('/social-sign-in', authController.socialSignIn)
router.post('/refresh', authController.refresh)
router.post('/send-otp', otpController.sendOtp)
router.post('/verify-otp', otpController.verifyOtpAuth)
router.post('/forgot-password/send-otp', otpController.sendForgotPasswordOtp)
router.post('/forgot-password/verify-otp', otpController.verifyForgotPasswordOtp)
router.post('/forgot-password/reset-password', authController.resetPassword)
router.get('/profile-strength', requireAuth, authController.profileStrength)
router.post('/logout', requireAuth, authController.logout)
router.delete('/account', requireAuth, authController.deleteAccount)

module.exports = router
