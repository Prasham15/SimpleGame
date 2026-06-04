package com.leaderboard.controller

import com.leaderboard.model.Score
import com.leaderboard.repository.ScoreRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.CrossOrigin
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/leaderboard")
@CrossOrigin(origins = ["*"])
class LeaderboardController(private val scoreRepository: ScoreRepository) {

    @GetMapping
    fun getLeaderboard(): ResponseEntity<List<Score>> {
        val top100 = scoreRepository.findTop100ByOrderByScoreDescCreatedAtAsc()
        return ResponseEntity.ok(top100)
    }
}
