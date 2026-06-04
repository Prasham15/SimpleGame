package com.leaderboard.controller

import com.leaderboard.repository.ScoreRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.CrossOrigin
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/leaderboard")
@CrossOrigin(origins = ["*"])
class LeaderboardController(private val scoreRepository: ScoreRepository) {

    @GetMapping
    fun getLeaderboard(
        @RequestParam(value = "game", defaultValue = "tap_speeder") game: String
    ): ResponseEntity<List<Map<String, Any>>> {
        val top100 = scoreRepository.findTop100ByGameOrderByScoreDescCreatedAtAsc(game)
        val mappedScores = top100.map { score ->
            mapOf(
                "id" to (score.id ?: 0L),
                "username" to (score.user?.username ?: "unknown"),
                "score" to score.score,
                "createdAt" to score.createdAt,
                "game" to score.game,
                "countryCode" to (score.user?.countryCode ?: "UN")
            )
        }
        return ResponseEntity.ok(mappedScores)
    }
}
