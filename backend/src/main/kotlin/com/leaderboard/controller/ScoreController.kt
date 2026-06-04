package com.leaderboard.controller

import com.leaderboard.model.Score
import com.leaderboard.repository.ScoreRepository
import com.leaderboard.repository.UserRepository
import com.leaderboard.security.SecurityUtil
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

data class ScoreSubmissionRequest(
    val score: Int = 0
)

@RestController
@RequestMapping("/score")
@CrossOrigin(origins = ["*"])
class ScoreController(
    private val scoreRepository: ScoreRepository,
    private val userRepository: UserRepository
) {

    private val lastSubmissionTimes = ConcurrentHashMap<String, Instant>()
    private val MIN_INTERVAL_SECONDS = 20

    @PostMapping
    fun submitScore(
        @RequestBody request: ScoreSubmissionRequest,
        @RequestHeader(value = "Authorization", required = false) authHeader: String?,
        servletRequest: HttpServletRequest
    ): ResponseEntity<Any> {
        val now = Instant.now()

        // 1. Authenticate user via bearer token
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                mapOf("error" to "Unauthorized. Missing or invalid authentication token.")
            )
        }
        val token = authHeader.substring(7)
        val userId = SecurityUtil.validateToken(token)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                mapOf("error" to "Session expired or invalid token. Please log in again.")
            )

        val user = userRepository.findById(userId).orElse(null)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                mapOf("error" to "User account not found.")
            )

        // 2. Rate Limiting (by user ID)
        val userKey = userId.toString()
        val lastTime = lastSubmissionTimes[userKey]
        if (lastTime != null && now.epochSecond - lastTime.epochSecond < MIN_INTERVAL_SECONDS) {
            val waitTime = MIN_INTERVAL_SECONDS - (now.epochSecond - lastTime.epochSecond)
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(
                mapOf("error" to "Rate limit exceeded. Please wait $waitTime seconds before submitting again.")
            )
        }

        // 3. Validation
        if (request.score < 0) {
            return ResponseEntity.badRequest().body(
                mapOf("error" to "Score cannot be negative.")
            )
        }

        // Anti-cheat limit (max 300 clicks in 30s)
        if (request.score > 300) {
            return ResponseEntity.badRequest().body(
                mapOf("error" to "Submission rejected. Score exceeds the physical limit.")
            )
        }

        // Update rate limiter time
        lastSubmissionTimes[userKey] = now

        val savedScore = scoreRepository.save(
            Score(
                user = user,
                score = request.score,
                createdAt = now
            )
        )

        return ResponseEntity.ok(mapOf(
            "id" to savedScore.id,
            "username" to user.username,
            "score" to savedScore.score,
            "createdAt" to savedScore.createdAt
        ))
    }
}
