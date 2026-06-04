package com.leaderboard.controller

import com.leaderboard.model.Score
import com.leaderboard.repository.ScoreRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.Instant

data class ScoreRequest(
    val username: String = "",
    val score: Int = 0
)

@RestController
@RequestMapping("/score")
@CrossOrigin(origins = ["*"])
class ScoreController(private val scoreRepository: ScoreRepository) {

    @PostMapping
    fun submitScore(@RequestBody request: ScoreRequest): ResponseEntity<Any> {
        if (request.username.isBlank()) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Username cannot be blank."))
        }
        if (request.score < 0) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Score must be non-negative."))
        }

        val savedScore = scoreRepository.save(
            Score(
                username = request.username.trim(),
                score = request.score,
                createdAt = Instant.now()
            )
        )

        return ResponseEntity.ok(savedScore)
    }
}
