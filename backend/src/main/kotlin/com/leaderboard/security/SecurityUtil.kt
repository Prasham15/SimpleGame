package com.leaderboard.security

import java.security.MessageDigest
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

object SecurityUtil {
    private val digest = MessageDigest.getInstance("SHA-256")
    private const val SECRET_KEY = "neon-speeder-super-secret-key-that-is-long-enough-for-security"

    fun hashPassword(password: String): String {
        val hashBytes = digest.digest(password.toByteArray(Charsets.UTF_8))
        return Base64.getEncoder().encodeToString(hashBytes)
    }

    fun generateToken(userId: Long): String {
        // Token expires in 24 hours
        val expiry = System.currentTimeMillis() + (1000L * 60 * 60 * 24)
        val message = "$userId:$expiry"
        val signature = signMessage(message)
        val fullToken = "$message:$signature"
        return Base64.getEncoder().encodeToString(fullToken.toByteArray(Charsets.UTF_8))
    }

    fun validateToken(token: String): Long? {
        return try {
            val decoded = String(Base64.getDecoder().decode(token), Charsets.UTF_8)
            val parts = decoded.split(":")
            if (parts.size != 3) return null
            val userId = parts[0].toLong()
            val expiry = parts[1].toLong()
            val signature = parts[2]

            // Check expiration
            if (System.currentTimeMillis() > expiry) return null

            // Validate signature
            val expectedSignature = signMessage("$userId:$expiry")
            if (signature == expectedSignature) {
                userId
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun signMessage(message: String): String {
        val hmac = Mac.getInstance("HmacSHA256")
        val secretKey = SecretKeySpec(SECRET_KEY.toByteArray(Charsets.UTF_8), "HmacSHA256")
        hmac.init(secretKey)
        val hashBytes = hmac.doFinal(message.toByteArray(Charsets.UTF_8))
        return Base64.getEncoder().encodeToString(hashBytes)
    }
}
