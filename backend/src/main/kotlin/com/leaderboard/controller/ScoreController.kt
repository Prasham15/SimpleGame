package com.leaderboard.controller

import com.leaderboard.model.Score
import com.leaderboard.model.UserGameStats
import com.leaderboard.repository.ScoreRepository
import com.leaderboard.repository.UserRepository
import com.leaderboard.repository.UserGameStatsRepository
import com.leaderboard.security.SecurityUtil
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

data class ScoreSubmissionRequest(
    val score: Int = 0,
    val game: String = "tap_speeder"
)

@RestController
@RequestMapping("/score")
@CrossOrigin(origins = ["*"])
class ScoreController(
    private val scoreRepository: ScoreRepository,
    private val userRepository: UserRepository,
    private val userGameStatsRepository: UserGameStatsRepository
) {

    // Rate limiter tracker by combination of userKey and game
    private val lastSubmissionTimes = ConcurrentHashMap<String, Instant>()
    private val MIN_INTERVAL_SECONDS = 15 // reduced slightly to 15s to be more lenient for multiple quick game runs

    @PostMapping
    fun submitScore(
        @RequestBody request: ScoreSubmissionRequest,
        @RequestHeader(value = "Authorization", required = false) authHeader: String?,
        servletRequest: HttpServletRequest
    ): ResponseEntity<Any> {
        val now = Instant.now()
        val game = if (request.game.isNullOrEmpty()) "tap_speeder" else request.game

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

        // 2. Rate Limiting (by combination of user ID and game)
        val rateLimitKey = "$userId:$game"
        val lastTime = lastSubmissionTimes[rateLimitKey]
        if (lastTime != null && now.epochSecond - lastTime.epochSecond < MIN_INTERVAL_SECONDS) {
            val waitTime = MIN_INTERVAL_SECONDS - (now.epochSecond - lastTime.epochSecond)
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(
                mapOf("error" to "Rate limit exceeded for $game. Please wait $waitTime seconds before submitting again.")
            )
        }

        // 3. Validation
        if (request.score < 0) {
            return ResponseEntity.badRequest().body(
                mapOf("error" to "Score cannot be negative.")
            )
        }

        // Anti-cheat limits based on game type
        val maxLimit = if (game == "tap_speeder") 300 else 1000
        if (request.score > maxLimit) {
            return ResponseEntity.badRequest().body(
                mapOf("error" to "Submission rejected. Score exceeds the physical limit for $game.")
            )
        }

        // Update rate limiter time
        lastSubmissionTimes[rateLimitKey] = now

        // 4. Update play counts inside UserGameStats
        val stats = userGameStatsRepository.findByUserIdAndGame(userId, game)
            ?: UserGameStats(user = user, game = game, gamesPlayed = 0, totalScoreSum = 0L)
        stats.gamesPlayed += 1
        stats.totalScoreSum += request.score
        userGameStatsRepository.save(stats)

        // 5. Update score row (only keep user's highest score)
        var existingScore = scoreRepository.findByUserIdAndGame(userId, game)
        val finalScore: Score

        if (existingScore == null) {
            // First time submitting a score for this game
            finalScore = scoreRepository.save(
                Score(
                    user = user,
                    game = game,
                    score = request.score,
                    createdAt = now
                )
            )
        } else {
            // Update only if new score is higher
            if (request.score > existingScore.score) {
                existingScore.score = request.score
                existingScore.createdAt = now
                finalScore = scoreRepository.save(existingScore)
            } else {
                finalScore = existingScore
            }
        }

        return ResponseEntity.ok(mapOf(
            "id" to finalScore.id,
            "username" to user.username,
            "score" to finalScore.score,
            "createdAt" to finalScore.createdAt,
            "game" to finalScore.game,
            "updated" to (request.score >= finalScore.score)
        ))
    }
}
