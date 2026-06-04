package com.leaderboard.controller

import com.leaderboard.model.Score
import com.leaderboard.repository.ScoreRepository
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

data class ScoreRequest(
    val username: String = "",
    val score: Int = 0
)

@RestController
@RequestMapping("/score")
@CrossOrigin(origins = ["*"])
class ScoreController(private val scoreRepository: ScoreRepository) {

    // Simple in-memory rate limiter (tracks last submission time per IP)
    private val lastSubmissionTimes = ConcurrentHashMap<String, Instant>()
    private val MIN_INTERVAL_SECONDS = 20

    @PostMapping
    fun submitScore(
        @RequestBody request: ScoreRequest,
        servletRequest: HttpServletRequest
    ): ResponseEntity<Any> {
        val ip = servletRequest.remoteAddr ?: "unknown"
        val now = Instant.now()

        // 1. Rate Limiting check
        val lastTime = lastSubmissionTimes[ip]
        if (lastTime != null && now.epochSecond - lastTime.epochSecond < MIN_INTERVAL_SECONDS) {
            val waitTime = MIN_INTERVAL_SECONDS - (now.epochSecond - lastTime.epochSecond)
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(
                mapOf("error" to "Rate limit exceeded. Please wait $waitTime seconds before submitting again.")
            )
        }

        // 2. Format validation
        val cleanedUsername = request.username.trim()
        if (cleanedUsername.length < 2 || cleanedUsername.length > 15) {
            return ResponseEntity.badRequest().body(
                mapOf("error" to "Username must be between 2 and 15 characters.")
            )
        }

        val usernameRegex = Regex("^[a-zA-Z0-9_]+$")
        if (!usernameRegex.matches(cleanedUsername)) {
            return ResponseEntity.badRequest().body(
                mapOf("error" to "Username can only contain alphanumeric characters and underscores.")
            )
        }

        if (request.score < 0) {
            return ResponseEntity.badRequest().body(
                mapOf("error" to "Score cannot be negative.")
            )
        }

        // 3. Anti-cheat physical limit validation
        // 30 seconds game, human physical tap limit is ~15 clicks/sec. Anything above 300 is blocked.
        if (request.score > 300) {
            return ResponseEntity.badRequest().body(
                mapOf("error" to "Submission rejected. Score exceeds the physical limit of the game.")
            )
        }

        // Log submission timestamp for rate limiting
        lastSubmissionTimes[ip] = now

        val savedScore = scoreRepository.save(
            Score(
                username = cleanedUsername,
                score = request.score,
                createdAt = now
            )
        )

        return ResponseEntity.ok(savedScore)
    }
}
