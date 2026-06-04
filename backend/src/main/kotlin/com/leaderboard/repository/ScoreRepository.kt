package com.leaderboard.repository

import com.leaderboard.model.Score
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface ScoreRepository : JpaRepository<Score, Long> {
    
    fun findTop100ByGameOrderByScoreDescCreatedAtAsc(game: String): List<Score>

    fun findByUserIdAndGame(userId: Long, game: String): Score?

    @Query(
        value = """
            SELECT COUNT(*) + 1 
            FROM scores 
            WHERE game = :game AND score > :userMaxScore
        """,
        nativeQuery = true
    )
    fun calculateRank(userMaxScore: Int, game: String): Long
}
