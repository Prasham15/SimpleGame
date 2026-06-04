package com.leaderboard.repository

import com.leaderboard.model.Score
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ScoreRepository : JpaRepository<Score, Long> {
    fun findTop100ByOrderByScoreDescCreatedAtAsc(): List<Score>
}
