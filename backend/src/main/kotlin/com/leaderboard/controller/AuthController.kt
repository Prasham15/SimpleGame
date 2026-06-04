package com.leaderboard.controller

import com.leaderboard.model.User
import com.leaderboard.repository.UserRepository
import com.leaderboard.security.SecurityUtil
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

data class RegisterRequest(
    val username: String = "",
    val password: String = ""
)

data class LoginRequest(
    val username: String = "",
    val password: String = ""
)

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = ["*"])
class AuthController(private val userRepository: UserRepository) {

    @PostMapping("/register")
    fun register(
        @RequestBody request: RegisterRequest,
        servletRequest: HttpServletRequest
    ): ResponseEntity<Any> {
        val trimmedUsername = request.username.trim()
        if (trimmedUsername.length < 2 || trimmedUsername.length > 15) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Username must be between 2 and 15 characters."))
        }
        val usernameRegex = Regex("^[a-zA-Z0-9_]+$")
        if (!usernameRegex.matches(trimmedUsername)) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Username can only contain alphanumeric characters and underscores."))
        }
        if (request.password.length < 4) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Password must be at least 4 characters."))
        }

        if (userRepository.findByUsername(trimmedUsername) != null) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Username is already taken."))
        }

        val country = servletRequest.getHeader("CF-IPCountry") ?: "UN"

        val newUser = userRepository.save(
            User(
                username = trimmedUsername,
                passwordHash = SecurityUtil.hashPassword(request.password),
                countryCode = country
            )
        )

        return ResponseEntity.ok(mapOf(
            "message" to "Registration successful!",
            "userId" to newUser.id,
            "username" to newUser.username
        ))
    }

    @PostMapping("/login")
    fun login(@RequestBody request: LoginRequest): ResponseEntity<Any> {
        val user = userRepository.findByUsername(request.username.trim())
            ?: return ResponseEntity.badRequest().body(mapOf("error" to "Invalid username or password."))

        val inputHash = SecurityUtil.hashPassword(request.password)
        if (user.passwordHash != inputHash) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Invalid username or password."))
        }

        val token = SecurityUtil.generateToken(user.id!!)
        return ResponseEntity.ok(mapOf(
            "message" to "Login successful!",
            "token" to token,
            "username" to user.username
        ))
    }

    @PostMapping("/guest")
    fun registerGuest(servletRequest: HttpServletRequest): ResponseEntity<Any> {
        var guestUsername: String
        var attempts = 0
        do {
            val randomNum = (100000..999999).random()
            guestUsername = "Guest$randomNum"
            attempts++
        } while (userRepository.findByUsername(guestUsername) != null && attempts < 10)

        val country = servletRequest.getHeader("CF-IPCountry") ?: "UN"

        val guestUser = userRepository.save(
            User(
                username = guestUsername,
                passwordHash = SecurityUtil.hashPassword(UUID.randomUUID().toString()),
                countryCode = country
            )
        )

        val token = SecurityUtil.generateToken(guestUser.id!!)
        return ResponseEntity.ok(mapOf(
            "message" to "Guest session created successfully!",
            "token" to token,
            "username" to guestUser.username,
            "countryCode" to guestUser.countryCode
        ))
    }
}
