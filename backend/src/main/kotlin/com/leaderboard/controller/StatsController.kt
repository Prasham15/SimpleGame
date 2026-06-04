package com.leaderboard.controller

import com.leaderboard.repository.ScoreRepository
import com.leaderboard.repository.UserRepository
import com.leaderboard.security.SecurityUtil
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/stats")
@CrossOrigin(origins = ["*"])
class StatsController(
    private val scoreRepository: ScoreRepository,
    private val userRepository: UserRepository
) {

    @GetMapping
    fun getPersonalStats(
        @RequestHeader(value = "Authorization", required = false) authHeader: String?
    ): ResponseEntity<Any> {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                mapOf("error" to "Unauthorized. Missing token.")
            )
        }
        val token = authHeader.substring(7)
        val userId = SecurityUtil.validateToken(token)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                mapOf("error" to "Session expired. Please log in again.")
            )

        val user = userRepository.findById(userId).orElse(null)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                mapOf("error" to "User not found.")
            )

        val totalGames = scoreRepository.countByUserId(userId)
        if (totalGames == 0L) {
            return ResponseEntity.ok(mapOf(
                "username" to user.username,
                "bestScore" to 0,
                "totalGames" to 0,
                "averageScore" to 0.0,
                "rank" to "Unranked"
            ))
        }

        val bestScore = scoreRepository.findBestScoreByUserId(userId) ?: 0
        val averageScore = scoreRepository.findAverageScoreByUserId(userId) ?: 0.0
        val rank = scoreRepository.calculateRank(bestScore)

        return ResponseEntity.ok(mapOf(
            "username" to user.username,
            "bestScore" to bestScore,
            "totalGames" to totalGames,
            "averageScore" to Math.round(averageScore * 10.0) / 10.0,
            "rank" to "#$rank"
        ))
    }
}
